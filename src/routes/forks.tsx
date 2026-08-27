import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { GitBranch, Loader2 } from "lucide-react";
import { useState } from "react";

import { Chrome, Gauge } from "@/components/pepys/Chrome";
import { forkLife } from "@/lib/forks.functions";
import { forksQuery } from "@/lib/queries";
import { pct } from "@/lib/pepys";

export const Route = createFileRoute("/forks")({
  head: () => ({
    meta: [
      { title: "Forked Lives — counterfactual biographies of Samuel Pepys" },
      {
        name: "description",
        content:
          "Branch the reconstruction: propose a premise and see the life Samuel Pepys would have led instead, event by event, with its warrant marked.",
      },
      { property: "og:title", content: "Forked Lives — counterfactual Samuel Pepys" },
      {
        property: "og:description",
        content:
          "What if the Fire had taken Seething Lane? Fork the recorded biography and hear him account for the life he led instead.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Forks,
});

const PREMISES = [
  "The Great Fire reached Seething Lane and burnt his house, his money and his diary.",
  "He never took the clerkship of the Acts, and stayed a poor cousin in Lord Sandwich's household.",
  "Elizabeth did not die in 1669; she outlived him.",
  "His eyesight held, and he kept the diary in shorthand to the end of his life.",
];

const TONE: Record<string, string> = {
  unchanged: "border-border bg-secondary text-muted-foreground",
  changed: "border-seal/50 bg-seal/10 text-foreground",
  erased: "border-destructive/40 bg-destructive/10 text-destructive",
  invented: "border-border bg-accent text-accent-foreground",
};

function Forks() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(forksQuery);
  const run = useServerFn(forkLife);

  const [premise, setPremise] = useState("");
  const [visitor] = useState("a visitor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function fork(text: string) {
    const value = text.trim();
    if (value.length < 8 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await run({ data: { premise: value, visitor } });
      setPremise("");
      await queryClient.invalidateQueries({ queryKey: ["forks"] });
      await queryClient.invalidateQueries({ queryKey: ["dossier"] });
      setOpen(result.forkId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The branch could not be composed.");
    } finally {
      setBusy(false);
    }
  }

  const forks = data?.forks ?? [];

  return (
    <Chrome subtitle="Forked lives">
      <main className="mx-auto max-w-5xl px-5 pb-6">
        <header className="space-y-3 py-10">
          <p className="small-caps-label">Counterfactual branches</p>
          <h1 className="font-display text-4xl leading-tight">The lives he did not lead</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The same man, the same temper and appetites, with one fact of his life changed. Each
            branch keeps the recorded chronology where the premise leaves it alone and marks every
            entry it alters, erases or invents, with the warrant behind it. Branches are kept apart
            from his memory: forking a life does not teach him anything.
          </p>
        </header>

        <form
          className="leaf space-y-3 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void fork(premise);
          }}
        >
          <label className="small-caps-label block" htmlFor="premise">
            Change one thing
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <textarea
              id="premise"
              value={premise}
              onChange={(event) => setPremise(event.target.value)}
              rows={2}
              placeholder="Suppose that…"
              className="min-h-[3.5rem] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={busy || premise.trim().length < 8}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-seal px-4 text-sm font-medium text-seal-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <GitBranch className="size-4" />}
              Fork his life
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {PREMISES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPremise(p)}
                className="rounded-full border border-border bg-secondary px-3 py-1.5 text-left text-xs text-secondary-foreground transition-colors hover:bg-accent"
              >
                {p}
              </button>
            ))}
          </div>
          {busy && (
            <p className="font-mono text-[11px] text-muted-foreground">
              Composing the branch from his character and the recorded chronology — this takes a
              minute.
            </p>
          )}
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </form>

        <section className="mt-8 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Reading the branches…</p>}
          {!isLoading && !forks.length && (
            <p className="leaf p-5 text-sm text-muted-foreground">
              No branches yet. Change one fact above and a second biography will be composed.
            </p>
          )}

          {forks.map((f) => {
            const events = (data?.events ?? []).filter((e) => e.fork_id === f.id);
            const isOpen = open === f.id;
            return (
              <article key={f.id} className="leaf p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="font-display text-2xl leading-snug">{f.label}</h2>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      diverges {f.divergence_label ?? f.divergence_year} · {events.length} events
                    </p>
                  </div>
                  <Gauge value={Number(f.confidence)} label={`${pct(Number(f.confidence))} warrant`} />
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="small-caps-label mr-2">Premise</span>
                  {f.premise}
                </p>
                {f.summary && <p className="mt-3 max-w-2xl text-sm leading-relaxed">{f.summary}</p>}

                <button
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  className="small-caps-label mt-4 inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 transition-colors hover:bg-accent"
                >
                  {isOpen ? "Close this life" : "Read this life"}
                </button>

                {isOpen && (
                  <div className="mt-4 space-y-5">
                    {f.self_account && (
                      <blockquote className="rounded-md border border-border bg-secondary/60 p-4">
                        <p className="small-caps-label">In his own account</p>
                        <p className="diary-hand mt-2 whitespace-pre-wrap">{f.self_account}</p>
                      </blockquote>
                    )}
                    <ol className="space-y-4">
                      {events.map((e) => (
                        <li key={e.id} className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-4">
                          <p className="font-mono text-xs text-muted-foreground">
                            {e.date_label ?? e.year}
                          </p>
                          <div>
                            <p className="flex flex-wrap items-center gap-2">
                              <span className="font-display text-lg leading-snug">{e.title}</span>
                              <span
                                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                                  TONE[e.divergence] ?? TONE["changed"]
                                }`}
                              >
                                {e.divergence}
                              </span>
                            </p>
                            {e.description && (
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                {e.description}
                              </p>
                            )}
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                              warrant {pct(Number(e.confidence))}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </Chrome>
  );
}
