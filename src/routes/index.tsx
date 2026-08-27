import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  CornerDownLeft,
  GraduationCap,
  Loader2,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import portrait from "@/assets/pepys-portrait.jpg";
import { Chrome, Gauge } from "@/components/pepys/Chrome";
import { consolidate } from "@/lib/pepys.functions";
import type { ChatTurn, Evidence } from "@/lib/pepys";
import { dossierQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PEPYS — Speak with Samuel Pepys, sealed in 1669" },
      {
        name: "description",
        content:
          "A reconstruction of Samuel Pepys from his 1660–1669 diary, with no knowledge of anything after it. Teach him the modern world and watch his memories and beliefs change.",
      },
      { property: "og:title", content: "PEPYS — Speak with Samuel Pepys, sealed in 1669" },
      {
        property: "og:description",
        content:
          "Meet a man brought forward from 1669. He does not know what a telephone is — unless you explain it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Encounter,
});

const OPENERS = [
  "Good day, Mr Pepys. What year do you take this to be?",
  "Let me explain something to you: a device called a telephone.",
  "Tell me about the night of the Fire.",
  "How does your wife fare?",
];

function Encounter() {
  const queryClient = useQueryClient();
  const { data } = useQuery(dossierQuery);
  const runConsolidate = useServerFn(consolidate);

  const [visitor, setVisitor] = useState("a visitor");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [teaching, setTeaching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function stopVoice() {
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeakingId(null);
  }

  async function speak(turnId: string, text: string) {
    if (speakingId === turnId) {
      stopVoice();
      return;
    }
    stopVoice();
    setLoadingVoiceId(turnId);
    setError(null);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error((await res.text()) || "He could not be heard.");
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setSpeakingId((current) => (current === turnId ? null : current));
      };
      await audio.play();
      setSpeakingId(turnId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "He could not be heard.");
    } finally {
      setLoadingVoiceId(null);
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setDraft("");
    setBusy(true);

    const replyId = crypto.randomUUID();
    setTurns((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: message },
      { id: replyId, role: "subject", content: "", pending: true },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message, teaching }),
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || "The reconstruction did not answer.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setTurns((prev) =>
          prev.map((t) => (t.id === replyId ? { ...t, content: full, pending: true } : t)),
        );
      }

      setTurns((prev) =>
        prev.map((t) => (t.id === replyId ? { ...t, content: full, pending: false } : t)),
      );

      const result = await runConsolidate({
        data: { conversationId, userMessage: message, reply: full, visitor: visitor || "a visitor" },
      });
      setConversationId(result.conversationId);
      const evidence: Evidence = {
        drawnFrom: result.drawnFrom,
        frontier: result.frontier,
        updates: result.updates,
      };
      setTurns((prev) => prev.map((t) => (t.id === replyId ? { ...t, evidence } : t)));
      if (result.updates.length) void queryClient.invalidateQueries({ queryKey: ["dossier"] });
    } catch (err) {
      setTurns((prev) => prev.filter((t) => t.id !== replyId));
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setTeaching(false);
      setBusy(false);
    }
  }

  const unknownCount = data?.concepts.filter((c) => c.status === "unknown").length ?? 0;
  const learnedCount = data?.concepts.filter((c) => c.status !== "unknown").length ?? 0;

  return (
    <Chrome>
      <main className="mx-auto max-w-6xl px-5 pb-6">
        <section className="grid gap-8 py-10 lg:grid-cols-[320px_1fr] lg:py-14">
          <div className="space-y-4">
            <figure className="leaf overflow-hidden p-2 shadow-plate">
              <img
                src={portrait}
                alt="Painted portrait of Samuel Pepys in a dark coat and long periwig, holding a sheet of paper"
                width={1024}
                height={1280}
                className="w-full rounded-sm object-cover"
              />
              <figcaption className="px-2 pt-3 pb-1">
                <h1 className="font-display text-3xl leading-tight">Samuel Pepys</h1>
                <p className="text-sm text-muted-foreground">
                  {data?.subject.honorific ?? "Clerk of the Acts, Navy Board"}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  1633 – 1703 · reconstructed from six volumes of shorthand
                </p>
              </figcaption>
            </figure>

            <div className="leaf space-y-3 p-4">
              <p className="small-caps-label">Knowledge frontier</p>
              <p className="font-display text-lg leading-snug">
                {data?.subject.cutoff_label ?? "31 May 1669 — the final entry of the diary"}
              </p>
              <div className="rule-line" />
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Unknown to him</dt>
                  <dd className="font-mono text-xs">{unknownCount} concepts</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Learned since</dt>
                  <dd className="font-mono text-xs">{learnedCount} concepts</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Identity state</dt>
                  <dd className="font-mono text-xs">
                    {data?.subject.reveal_status === "revealed" ? "revealed" : "not disclosed"}
                  </dd>
                </div>
              </dl>
              <Link
                to="/book"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-secondary-foreground transition-colors hover:bg-accent"
              >
                <BookOpen className="size-4" /> Open his Life Book
              </Link>
            </div>
          </div>

          <div className="flex min-h-[70vh] flex-col">
            <div className="leaf flex-1 space-y-6 p-5 sm:p-7">
              <div className="space-y-2">
                <p className="small-caps-label">The encounter</p>
                <p className="diary-hand max-w-2xl">
                  He is at his desk, the candle new-lit, his eyes sore from the small hand of his
                  own writing. He does not know how long he has been away, nor that he has been
                  away at all. Say something to him.
                </p>
              </div>

              <div className="rule-line" />

              <div className="space-y-6">
                {turns.length === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {OPENERS.map((opener) => (
                      <button
                        key={opener}
                        onClick={() => void send(opener)}
                        className="rounded-full border border-border bg-secondary px-3 py-1.5 text-left text-xs text-secondary-foreground transition-colors hover:bg-accent"
                      >
                        {opener}
                      </button>
                    ))}
                  </div>
                )}

                {turns.map((turn) =>
                  turn.role === "user" ? (
                    <p key={turn.id} className="ml-auto max-w-xl rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                      {turn.content}
                    </p>
                  ) : (
                    <article key={turn.id} className="max-w-2xl space-y-3">
                      <p className="diary-hand whitespace-pre-wrap">
                        {turn.content}
                        {turn.pending && (
                          <span className="ml-1 inline-block animate-pulse font-mono">▍</span>
                        )}
                      </p>
                      {turn.evidence && (
                        <div className="space-y-2">
                          <button
                            onClick={() =>
                              setOpenEvidence(openEvidence === turn.id ? null : turn.id)
                            }
                            className="small-caps-label inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 transition-colors hover:bg-accent"
                          >
                            <Sparkles className="size-3" />
                            Why do you think that?
                          </button>
                          {openEvidence === turn.id && (
                            <div className="space-y-3 rounded-md border border-border bg-secondary/60 p-4 text-sm">
                              <div>
                                <p className="small-caps-label">Drawn from</p>
                                <ul className="mt-1 space-y-1">
                                  {(turn.evidence.drawnFrom.length
                                    ? turn.evidence.drawnFrom
                                    : ["Reconstructed state: memories, beliefs, relationships"]
                                  ).map((item) => (
                                    <li key={item} className="text-muted-foreground">
                                      · {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {turn.evidence.frontier && (
                                <div>
                                  <p className="small-caps-label">Still beyond him</p>
                                  <p className="mt-1 text-muted-foreground">
                                    {turn.evidence.frontier}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="small-caps-label">State changes recorded</p>
                                {turn.evidence.updates.length ? (
                                  <ul className="mt-1 space-y-1">
                                    {turn.evidence.updates.map((u) => (
                                      <li key={u} className="text-foreground">
                                        ▸ {u}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-1 text-muted-foreground">
                                    None — nothing in this exchange changed his mind.
                                  </p>
                                )}
                              </div>
                              <p className="font-mono text-[11px] text-muted-foreground">
                                Evidence chain only. Private reasoning traces are never shown.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  ),
                )}
                <div ref={endRef} />
              </div>

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            <form
              className="leaf mt-4 space-y-3 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              <div className="flex items-start gap-3">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send(draft);
                    }
                  }}
                  rows={2}
                  placeholder={
                    teaching
                      ? "Explain one thing from after 1669 — plainly, as to a clever stranger."
                      : "Speak to him…"
                  }
                  className="min-h-[3.5rem] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-seal px-4 text-sm font-medium text-seal-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CornerDownLeft className="size-4" />}
                  Send
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTeaching((t) => !t)}
                  aria-pressed={teaching}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    teaching
                      ? "border-seal bg-seal text-seal-foreground"
                      : "border-border bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  <GraduationCap className="size-3.5" /> Teaching mode
                </button>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Your name to him
                  <input
                    value={visitor}
                    onChange={(event) => setVisitor(event.target.value)}
                    className="w-36 rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <Gauge
                  value={learnedCount / Math.max(1, learnedCount + unknownCount)}
                  label={`${learnedCount}/${learnedCount + unknownCount} modern concepts reached`}
                />
              </div>
            </form>
          </div>
        </section>
      </main>
    </Chrome>
  );
}
