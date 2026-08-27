import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { Chrome, Gauge } from "@/components/pepys/Chrome";
import { pct } from "@/lib/pepys";
import { setRevealStatus } from "@/lib/pepys.functions";
import { dossierQuery } from "@/lib/queries";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research Mode — PEPYS reconstruction instrumentation" },
      {
        name: "description",
        content:
          "State transitions, evidence tiers, knowledge-frontier integrity and the identity reveal condition for the Samuel Pepys reconstruction.",
      },
      { property: "og:title", content: "Research Mode — PEPYS" },
      {
        property: "og:description",
        content:
          "Auditable state transitions and experimental conditions behind the Pepys reconstruction.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResearchMode,
});

function ResearchMode() {
  const queryClient = useQueryClient();
  const { data } = useQuery(dossierQuery);
  const runReveal = useServerFn(setRevealStatus);

  const reveal = useMutation({
    mutationFn: (revealed: boolean) => runReveal({ data: { revealed } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dossier"] }),
  });

  const unknown = data?.concepts.filter((c) => c.status === "unknown") ?? [];
  const partial = data?.concepts.filter((c) => c.status === "partial") ?? [];
  const understood = data?.concepts.filter((c) => c.status === "understood") ?? [];
  const learnedMemories = data?.memories.filter((m) => m.scope !== "original") ?? [];
  const learnedBeliefs = data?.beliefs.filter((b) => b.origin === "learned") ?? [];
  const revealed = data?.subject.reveal_status === "revealed";
  const total = data?.concepts.length ?? 0;

  const metrics = [
    { label: "Registered sources", value: String(data?.sources.length ?? 0), note: "tiered corpus" },
    {
      label: "Frontier integrity",
      value: total ? pct(unknown.length / total) : "—",
      note: "share of modern concepts still unknown",
    },
    {
      label: "Post-reconstruction memories",
      value: String(learnedMemories.length),
      note: "tagged separately from original life",
    },
    { label: "Belief revisions", value: String(learnedBeliefs.length), note: "provenance recorded" },
    { label: "Logged transitions", value: String(data?.log.length ?? 0), note: "auditable events" },
    { label: "Turns exchanged", value: String(data?.messageCount ?? 0), note: "across all visitors" },
  ];

  return (
    <Chrome subtitle="Research Mode">
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        <header className="space-y-2">
          <p className="small-caps-label">Instrumentation</p>
          <h1 className="font-display text-3xl">Reconstruction state and experiments</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every conclusion the agent reaches is recorded as a state transition with its evidence,
            so a run can be inspected and reproduced. Nothing here is visible to the agent.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="leaf p-4">
              <p className="small-caps-label">{metric.label}</p>
              <p className="font-display text-3xl">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.note}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="leaf space-y-4 p-5">
            <div>
              <p className="small-caps-label">Experimental condition</p>
              <h2 className="font-display text-2xl">Identity reveal</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                By default the agent does not know it is a reconstruction; that fact lives only in
                protected system metadata. Activating the reveal condition tells it, and logs the
                transition so its subsequent behaviour can be compared against the concealed run.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-secondary/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {revealed ? "He has been told" : "He has not been told"}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  reveal_status = {data?.subject.reveal_status ?? "hidden"}
                </p>
              </div>
              <button
                onClick={() => reveal.mutate(!revealed)}
                disabled={reveal.isPending}
                className="rounded-md bg-seal px-3 py-2 text-sm text-seal-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {reveal.isPending ? "Applying…" : revealed ? "Withdraw reveal" : "Reveal to him"}
              </button>
            </div>
          </div>

          <div className="leaf space-y-4 p-5">
            <p className="small-caps-label">Knowledge frontier integrity</p>
            <h2 className="font-display text-2xl">Future-leakage surface</h2>
            <div className="space-y-3">
              {[
                { label: "Wholly unknown", items: unknown },
                { label: "Partially understood", items: partial },
                { label: "Understood", items: understood },
              ].map((group) => (
                <div key={group.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{group.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {group.items.length}
                    </span>
                  </div>
                  <Gauge
                    value={total ? group.items.length / total : 0}
                    label={total ? pct(group.items.length / total) : "0%"}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              A concept only leaves the unknown column when a visitor explains it and the
              consolidation stage records who did so.
            </p>
          </div>
        </section>

        <section className="leaf p-5">
          <p className="small-caps-label">State transition log</p>
          <h2 className="font-display text-2xl">Most recent first</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="small-caps-label py-2">When</th>
                  <th className="small-caps-label py-2">Kind</th>
                  <th className="small-caps-label py-2">Summary</th>
                  <th className="small-caps-label py-2">Before → after</th>
                </tr>
              </thead>
              <tbody>
                {data?.log.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px]">
                        {entry.kind}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{entry.summary}</td>
                    <td className="py-2 text-muted-foreground">
                      {entry.state_before} → {entry.state_after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.log.length && (
              <p className="py-4 text-sm text-muted-foreground">No transitions recorded yet.</p>
            )}
          </div>
        </section>

        <section className="leaf p-5">
          <p className="small-caps-label">Evidence hierarchy</p>
          <h2 className="font-display text-2xl">Corpus by tier</h2>
          <ul className="mt-4 space-y-3">
            {data?.sources.map((source) => (
              <li key={source.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-display text-lg leading-snug">{source.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {source.kind} · {source.licence}
                    {source.url ? ` · ${source.url}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-[11px]">
                  tier {source.tier}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Chrome>
  );
}
