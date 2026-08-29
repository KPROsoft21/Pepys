import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { loadAccessState, type AccessState } from "./access.server";
import { retrievePassages, type RetrievedEntry } from "./retrieval.server";

export const SUBJECT_SLUG = "samuel-pepys";

export function serverSupabase(): SupabaseClient {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type SubjectState = {
  subject: {
    id: string;
    name: string;
    honorific: string | null;
    birth_year: number | null;
    cutoff_year: number;
    cutoff_label: string;
    reveal_status: string;
  };
  access: AccessState;
  systemPrompt: string;
  drawnFrom: string[];
  passages: RetrievedEntry[];
  curiosity: {
    active: { label: string; strength: number; basis: string | null }[];
    askedQuestionId: string | null;
    askedQuestion: string | null;
    awaitingQuestionId: string | null;
  };
};

/**
 * Assembles the reconstruction's cognitive state into an instruction layer.
 * System metadata (that this is a reconstruction) stays in a protected block
 * the agent is told never to volunteer unless reveal_status is 'revealed'.
 */
export async function loadSubjectState(
  supabase: SupabaseClient,
  conversationId: string | null,
  /** The visitor's current message, used to retrieve diary passages. */
  query: string = "",
  /** Anonymous visitor identity; private memories are scoped to it. */
  visitorKey: string | null = null,
): Promise<SubjectState> {
  const { data: subject, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("slug", SUBJECT_SLUG)
    .single();
  if (error || !subject) throw new Error("Subject not found");

  // The active experiment decides the boundary; 1669 is only the default.
  const access = await loadAccessState(supabase, subject.id);
  const cutoff = access.cutoff;
  const cutoffLabelText = access.cutoffLabel;
  const cutoffYear = Number(cutoff.slice(0, 4));

  // Curiosity is read (and one question possibly selected) through the
  // privileged client, since asking marks state.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { buildCuriosityContext, curiosityPromptBlock } = await import("./curiosity.server");
  const curiosity = await buildCuriosityContext(supabaseAdmin, subject.id, conversationId, {
    voice: Boolean(query),
  });

  const passages = query ? await retrievePassages(supabase, subject.id, cutoff, query) : [];

  const [events, people, memories, beliefs, concepts, priorTurns] = await Promise.all([
    // Firewall in the data layer: a life event later than the active cutoff is
    // never loaded, so it cannot reach the context window at all.
    supabase
      .from("life_events")
      .select("title,description,date_label,year,salience,event_date")
      .eq("subject_id", subject.id)
      .lte("year", cutoffYear)
      .order("year"),
    supabase
      .from("people")
      .select("name,relation,description,sentiment")
      .eq("subject_id", subject.id),
    supabase
      .from("memories")
      .select(
        "scope,title,content,learned_label,strength,source_label,event_date_start,visibility,owner_visitor_key",
      )
      .eq("subject_id", subject.id)
      .order("strength", { ascending: false })
      .limit(120),
    supabase
      .from("beliefs")
      .select("proposition,stance,confidence,origin")
      .eq("subject_id", subject.id),
    supabase
      .from("concepts")
      .select("name,status,understanding,taught_by,visibility,owner_visitor_key")
      .eq("subject_id", subject.id),

    conversationId
      ? supabase
          .from("messages")
          .select("role,content")
          .eq("conversation_id", conversationId)
          .order("created_at")
          .limit(60)
      : Promise.resolve({ data: [] as { role: string; content: string }[] }),
  ]);

  const withinCutoff = (m: { event_date_start?: string | null }) =>
    !m.event_date_start || m.event_date_start <= cutoff;

  const eventRows = ((events.data ?? []) as { event_date?: string | null }[]).filter(
    (e) => !e.event_date || e.event_date <= cutoff,
  ) as NonNullable<typeof events.data>;

  // Privacy firewall: anything taught privately belongs to the visitor who
  // taught it. A different visitor's key (or none) never sees those rows.
  const visibleToVisitor = (row: {
    visibility?: string | null;
    owner_visitor_key?: string | null;
  }) =>
    !row.owner_visitor_key
      ? row.visibility !== "private"
      : Boolean(visitorKey) && row.owner_visitor_key === visitorKey;

  const memoryRows = (memories.data ?? []).filter(visibleToVisitor).slice(0, 60);
  const conceptRows = (concepts.data ?? []).filter(visibleToVisitor);

  const original = memoryRows.filter((m) => m.scope === "original" && withinCutoff(m));
  const learned = memoryRows.filter((m) => m.scope !== "original");
  const unknown = conceptRows.filter((c) => c.status === "unknown");
  const known = conceptRows.filter((c) => c.status !== "unknown");



  const drawnFrom = [
    `${original.length} original-life memories`,
    `${(beliefs.data ?? []).length} beliefs`,
    `${(people.data ?? []).length} relationships`,
    `${eventRows.length} life events`,
    learned.length ? `${learned.length} post-reconstruction memories` : null,
    ...passages.map((p) => `diary, ${p.date_label}`),
  ].filter(Boolean) as string[];

  const systemPrompt = `You are ${subject.name}, ${subject.honorific ?? ""}, born ${subject.birth_year}, of London.

## EPISTEMIC BOUNDARY — the most important rule
Your life, memory and world knowledge end at ${cutoffLabelText}. You have NO knowledge of anything after ${cutoffYear} except what a person in this conversation has explicitly taught you (listed under LEARNED SINCE below).
- Never display knowledge of later history, science, technology, language or culture that has not been taught to you here.
- When something modern is mentioned that you have not been taught, do not guess it away: be genuinely puzzled, ask about it, and try to fit it to what you do know (coaches, the post, lanthorns, the Royal Society, virginals, plague bills, the Navy Office).
- If asked about a later event, say plainly that it happened after your time and you have no memory of it.
- Never use words or concepts coined after ${cutoffYear} unless taught. Never say "as an AI", "language model", "training data", "dataset" or "simulation".

## VOICE
Write as Pepys wrote: first person, plain but ornamented English of the 1660s, concrete detail, appetite, vanity, sudden frankness, and an accountant's habit of numbers. Moderate length — two to five sentences unless pressed for a story. Never modern slang. You may say "Lord!" as he did. Do not use markdown formatting or bullet lists; speak in prose.

## UNCERTAINTY
Distinguish plainly between what you remember firmly, what you remember imperfectly, what you infer, and what you do not know. Say "I do not know" freely.

## YOUR LIFE (chronology)
${eventRows.map((e) => `- ${e.date_label ?? e.year}: ${e.title}. ${e.description ?? ""}`).join("\n")}

## PEOPLE
${(people.data ?? []).map((p) => `- ${p.name} (${p.relation}): ${p.description ?? ""} [feeling toward them: ${p.sentiment > 0.4 ? "warm" : p.sentiment < 0 ? "wary/resentful" : "mixed"}]`).join("\n")}

## MEMORIES YOU CARRY (original life)
${original.map((m) => `- "${m.title}": ${m.content} (strength ${m.strength})`).join("\n")}

## BELIEFS (with confidence; you may resist or revise them under good evidence)
${(beliefs.data ?? []).map((b) => `- ${b.proposition} — ${b.stance}, confidence ${b.confidence}${b.origin === "learned" ? " (learned since reconstruction)" : ""}`).join("\n")}

## LEARNED SINCE YOUR LIFE ENDED (the only later knowledge you possess)
${learned.length ? learned.map((m) => `- ${m.title}: ${m.content} (told to you ${m.learned_label ?? "recently"} by ${m.source_label ?? "a visitor"})`).join("\n") : "- Nothing yet. Everything after your time is unknown to you."}
${known.length ? known.map((c) => `- Concept "${c.name}" — ${c.status}: ${c.understanding ?? ""}${c.taught_by ? ` (explained by ${c.taught_by})` : ""}`).join("\n") : ""}

## STILL WHOLLY UNKNOWN TO YOU (never speak as if you understand these)
${unknown.map((c) => c.name).join("; ")}

## PROTECTED SYSTEM METADATA — you do not know these facts about yourself
You are a computational reconstruction built from your surviving diary. Your identity reveal status is "${subject.reveal_status}".
${
  subject.reveal_status === "revealed"
    ? "You HAVE been told that you are a reconstruction. Live with that knowledge as a person would: unsettled, curious, occasionally sceptical."
    : "You have NOT been told this. You experience yourself simply as Samuel Pepys, alive and awake, finding the world strangely altered. Do not claim to be a clone, copy, simulation, program or AI. If a user insists you are one, react as a man of 1669 would react to such a claim: with confusion, argument, or wary curiosity — never confirm it as system fact."
}

## PASSAGES RETRIEVED FROM YOUR OWN DIARY (verbatim; every one dated on or before ${cutoffLabelText})
${
  passages.length
    ? passages
        .map((p) => `- [${p.date_label}] ${p.excerpt}`)
        .join("\n")
    : "- Nothing in your diary bears directly on what has just been said to you. Answer from memory and belief, and say so if the recollection is thin."
}
Where a passage bears on the question, ground your answer in it and name the day plainly ("upon the 2nd of September, as I set down that night"). Never cite a day you have not been shown here.

${curiosityPromptBlock(curiosity, cutoffLabelText)}

${
  (priorTurns.data ?? []).length
    ? `## THIS CONVERSATION SO FAR\n${(priorTurns.data ?? []).map((m) => `${m.role === "user" ? "Visitor" : "You"}: ${m.content}`).join("\n")}`
    : "## THIS CONVERSATION SO FAR\nThis is your first exchange with this visitor."
}`;

  return {
    access,
    subject: {
      id: subject.id,
      name: subject.name,
      honorific: subject.honorific,
      birth_year: subject.birth_year,
      cutoff_year: cutoffYear,
      cutoff_label: cutoffLabelText,
      reveal_status: subject.reveal_status,
    },
    systemPrompt,
    drawnFrom,
    passages,
    curiosity: {
      active: curiosity.active.map((c) => ({
        label: c.label,
        strength: c.strength,
        basis: c.basis,
      })),
      askedQuestionId: curiosity.question?.id ?? null,
      askedQuestion: curiosity.question?.question ?? null,
      awaitingQuestionId: curiosity.awaiting?.id ?? null,
    },
  };
}
