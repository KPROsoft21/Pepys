import { loadSubjectState, serverSupabase } from "./subject.server";

export type ForkEventDraft = {
  year: number;
  date_label: string;
  title: string;
  description: string;
  divergence: string;
  confidence: number;
};

type ForkDraft = {
  label: string;
  divergence_year: number;
  divergence_label: string;
  summary: string;
  self_account: string;
  confidence: number;
  events: ForkEventDraft[];
};

const FORK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "label",
    "divergence_year",
    "divergence_label",
    "summary",
    "self_account",
    "confidence",
    "events",
  ],
  properties: {
    label: { type: "string", description: "Short title for this branch, 3-8 words." },
    divergence_year: { type: "integer" },
    divergence_label: { type: "string" },
    summary: {
      type: "string",
      description: "Third-person historian's note on how the life diverges. Two or three sentences.",
    },
    self_account: {
      type: "string",
      description:
        "Pepys speaking in the first person from inside this branch, in his own 1660s English. Three to six sentences.",
    },
    confidence: { type: "number" },
    events: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["year", "date_label", "title", "description", "divergence", "confidence"],
        properties: {
          year: { type: "integer" },
          date_label: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          divergence: {
            type: "string",
            enum: ["unchanged", "changed", "erased", "invented"],
          },
          confidence: { type: "number" },
        },
      },
    },
  },
} as const;

async function generateFork(premise: string, systemPrompt: string, chronology: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("The reconstruction's language service is not configured.");

  const instruction = `You are the historiographer of a temporal personality reconstruction of Samuel Pepys, sealed at 31 May 1669.

A visitor proposes a counterfactual premise. Produce a FORKED LIFE: the same man, the same character, temperament and appetites, but a biography that diverges from the recorded one at the point the premise implies.

Rules:
- Stay inside the seventeenth century. Nothing after 1703, no modern technology, no anachronistic language.
- Reuse the real chronology where the premise does not disturb it, and mark those entries "unchanged".
- Mark altered recorded events "changed", removed ones "erased", and events that exist only in this branch "invented".
- Give 7 to 11 events, ordered by year, spanning from just before the divergence to the end of this branch's life.
- Confidence is your honest warrant: high for consequences that follow tightly from the premise and his known character, low for speculation.
- self_account is Pepys himself, first person, plain ornamented English of the 1660s, no markdown.
- The premise is a hypothesis about his life, not about the modern world; never let him show knowledge from after his time.

The recorded chronology:
${chronology}

His reconstructed character, for voice and disposition:
${systemPrompt.slice(0, 6000)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      text: {
        format: {
          type: "json_schema",
          name: "forked_life",
          strict: true,
          schema: FORK_SCHEMA,
        },
      },
      input: [
        { role: "developer", content: [{ type: "input_text", text: instruction }] },
        {
          role: "user",
          content: [{ type: "input_text", text: `Counterfactual premise: ${premise}` }],
        },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const status = res.status || 502;
    throw new Error(
      status === 429
        ? "Too many branches requested at once. Try again in a moment."
        : status === 402
          ? "AI credits are exhausted for this workspace; no further lives can be forked."
          : `The fork could not be composed (${status}).`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const event = JSON.parse(raw) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (event.type === "response.output_text.delta" && event.delta) text += event.delta;
          else if (event.type === "response.completed" && !text)
            text = event.response?.output_text ?? "";
        } catch {
          /* keep-alive or partial frame */
        }
      }
    }
  }

  if (!text.trim()) throw new Error("The fork came back empty. Try a different premise.");
  return JSON.parse(text) as ForkDraft;
}

export async function createForkedLife(input: { premise: string; visitor: string }) {
  const supabase = serverSupabase();
  const state = await loadSubjectState(supabase, null);

  const { data: events } = await supabase
    .from("life_events")
    .select("year,date_label,title,description")
    .eq("subject_id", state.subject.id)
    .order("year");

  const chronology = (events ?? [])
    .map((e) => `- ${e.date_label ?? e.year}: ${e.title}. ${e.description ?? ""}`)
    .join("\n");

  const draft = await generateFork(input.premise, state.systemPrompt, chronology);

  const { data: fork, error } = await supabase
    .from("forks")
    .insert({
      subject_id: state.subject.id,
      label: draft.label.slice(0, 120),
      premise: input.premise,
      divergence_year: draft.divergence_year,
      divergence_label: draft.divergence_label,
      summary: draft.summary,
      self_account: draft.self_account,
      confidence: Math.max(0, Math.min(1, draft.confidence)),
      created_by: input.visitor,
    })
    .select("id")
    .single();
  if (error || !fork) throw new Error(error?.message ?? "The branch could not be recorded.");

  const rows = (draft.events ?? []).slice(0, 14).map((e) => ({
    fork_id: fork.id,
    year: e.year,
    date_label: e.date_label,
    title: e.title,
    description: e.description,
    divergence: e.divergence,
    confidence: Math.max(0, Math.min(1, e.confidence)),
  }));
  if (rows.length) {
    const { error: eventsError } = await supabase.from("fork_events").insert(rows);
    if (eventsError) throw new Error(eventsError.message);
  }

  await supabase.from("learning_log").insert({
    subject_id: state.subject.id,
    kind: "fork",
    summary: `Forked life composed: ${draft.label}`,
    state_before: "single recorded biography",
    state_after: `${rows.length} branch events diverging at ${draft.divergence_label}`,
    confidence: Math.max(0, Math.min(1, draft.confidence)),
  });

  return { forkId: fork.id as string, label: draft.label, events: rows.length };
}
