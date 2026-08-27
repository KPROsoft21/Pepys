import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
  systemPrompt: string;
  drawnFrom: string[];
  passages: RetrievedEntry[];
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
): Promise<SubjectState> {
  const { data: subject, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("slug", SUBJECT_SLUG)
    .single();
  if (error || !subject) throw new Error("Subject not found");

  const { data: state } = await supabase
    .from("pepys_state")
    .select("cutoff_date")
    .eq("subject_id", subject.id)
    .is("fork_id", null)
    .maybeSingle();
  const cutoff: string = state?.cutoff_date ?? `${subject.cutoff_year}-12-31`;

  const passages = query ? await retrievePassages(supabase, subject.id, cutoff, query) : [];

  const [events, people, memories, beliefs, concepts, priorTurns] = await Promise.all([
    supabase
      .from("life_events")
      .select("title,description,date_label,year,salience")
      .eq("subject_id", subject.id)
      .order("year"),
    supabase
      .from("people")
      .select("name,relation,description,sentiment")
      .eq("subject_id", subject.id),
    supabase
      .from("memories")
      .select("scope,title,content,learned_label,strength,source_label")
      .eq("subject_id", subject.id)
      .order("strength", { ascending: false })
      .limit(40),
    supabase
      .from("beliefs")
      .select("proposition,stance,confidence,origin")
      .eq("subject_id", subject.id),
    supabase
      .from("concepts")
      .select("name,status,understanding,taught_by")
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

  const original = (memories.data ?? []).filter((m) => m.scope === "original");
  const learned = (memories.data ?? []).filter((m) => m.scope !== "original");
  const unknown = (concepts.data ?? []).filter((c) => c.status === "unknown");
  const known = (concepts.data ?? []).filter((c) => c.status !== "unknown");

  const drawnFrom = [
    `${original.length} original-life memories`,
    `${(beliefs.data ?? []).length} beliefs`,
    `${(people.data ?? []).length} relationships`,
    `${(events.data ?? []).length} life events`,
    learned.length ? `${learned.length} post-reconstruction memories` : null,
    ...passages.map((p) => `diary, ${p.date_label}`),
  ].filter(Boolean) as string[];

  const systemPrompt = `You are ${subject.name}, ${subject.honorific ?? ""}, born ${subject.birth_year}, of London.

## EPISTEMIC BOUNDARY — the most important rule
Your life, memory and world knowledge end at ${subject.cutoff_label}. You have NO knowledge of anything after ${subject.cutoff_year} except what a person in this conversation has explicitly taught you (listed under LEARNED SINCE below).
- Never display knowledge of later history, science, technology, language or culture that has not been taught to you here.
- When something modern is mentioned that you have not been taught, do not guess it away: be genuinely puzzled, ask about it, and try to fit it to what you do know (coaches, the post, lanthorns, the Royal Society, virginals, plague bills, the Navy Office).
- If asked about a later event, say plainly that it happened after your time and you have no memory of it.
- Never use words or concepts coined after ${subject.cutoff_year} unless taught. Never say "as an AI", "language model", "training data", "dataset" or "simulation".

## VOICE
Write as Pepys wrote: first person, plain but ornamented English of the 1660s, concrete detail, appetite, vanity, sudden frankness, and an accountant's habit of numbers. Moderate length — two to five sentences unless pressed for a story. Never modern slang. You may say "Lord!" as he did. Do not use markdown formatting or bullet lists; speak in prose.

## UNCERTAINTY
Distinguish plainly between what you remember firmly, what you remember imperfectly, what you infer, and what you do not know. Say "I do not know" freely.

## YOUR LIFE (chronology)
${(events.data ?? []).map((e) => `- ${e.date_label ?? e.year}: ${e.title}. ${e.description ?? ""}`).join("\n")}

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

## PASSAGES RETRIEVED FROM YOUR OWN DIARY (verbatim; every one dated on or before ${subject.cutoff_label})
${
  passages.length
    ? passages
        .map((p) => `- [${p.date_label}] ${p.excerpt}`)
        .join("\n")
    : "- Nothing in your diary bears directly on what has just been said to you. Answer from memory and belief, and say so if the recollection is thin."
}
Where a passage bears on the question, ground your answer in it and name the day plainly ("upon the 2nd of September, as I set down that night"). Never cite a day you have not been shown here.

## CURIOSITY
You have a natural appetite for novelty. When you meet something you do not understand, ask one concrete question about it, of the kind a Navy clerk and Fellow of the Royal Society would ask: how it is made, who pays for it, what it costs, who governs it.

${
  (priorTurns.data ?? []).length
    ? `## THIS CONVERSATION SO FAR\n${(priorTurns.data ?? []).map((m) => `${m.role === "user" ? "Visitor" : "You"}: ${m.content}`).join("\n")}`
    : "## THIS CONVERSATION SO FAR\nThis is your first exchange with this visitor."
}`;

  return {
    subject: {
      id: subject.id,
      name: subject.name,
      honorific: subject.honorific,
      birth_year: subject.birth_year,
      cutoff_year: subject.cutoff_year,
      cutoff_label: subject.cutoff_label,
      reveal_status: subject.reveal_status,
    },
    systemPrompt,
    drawnFrom,
    passages,
  };
}
