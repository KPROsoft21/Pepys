import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { SUBJECT_SLUG } from "./subject.server";

export type ConsolidationResult = {
  conversationId: string;
  drawnFrom: string[];
  frontier: string | null;
  updates: string[];
};

type Extraction = {
  concepts: { name: string; category: string; status: string; understanding: string }[];
  memory: { title: string; content: string; impact: string; strength: number } | null;
  belief: { proposition: string; stance: string; confidence: number } | null;
  frontier_note: string;
  drawn_from: string[];
};

const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    concepts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          status: { type: "string", enum: ["unknown", "partial", "understood"] },
          understanding: { type: "string" },
        },
        required: ["name", "category", "status", "understanding"],
      },
    },
    memory: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        content: { type: "string" },
        impact: { type: "string" },
        strength: { type: "number" },
      },
      required: ["title", "content", "impact", "strength"],
    },
    belief: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        proposition: { type: "string" },
        stance: { type: "string" },
        confidence: { type: "number" },
      },
      required: ["proposition", "stance", "confidence"],
    },
    frontier_note: { type: "string" },
    drawn_from: { type: "array", items: { type: "string" } },
  },
  required: ["concepts", "memory", "belief", "frontier_note", "drawn_from"],
};

async function extract(
  apiKey: string,
  userMessage: string,
  reply: string,
  visitor: string,
): Promise<Extraction | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-3.7-flash",
      messages: [
        {
          role: "system",
          content: `You are the consolidation stage of a historical-personality reconstruction of Samuel Pepys, whose knowledge is frozen at 31 May 1669. You are given one exchange between a modern visitor and the reconstruction. Extract only what genuinely changed.

Rules:
- concepts: post-1669 concepts the visitor explained in this exchange. status "partial" if only sketched, "understood" if clearly grasped. Use a short canonical name ("The internet", "Smartphones"). Empty array if nothing was taught.
- memory: one episodic post-reconstruction memory ONLY if this exchange was notable (something learned, a shock, a strong feeling). Written in Pepys's first person. strength 0.4-0.95. Otherwise null.
- belief: one new or revised belief ONLY if the exchange plainly changed his position. Otherwise null.
- frontier_note: one plain sentence naming what he still does not understand after this exchange.
- drawn_from: 2-4 short labels for the evidence the reply leaned on (e.g. "Diary, 2 September 1666", "Belief: music ravishes the soul", "Relationship: Elisabeth Pepys").
The visitor is named ${visitor}.`,
        },
        { role: "user", content: `VISITOR: ${userMessage}\n\nPEPYS: ${reply}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "consolidation", strict: true, schema: EXTRACTION_SCHEMA },
      },
    }),
  });

  if (!res.ok) {
    console.error("consolidation extraction failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    return JSON.parse(content) as Extraction;
  } catch {
    return null;
  }
}

export async function consolidateExchange(input: {
  conversationId: string | null;
  userMessage: string;
  reply: string;
  visitor: string;
}): Promise<ConsolidationResult> {
  const { data: subject } = await supabaseAdmin
    .from("subjects")
    .select("id")
    .eq("slug", SUBJECT_SLUG)
    .single();
  if (!subject) throw new Error("Subject not found");

  let conversationId = input.conversationId;
  if (!conversationId) {
    const { data: convo, error } = await supabaseAdmin
      .from("conversations")
      .insert({ subject_id: subject.id, user_label: input.visitor })
      .select("id")
      .single();
    if (error || !convo) throw new Error("Could not open a conversation");
    conversationId = convo.id;
  }

  await supabaseAdmin.from("messages").insert([
    { conversation_id: conversationId, role: "user", content: input.userMessage },
    { conversation_id: conversationId, role: "subject", content: input.reply },
  ]);

  const apiKey = process.env["LOVABLE_API_KEY"];
  const updates: string[] = [];
  let frontier: string | null = null;
  let drawnFrom: string[] = [];

  if (apiKey) {
    const extraction = await extract(apiKey, input.userMessage, input.reply, input.visitor);
    if (extraction) {
      frontier = extraction.frontier_note || null;
      drawnFrom = extraction.drawn_from ?? [];

      for (const concept of extraction.concepts ?? []) {
        const { data: existing } = await supabaseAdmin
          .from("concepts")
          .select("id,status")
          .eq("subject_id", subject.id)
          .ilike("name", concept.name)
          .maybeSingle();

        if (existing) {
          await supabaseAdmin
            .from("concepts")
            .update({
              status: concept.status,
              understanding: concept.understanding,
              taught_by: input.visitor,
              first_known_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          updates.push(`Concept "${concept.name}": ${existing.status} → ${concept.status}`);
          await supabaseAdmin.from("learning_log").insert({
            subject_id: subject.id,
            conversation_id: conversationId,
            kind: "concept",
            summary: `Learned about ${concept.name} from ${input.visitor}`,
            state_before: existing.status,
            state_after: `${concept.status}: ${concept.understanding}`,
          });
        } else {
          await supabaseAdmin.from("concepts").insert({
            subject_id: subject.id,
            name: concept.name,
            category: concept.category || "modern world",
            status: concept.status,
            understanding: concept.understanding,
            taught_by: input.visitor,
            first_known_at: new Date().toISOString(),
          });
          updates.push(`New concept recorded: "${concept.name}" (${concept.status})`);
          await supabaseAdmin.from("learning_log").insert({
            subject_id: subject.id,
            conversation_id: conversationId,
            kind: "concept",
            summary: `First encounter with ${concept.name}`,
            state_before: "unknown",
            state_after: `${concept.status}: ${concept.understanding}`,
          });
        }
      }

      if (extraction.memory) {
        await supabaseAdmin.from("memories").insert({
          subject_id: subject.id,
          conversation_id: conversationId,
          scope: "post_reconstruction",
          title: extraction.memory.title,
          content: extraction.memory.content,
          learned_label: new Date().getFullYear().toString(),
          strength: Math.min(0.98, Math.max(0.3, extraction.memory.strength)),
          confidence: 0.85,
          source_label: `Conversation with ${input.visitor}`,
          impact: extraction.memory.impact,
        });
        updates.push(`Memory formed: "${extraction.memory.title}"`);
        await supabaseAdmin.from("learning_log").insert({
          subject_id: subject.id,
          conversation_id: conversationId,
          kind: "memory",
          summary: extraction.memory.title,
          state_before: "no such memory",
          state_after: extraction.memory.impact,
          confidence: 0.85,
        });
      }

      if (extraction.belief) {
        await supabaseAdmin.from("beliefs").insert({
          subject_id: subject.id,
          proposition: extraction.belief.proposition,
          stance: extraction.belief.stance,
          confidence: Math.min(0.99, Math.max(0.05, extraction.belief.confidence)),
          provenance: `Taught by ${input.visitor}`,
          origin: "learned",
        });
        updates.push(`Belief updated: "${extraction.belief.proposition}"`);
        await supabaseAdmin.from("learning_log").insert({
          subject_id: subject.id,
          conversation_id: conversationId,
          kind: "belief",
          summary: extraction.belief.proposition,
          state_before: "not previously held",
          state_after: `${extraction.belief.stance} (${extraction.belief.confidence})`,
          confidence: extraction.belief.confidence,
        });
      }
    }
  }

  return { conversationId, drawnFrom, frontier, updates };
}

export async function applyRevealStatus(revealed: boolean) {
  const { data: subject } = await supabaseAdmin
    .from("subjects")
    .select("id,reveal_status")
    .eq("slug", SUBJECT_SLUG)
    .single();
  if (!subject) throw new Error("Subject not found");

  const next = revealed ? "revealed" : "hidden";
  if (subject.reveal_status === next) return { reveal_status: next };

  await supabaseAdmin.from("subjects").update({ reveal_status: next }).eq("id", subject.id);
  await supabaseAdmin.from("learning_log").insert({
    subject_id: subject.id,
    kind: "identity",
    summary: revealed
      ? "Identity reveal condition activated: the subject has been told he is a reconstruction."
      : "Identity reveal withdrawn: the subject no longer holds that he is a reconstruction.",
    state_before: subject.reveal_status,
    state_after: next,
    confidence: 1,
  });

  return { reveal_status: next };
}
