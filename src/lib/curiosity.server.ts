import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The curiosity engine.
 *
 * Curiosity is state, not a prompt instruction. Gaps detected in an exchange
 * are scored in code against an interest profile derived from Pepys's own
 * evidence (his diary-derived memories, his offices, the people around him),
 * persisted in `curiosity_states`, and turned into concrete questions in
 * `curiosity_questions`. The language model is only ever told which question
 * the state selected — it never decides what he is curious about.
 */

const STOPWORDS = new Set([
  "about","after","again","against","all","also","and","any","are","because","been","before","being",
  "between","but","came","can","come","could","did","does","doing","done","down","each","even","ever",
  "every","for","from","gave","give","goes","going","had","has","have","having","her","here","him",
  "his","how","into","its","just","like","little","made","make","many","may","might","more","most",
  "much","must","never","not","nothing","now","one","only","other","our","out","over","own","said",
  "same","says","see","seen","she","should","since","some","such","take","tell","than","that","the",
  "their","them","then","there","these","they","thing","things","this","those","though","through",
  "thus","till","time","together","told","too","took","two","under","until","upon","use","very","was",
  "way","well","went","were","what","when","where","which","while","who","whom","why","will","with",
  "without","would","you","your","day","home","great","good","night","morning","mighty","thence",
]);

export type Gap = {
  target_label: string;
  target_type: string;
  unexplained: string;
  knowledge_gap: number;
  novelty: number;
  surprise: number;
  emotional_salience: number;
  goal_relevance: number;
  contradiction_strength: number;
  uncertainty: number;
  questions: {
    question: string;
    gap_addressed: string;
    grounded_in: string;
    expected_information_gain: number;
  }[];
};

export type ActiveCuriosity = {
  id: string;
  label: string;
  strength: number;
  basis: string | null;
  resolved: boolean;
};

export type SelectedQuestion = {
  id: string;
  question: string;
  curiosityId: string;
  label: string;
  strength: number;
};

/** Threshold below which a curiosity stays internal rather than being voiced. */
const ASK_THRESHOLD = 0.42;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z']+/)
    .map((word) => word.replace(/^'+|'+$/g, ""))
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
}

export type InterestProfile = {
  weights: Map<string, number>;
  top: { term: string; weight: number }[];
  evidenceCount: number;
};

/**
 * What Pepys cares about, derived from his own record rather than a hard-coded
 * personality list: the vocabulary that recurs across his memories, offices and
 * relationships, weighted by frequency.
 */
export async function deriveInterestProfile(
  supabase: SupabaseClient,
  subjectId: string,
): Promise<InterestProfile> {
  const [memories, events, people, diary] = await Promise.all([
    supabase
      .from("memories")
      .select("title,content,importance,strength")
      .eq("subject_id", subjectId)
      .eq("scope", "original")
      .limit(120),
    supabase.from("life_events").select("title,description,salience").eq("subject_id", subjectId),
    supabase.from("people").select("name,relation,description").eq("subject_id", subjectId),
    supabase
      .from("diary_entries")
      .select("original_text")
      .eq("subject_id", subjectId)
      .order("entry_date", { ascending: false })
      .limit(60),
  ]);

  const counts = new Map<string, number>();
  const add = (text: string | null | undefined, weight: number) => {
    if (!text) return;
    for (const term of tokens(text)) counts.set(term, (counts.get(term) ?? 0) + weight);
  };

  for (const m of memories.data ?? []) {
    const weight = 1 + Number(m.importance ?? m.strength ?? 0.5);
    add(m.title, weight * 1.5);
    add(m.content, weight);
  }
  for (const e of events.data ?? []) {
    add(e.title, 1.5 + Number(e.salience ?? 0.5));
    add(e.description, 1);
  }
  for (const p of people.data ?? []) {
    add(p.name, 2);
    add(p.relation, 1.5);
    add(p.description, 0.8);
  }
  for (const d of diary.data ?? []) add(String(d.original_text ?? "").slice(0, 4000), 0.25);

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const max = ranked[0]?.[1] ?? 1;
  const weights = new Map<string, number>();
  for (const [term, count] of ranked.slice(0, 400)) weights.set(term, count / max);

  return {
    weights,
    top: ranked.slice(0, 24).map(([term, count]) => ({ term, weight: count / max })),
    evidenceCount:
      (memories.data?.length ?? 0) + (events.data?.length ?? 0) + (people.data?.length ?? 0),
  };
}

