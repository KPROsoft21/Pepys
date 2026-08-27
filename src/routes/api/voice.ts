import { createFileRoute } from "@tanstack/react-router";

/**
 * Speech for the reconstruction. Text in, spoken audio out.
 * The voice direction is fixed here so every utterance sounds like the same man.
 */
export const Route = createFileRoute("/api/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response("The reconstruction's voice is not configured.", { status: 500 });
        }

        let text = "";
        try {
          const body = (await request.json()) as { text?: string };
          text = (body.text ?? "").trim().slice(0, 3800);
        } catch {
          return new Response("Malformed request", { status: 400 });
        }
        if (!text) return new Response("Nothing to speak", { status: 400 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            voice: "onyx",
            response_format: "mp3",
            input: text,
            instructions:
              "An English gentleman of the 1660s: a Navy clerk of six-and-thirty, confiding and quick, " +
              "reading his own diary aloud by candlelight. Warm, wry, unhurried. Light received-English " +
              "colouring, no modern American cadence, no theatrical accent. Let curiosity and appetite show.",
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const status = upstream.status || 502;
          const friendly =
            status === 429
              ? "Too many requests for his voice at once. Try again in a moment."
              : status === 402
                ? "AI credits are exhausted for this workspace, so he cannot speak aloud."
                : `His voice failed (${status}).`;
          return new Response(friendly, { status });
        }

        return new Response(upstream.body, {
          headers: {
            "content-type": "audio/mpeg",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
