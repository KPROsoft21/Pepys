import { createFileRoute } from "@tanstack/react-router";

import { countBlockedByCutoff, logDenial } from "@/lib/access.server";
import { loadSubjectState, serverSupabase } from "@/lib/subject.server";

type Body = {
  conversationId?: string | null;
  message?: string;
  teaching?: boolean;
  visitorKey?: string | null;
};

const MODEL = "openai/gpt-5.6-sol";
const PROMPT_VERSION = "v4";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response("The reconstruction's language service is not configured.", {
            status: 500,
          });
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Malformed request", { status: 400 });
        }
        const message = (body.message ?? "").trim();
        if (!message) return new Response("Empty message", { status: 400 });
        if (message.length > 4000) return new Response("Message too long", { status: 413 });

        const supabase = serverSupabase();
        const state = await loadSubjectState(
          supabase,
          body.conversationId ?? null,
          message,
          body.visitorKey ?? null,
        );

        // Historical firewall accounting: what the corpus holds beyond the
        // active cutoff and therefore refused to hand over.
        const denial = await countBlockedByCutoff(
          supabase,
          state.subject.id,
          state.access.cutoff,
          message,
        );

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: interaction } = await supabaseAdmin
          .from("interactions")
          .insert({
            subject_id: state.subject.id,
            conversation_id: body.conversationId ?? null,
            visitor_key: body.visitorKey ?? null,
            user_message: message,
            subject_response: "",
            teaching_mode: Boolean(body.teaching),
            retrieved_memory_ids: state.passages.map((p) => p.id),
            denied_count: denial.blocked,
            asked_question_id: state.curiosity.askedQuestionId,
            model_version: MODEL,
            prompt_version: PROMPT_VERSION,
            cutoff: state.access.cutoff,
          })
          .select("id")
          .maybeSingle();
        const interactionId = interaction?.id ?? null;

        await logDenial(supabaseAdmin, {
          subjectId: state.subject.id,
          interactionId,
          requested: message,
          reason: `${denial.blocked} diary entries matched but fall after the active cutoff${denial.firstBlockedDate ? ` (earliest ${denial.firstBlockedDate})` : ""}`,
          cutoff: state.access.cutoff,
          blockedCount: denial.blocked,
        });

        const instruction = body.teaching
          ? `${state.systemPrompt}\n\n## TEACHING MODE\nThe visitor is deliberately explaining something from after your time. Listen closely, restate what you now understand in your own words, name what still puzzles you, and ask exactly one further question.`
          : state.systemPrompt;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: MODEL,
            stream: true,
            store: false,
            reasoning: { effort: "low", summary: "auto" },
            input: [
              { role: "developer", content: [{ type: "input_text", text: instruction }] },
              { role: "user", content: [{ type: "input_text", text: message }] },
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          const status = upstream.status || 502;
          const friendly =
            status === 429
              ? "The reconstruction is being asked too many questions at once. Try again in a moment."
              : status === 402
                ? "AI credits are exhausted for this workspace; the reconstruction cannot answer until they are topped up."
                : `The reconstruction could not answer (${status}). ${detail.slice(0, 300)}`;
          return new Response(friendly, { status });
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            let buffer = "";
            let produced = false;
            let full = "";
            try {
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
                      if (event.type === "response.output_text.delta" && event.delta) {
                        produced = true;
                        full += event.delta;
                        controller.enqueue(encoder.encode(event.delta));
                      } else if (event.type === "response.completed" && !produced) {
                        const text = event.response?.output_text ?? "";
                        if (text) {
                          produced = true;
                          full += text;
                          controller.enqueue(encoder.encode(text));
                        }
                      }
                    } catch {
                      /* ignore keep-alive and partial frames */
                    }
                  }
                }
              }
              if (!produced) {
                controller.enqueue(
                  encoder.encode("(He looks up from his papers, but says nothing.)"),
                );
              }
            } catch (error) {
              console.error("chat stream failed", error);
            } finally {
              controller.close();
            }

            // Output validation runs on the completed reply: post-cutoff
            // vocabulary he was never taught is recorded as model leakage.
            try {
              if (full) {
                const { validateReply } = await import("@/lib/validate.server");
                await Promise.all([
                  interactionId
                    ? supabaseAdmin
                        .from("interactions")
                        .update({ subject_response: full.slice(0, 8000) })
                        .eq("id", interactionId)
                    : Promise.resolve(null),
                  validateReply(supabaseAdmin, {
                    subjectId: state.subject.id,
                    interactionId,
                    visitorMessage: message,
                    reply: full,
                    cutoff: state.access.cutoff,
                    modelVersion: MODEL,
                  }),
                ]);
              }
            } catch (error) {
              console.error("output validation failed", error);
            }
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-store",
            // Citations for the evidence chain: the diary days actually retrieved.
            "x-pepys-passages": JSON.stringify(
              state.passages.map((p) => ({
                date: p.date_label,
                relevance: p.relevance,
                similarity: p.similarity,
              })),
            ),
            "x-pepys-firewall": JSON.stringify({
              cutoff: state.access.cutoff,
              cutoffLabel: state.access.cutoffLabel,
              blocked: denial.blocked,
              earliestBlocked: denial.firstBlockedDate,
            }),
            "x-pepys-interaction": interactionId ?? "",
            "access-control-expose-headers":
              "x-pepys-passages, x-pepys-firewall, x-pepys-interaction",
          },
        });
      },
    },
  },
});