/** How much a gap touches ground Pepys himself wrote about. */
export function personalRelevance(
  profile: InterestProfile,
  text: string,
): { score: number; basis: string | null } {
  const hits: { term: string; weight: number }[] = [];
  for (const term of new Set(tokens(text))) {
    const weight = profile.weights.get(term);
    if (weight) hits.push({ term, weight });
  }
  if (!hits.length) return { score: 0.12, basis: null };
  hits.sort((a, b) => b.weight - a.weight);
  const score = clamp(hits.slice(0, 4).reduce((sum, h) => sum + h.weight, 0) / 2 + 0.1);
  return {
    score,
    basis: `his own record dwells on ${hits
      .slice(0, 3)
      .map((h) => h.term)
      .join(", ")}`,
  };
}

export function curiosityStrength(input: {
  knowledge_gap: number;
  novelty: number;
  personal_relevance: number;
  surprise: number;
  emotional_salience: number;
  goal_relevance: number;
  contradiction_strength: number;
}): number {
  return clamp(
    0.3 * clamp(input.knowledge_gap) +
      0.18 * clamp(input.novelty) +
      0.16 * clamp(input.personal_relevance) +
      0.12 * clamp(input.surprise) +
      0.1 * clamp(input.emotional_salience) +
      0.08 * clamp(input.goal_relevance) +
      0.06 * clamp(input.contradiction_strength),
  );
}

/** Curiosity fades if it is never explored; decay affects ranking only. */
export function decayed(strength: number, decayRate: number, updatedAt: string | null): number {
  if (!updatedAt) return clamp(strength);
  const days = (Date.now() - new Date(updatedAt).getTime()) / 86_400_000;
  if (!(days > 0)) return clamp(strength);
  return clamp(strength * Math.exp(-clamp(decayRate, 0, 1) * days));
}

/**
 * Records the gaps an exchange opened, scoring each against the interest
 * profile and storing the candidate questions it produced.
 */
export async function registerCuriosity(
  admin: SupabaseClient,
  input: {
    subjectId: string;
    conversationId: string | null;
    gaps: Gap[];
    parentQuestionId?: string | null;
    parentDepth?: number;
  },
): Promise<{ opened: string[] }> {
  if (!input.gaps.length) return { opened: [] };
  const profile = await deriveInterestProfile(admin, input.subjectId);
  const opened: string[] = [];

  for (const gap of input.gaps) {
    const label = gap.target_label?.trim();
    if (!label) continue;
    const relevance = personalRelevance(profile, `${label} ${gap.unexplained ?? ""}`);
    const strength = curiosityStrength({ ...gap, personal_relevance: relevance.score });

    const { data: existing } = await admin
      .from("curiosity_states")
      .select("id,curiosity_strength,questions_generated,exploration_count")
      .eq("subject_id", input.subjectId)
      .ilike("target_label", label)
      .maybeSingle();

    let curiosityId = existing?.id as string | undefined;
    const row = {
      subject_id: input.subjectId,
      target_type: gap.target_type || "concept",
      target_label: label,
      novelty: clamp(gap.novelty),
      surprise: clamp(gap.surprise),
      personal_relevance: relevance.score,
      emotional_salience: clamp(gap.emotional_salience),
      knowledge_gap: clamp(gap.knowledge_gap),
      uncertainty: clamp(gap.uncertainty),
      contradiction_strength: clamp(gap.contradiction_strength),
      goal_relevance: clamp(gap.goal_relevance),
      curiosity_strength: strength,
      relevance_basis: relevance.basis,
      resolved: strength < 0.15,
      updated_at: new Date().toISOString(),
    };

    if (curiosityId) {
      await admin
        .from("curiosity_states")
        .update({
          ...row,
          curiosity_strength: Math.max(strength, Number(existing?.curiosity_strength ?? 0) * 0.7),
          exploration_count: Number(existing?.exploration_count ?? 0) + 1,
        })
        .eq("id", curiosityId);
    } else {
      const { data: inserted } = await admin
        .from("curiosity_states")
        .insert(row)
        .select("id")
        .single();
      curiosityId = inserted?.id;
      if (curiosityId) {
        opened.push(`Curiosity opened: "${label}" (strength ${strength.toFixed(2)})`);
        await admin.from("learning_log").insert({
          subject_id: input.subjectId,
          conversation_id: input.conversationId,
          kind: "curiosity",
          summary: `Became curious about ${label}`,
          state_before: "no curiosity recorded",
          state_after: `${gap.unexplained ?? "unexplained"} — ${relevance.basis ?? "no personal footing"}`,
          confidence: strength,
        });
      }
    }

    if (!curiosityId) continue;

    const questions = (gap.questions ?? []).filter((q) => q.question?.trim());
    if (!questions.length) continue;

    const scored = questions
      .map((q) => ({
        question: q.question.trim(),
        gap_addressed: q.gap_addressed,
        grounded_in: q.grounded_in,
        expected_information_gain: clamp(q.expected_information_gain),
        score:
          clamp(q.expected_information_gain) * 0.5 +
          relevance.score * 0.3 +
          clamp(gap.novelty) * 0.2,
      }))
      .sort((a, b) => b.score - a.score);

    await admin.from("curiosity_questions").insert(
      scored.map((q, index) => ({
        curiosity_id: curiosityId,
        subject_id: input.subjectId,
        conversation_id: input.conversationId,
        question: q.question,
        gap_addressed: q.gap_addressed,
        grounded_in: q.grounded_in,
        expected_information_gain: q.expected_information_gain,
        rank: index + 1,
        parent_question_id: input.parentQuestionId ?? null,
        depth: (input.parentDepth ?? 0) + 1,
      })),
    );

    await admin
      .from("curiosity_states")
      .update({
        questions_generated:
          Number(existing?.questions_generated ?? 0) + scored.length,
      })
      .eq("id", curiosityId);
  }

  return { opened };
}

