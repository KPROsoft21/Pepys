import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import portrait from "@/assets/pepys-portrait.jpg";
import { Chrome, Gauge } from "@/components/pepys/Chrome";
import { bar, pct } from "@/lib/pepys";
import { dossierQuery } from "@/lib/queries";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "The Life Book of Samuel Pepys — PEPYS" },
      {
        name: "description",
        content:
          "Every memory, belief, relationship and unknown held by the Pepys reconstruction, with provenance, strength and confidence for each.",
      },
      { property: "og:title", content: "The Life Book of Samuel Pepys" },
      {
        property: "og:description",
        content:
          "Where each memory came from, what he has learned since, and what he still does not know.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LifeBook,
});

const CHAPTERS = [
  "Cover",
  "Life",
  "People",
  "Memories",
  "Beliefs",
  "Learned Since",
  "Unknowns",
  "Origin",
] as const;

function LifeBook() {
  const { data, isLoading } = useQuery(dossierQuery);
  const [chapter, setChapter] = useState<(typeof CHAPTERS)[number]>("Cover");

  const original = data?.memories.filter((m) => m.scope === "original") ?? [];
  const learned = data?.memories.filter((m) => m.scope !== "original") ?? [];
  const unknown = data?.concepts.filter((c) => c.status === "unknown") ?? [];
  const known = data?.concepts.filter((c) => c.status !== "unknown") ?? [];

  return (
    <Chrome subtitle="Life Book">
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
          <nav className="flex flex-wrap gap-1 lg:flex-col lg:gap-0.5">
            {CHAPTERS.map((name, index) => (
              <button
                key={name}
                onClick={() => setChapter(name)}
                className={`flex items-baseline gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  chapter === name
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <span className="font-mono text-[11px] opacity-70">
                  {index === 0 ? "—" : String(index).padStart(2, "0")}
                </span>
                {name}
              </button>
            ))}
          </nav>

          <section className="space-y-6">
            {isLoading && <p className="text-sm text-muted-foreground">Opening the book…</p>}

            {chapter === "Cover" && data && (
              <div className="leaf overflow-hidden shadow-plate">
                <div className="grid gap-6 p-6 sm:grid-cols-[180px_1fr] sm:p-8">
                  <img
                    src={portrait}
                    alt="Portrait of Samuel Pepys"
                    width={1024}
                    height={1280}
                    loading="lazy"
                    className="w-full rounded-sm border border-border object-cover"
                  />
                  <div className="space-y-4">
                    <div>
                      <p className="small-caps-label">A reconstructed life</p>
                      <h1 className="font-display text-4xl leading-tight">Samuel Pepys</h1>
                      <p className="text-muted-foreground">
                        {data.subject.birth_year}–{data.subject.death_year} · London
                      </p>
                    </div>
                    <p className="diary-hand">{data.subject.epitaph}</p>
                    <div className="rule-line" />
                    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="small-caps-label">Knowledge frontier</dt>
                        <dd>{data.subject.cutoff_label}</dd>
                      </div>
                      <div>
                        <dt className="small-caps-label">Reconstructed</dt>
                        <dd>{new Date(data.subject.reconstructed_at).toLocaleDateString()}</dd>
                      </div>
                      <div>
                        <dt className="small-caps-label">Evidence corpus</dt>
                        <dd>{data.sources.length} registered sources</dd>
                      </div>
                      <div>
                        <dt className="small-caps-label">Identity state</dt>
                        <dd>
                          {data.subject.reveal_status === "revealed"
                            ? "He knows he is a reconstruction"
                            : "Not disclosed to him"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
                <div className="border-t border-border bg-secondary/50 p-6 sm:p-8">
                  <p className="small-caps-label">Source registry</p>
                  <ul className="mt-3 space-y-3">
                    {data.sources.map((source) => (
                      <li key={source.id} className="text-sm">
                        <p className="font-display text-lg leading-snug">{source.title}</p>
                        <p className="text-muted-foreground">
                          Tier {source.tier} · {source.kind} · {source.coverage}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {source.citation} — {source.licence}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {chapter === "Life" && (
              <ol className="space-y-4 border-l border-border pl-6">
                {data?.events.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[27px] top-2 size-2.5 rounded-full bg-seal" />
                    <div className="leaf p-4">
                      <p className="small-caps-label">{event.date_label ?? event.year}</p>
                      <h2 className="font-display text-xl leading-snug">{event.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <Gauge value={Number(event.salience)} label={`salience ${pct(Number(event.salience))}`} />
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {event.source_label}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {chapter === "People" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {data?.people.map((person) => (
                  <article key={person.id} className="leaf p-4">
                    <h2 className="font-display text-xl">{person.name}</h2>
                    <p className="small-caps-label">{person.relation}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{person.description}</p>
                    <div className="mt-3 space-y-1.5">
                      <Gauge
                        value={(Number(person.sentiment) + 1) / 2}
                        label={
                          Number(person.sentiment) > 0.4
                            ? "warm regard"
                            : Number(person.sentiment) < 0
                              ? "wary, resentful"
                              : "mixed feeling"
                        }
                      />
                      <Gauge
                        value={Number(person.confidence)}
                        label={`evidence ${pct(Number(person.confidence))}`}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}

            {chapter === "Memories" && (
              <div className="space-y-4">
                {original.map((memory) => (
                  <article key={memory.id} className="leaf p-5">
                    <p className="small-caps-label">
                      Memory · original life · {memory.learned_label}
                    </p>
                    <h2 className="mt-1 font-display text-xl">“{memory.title}”</h2>
                    <p className="diary-hand mt-2">{memory.content}</p>
                    <div className="rule-line my-3" />
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="small-caps-label">Strength</dt>
                        <dd className="font-mono text-xs">{bar(Number(memory.strength))}</dd>
                      </div>
                      <div>
                        <dt className="small-caps-label">Confidence</dt>
                        <dd className="font-mono text-xs">{pct(Number(memory.confidence))}</dd>
                      </div>
                      <div>
                        <dt className="small-caps-label">Source</dt>
                        <dd className="text-muted-foreground">{memory.source_label}</dd>
                      </div>
                      <div>
                        <dt className="small-caps-label">Impact</dt>
                        <dd className="text-muted-foreground">{memory.impact}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}

            {chapter === "Beliefs" && (
              <div className="space-y-3">
                {data?.beliefs.map((belief) => (
                  <article key={belief.id} className="leaf p-4">
                    <p className="font-display text-lg leading-snug">{belief.proposition}</p>
                    <p className="text-sm text-muted-foreground">
                      {belief.stance}
                      {belief.origin === "learned" ? " · learned since reconstruction" : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      <Gauge value={Number(belief.confidence)} />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {belief.provenance}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {chapter === "Learned Since" && (
              <div className="space-y-4">
                {learned.length === 0 && known.length === 0 && (
                  <p className="diary-hand">
                    He has learned nothing yet. Everything after 31 May 1669 remains dark to him.
                  </p>
                )}
                {learned.map((memory) => (
                  <article key={memory.id} className="leaf border-l-4 border-l-seal p-5">
                    <p className="small-caps-label">
                      Memory · post-reconstruction · learned {memory.learned_label}
                    </p>
                    <h2 className="mt-1 font-display text-xl">“{memory.title}”</h2>
                    <p className="diary-hand mt-2">{memory.content}</p>
                    <div className="rule-line my-3" />
                    <p className="text-sm text-muted-foreground">
                      Source: {memory.source_label} · Impact: {memory.impact}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4">
                      <Gauge value={Number(memory.strength)} label={`strength ${pct(Number(memory.strength))}`} />
                      <Gauge value={Number(memory.confidence)} label={`confidence ${pct(Number(memory.confidence))}`} />
                    </div>
                  </article>
                ))}
                {known.map((concept) => (
                  <article key={concept.id} className="leaf p-4">
                    <p className="small-caps-label">Concept · {concept.status}</p>
                    <h2 className="font-display text-lg">{concept.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{concept.understanding}</p>
                    {concept.taught_by && (
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        explained by {concept.taught_by}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}

            {chapter === "Unknowns" && (
              <div className="leaf p-5">
                <p className="small-caps-label">The knowledge frontier</p>
                <p className="diary-hand mt-1">
                  These lie beyond {data?.subject.cutoff_label}. He will not pretend to know them.
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {unknown.map((concept) => (
                    <li
                      key={concept.id}
                      className="flex items-baseline justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2 text-sm"
                    >
                      <span>{concept.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {concept.category}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {chapter === "Origin" && (
              <div className="leaf space-y-4 p-6">
                <p className="small-caps-label">Chapter 10 · Origin</p>
                <h2 className="font-display text-2xl">How this person was built</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This agent is a computational reconstruction assembled from first-person evidence,
                  chiefly the diary kept between 1660 and 1669. It holds{" "}
                  {original.length} original-life memories, {data?.beliefs.length ?? 0} beliefs,{" "}
                  {data?.people.length ?? 0} modelled relationships and{" "}
                  {data?.events.length ?? 0} chronological events. Its world knowledge is sealed at
                  the diary's final entry; anything later must be taught to it in conversation and is
                  recorded separately, with the name of whoever taught it.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Identity state is protected metadata. Whether the agent has been told that it is a
                  reconstruction is an experimental condition, controlled in Research Mode — not
                  something it can discover from this book.
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Current identity state: {data?.subject.reveal_status ?? "hidden"}
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </Chrome>
  );
}