/** Marks a voiced question answered and links whatever memory the answer formed. */
export async function recordAnswer(
  admin: SupabaseClient,
  input: {
    subjectId: string;
    questionId: string;
    answer: string;
    memoryId?: string | null;
    conversationId: string | null;
  },
) {
  const { data: question } = await admin
    .from("curiosity_questions")
    .select("id,question,curiosity_id")
    .eq("id", input.questionId)
    .maybeSingle();
  if (!question) return null;

  await admin
    .from("curiosity_questions")
    .update({
      answered: true,
      answer: input.answer.slice(0, 4000),
      answered_at: new Date().toISOString(),
      resulting_memory_id: input.memoryId ?? null,
    })
    .eq("id", question.id);

  const { data: state } = await admin
    .from("curiosity_states")
    .select("id,curiosity_strength,questions_answered,exploration_count")
    .eq("id", question.curiosity_id)
    .maybeSingle();

  if (state) {
    await admin
      .from("curiosity_states")
      .update({
        questions_answered: Number(state.questions_answered ?? 0) + 1,
        exploration_count: Number(state.exploration_count ?? 0) + 1,
        last_explored: new Date().toISOString(),
        curiosity_strength: clamp(Number(state.curiosity_strength ?? 0) * 0.55),
        resolved: clamp(Number(state.curiosity_strength ?? 0) * 0.55) < 0.15,
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.id);
  }

  if (input.memoryId) {
    // Information he sought himself matters more to him than information handed over.
    const { data: memory } = await admin
      .from("memories")
      .select("id,importance,strength")
      .eq("id", input.memoryId)
      .maybeSingle();
    if (memory) {
      await admin
        .from("memories")
        .update({
          sought_via_question_id: question.id,
          importance: clamp(Number(memory.importance ?? 0.5) + 0.2, 0, 0.99),
          strength: clamp(Number(memory.strength ?? 0.5) + 0.1, 0, 0.99),
        })
        .eq("id", memory.id);
    }
  }

  await admin.from("learning_log").insert({
    subject_id: input.subjectId,
    conversation_id: input.conversationId,
    kind: "curiosity",
    summary: `His question was answered: “${question.question}”`,
    state_before: "asked, unanswered",
    state_after: input.answer.slice(0, 400),
  });

  return question;
}

export type CuriosityContext = {
  active: ActiveCuriosity[];
  question: SelectedQuestion | null;
  awaiting: { id: string; question: string } | null;
  interests: string[];
};

/**
 * Builds the curiosity slice of the response context and, when the budget
 * allows, selects exactly one question to voice this turn (marking it asked).
 */
export async function buildCuriosityContext(
  supabase: SupabaseClient,
  subjectId: string,
  conversationId: string | null,
  options: { voice?: boolean } = {},
): Promise<CuriosityContext> {
  const [{ data: states }, { data: pending }, { data: awaiting }] = await Promise.all([
    supabase
      .from("curiosity_states")
      .select("id,target_label,curiosity_strength,decay_rate,relevance_basis,resolved,updated_at")
      .eq("subject_id", subjectId)
      .eq("resolved", false)
      .order("curiosity_strength", { ascending: false })
      .limit(20),
    supabase
      .from("curiosity_questions")
      .select("id,question,curiosity_id,rank,expected_information_gain")
      .eq("subject_id", subjectId)
      .eq("asked", false)
      .order("expected_information_gain", { ascending: false })
      .limit(20),
    conversationId
      ? supabase
          .from("curiosity_questions")
          .select("id,question")
          .eq("conversation_id", conversationId)
          .eq("asked", true)
          .eq("answered", false)
          .order("asked_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as { id: string; question: string }[] }),
  ]);

  const active: ActiveCuriosity[] = (states ?? [])
    .map((s) => ({
      id: s.id as string,
      label: s.target_label as string,
      strength: decayed(
        Number(s.curiosity_strength ?? 0),
        Number(s.decay_rate ?? 0.02),
        s.updated_at as string | null,
      ),
      basis: (s.relevance_basis as string | null) ?? null,
      resolved: Boolean(s.resolved),
    }))
    .sort((a, b) => b.strength - a.strength);

  const strengthById = new Map(active.map((a) => [a.id, a]));
  const unanswered = (awaiting ?? [])[0] ?? null;

  let question: SelectedQuestion | null = null;
  // Conversational budget: one question per turn at most, and never a second
  // while the last one he asked still hangs unanswered.
  if (options.voice && !unanswered) {
    for (const candidate of pending ?? []) {
      const state = strengthById.get(candidate.curiosity_id as string);
      if (!state || state.strength < ASK_THRESHOLD) continue;
      question = {
        id: candidate.id as string,
        question: candidate.question as string,
        curiosityId: candidate.curiosity_id as string,
        label: state.label,
        strength: state.strength,
      };
      break;
    }
    if (question) {
      await supabase
        .from("curiosity_questions")
        .update({ asked: true, asked_at: new Date().toISOString(), conversation_id: conversationId })
        .eq("id", question.id);
      await supabase
        .from("curiosity_states")
        .update({ last_explored: new Date().toISOString() })
        .eq("id", question.curiosityId);
    }
  }

  return {
    active: active.slice(0, 8),
    question,
    awaiting: unanswered,
    interests: [],
  };
}

export function curiosityPromptBlock(context: CuriosityContext, cutoffLabel: string): string {
  const lines: string[] = [];
  lines.push("## CURIOSITY (your own state, not a manner of speaking)");
  if (context.active.length) {
    lines.push(
      "These are the matters presently working on you, strongest first, with why each has purchase on you:",
    );
    for (const item of context.active) {
      lines.push(
        `- ${item.label} — appetite ${item.strength.toFixed(2)}${item.basis ? `; ${item.basis}` : ""}`,
      );
    }
  } else {
    lines.push("Nothing is presently gnawing at you.");
  }
  if (context.awaiting) {
    lines.push(
      `You have already asked, and have not yet been answered: “${context.awaiting.question}”. Do not ask a fresh question this turn; press gently for that one if it fits, or let it lie.`,
    );
  } else if (context.question) {
    lines.push(
      `ASK THIS, once, in your own words and in your own voice, arising naturally from what you have just been told: “${context.question.question}”. Do not ask any other question this turn.`,
    );
  } else {
    lines.push(
      `You have no question strong enough to voice. Do NOT manufacture one — no "tell me more", no "how does it work". Answer, wonder aloud if you like, and let the visitor lead. Everything after ${cutoffLabel} remains dark unless it is taught to you.`,
    );
  }
  return lines.join("\n");
}
