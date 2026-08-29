import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useRef, useState } from "react";

import { useResearchSession } from "@/components/pepys/ResearchAuth";
import {
  embedCorpusBatch,
  getCorpusStatus,
  getEmbeddingStatus,
  ingestCorpusYear,
} from "@/lib/corpus.functions";

export function CorpusPanel() {
  const queryClient = useQueryClient();
  const session = useResearchSession();
  const fetchStatus = useServerFn(getCorpusStatus);
  const runIngest = useServerFn(ingestCorpusYear);

  const status = useQuery({
    queryKey: ["corpus-status"],
    queryFn: () => fetchStatus(),
  });

  const ingest = useMutation({
    mutationFn: (year: number) => runIngest({ data: { year } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corpus-status"] });
      queryClient.invalidateQueries({ queryKey: ["dossier"] });
    },
  });

  const fetchEmbedStatus = useServerFn(getEmbeddingStatus);
  const runEmbedBatch = useServerFn(embedCorpusBatch);
  const embedStatus = useQuery({
    queryKey: ["embedding-status"],
    queryFn: () => fetchEmbedStatus(),
  });
  const [indexing, setIndexing] = useState(false);
  const [indexNote, setIndexNote] = useState<string | null>(null);
  const stop = useRef(false);

  async function buildIndex() {
    stop.current = false;
    setIndexing(true);
    setIndexNote("Embedding passages…");
    try {
      for (;;) {
        if (stop.current) {
          setIndexNote("Paused.");
          break;
        }
        const progress = await runEmbedBatch({ data: { entries: 24 } });
        setIndexNote(
          progress.done
            ? "Semantic index complete."
            : `${progress.entriesRemaining} entries still to embed…`,
        );
        queryClient.invalidateQueries({ queryKey: ["embedding-status"] });
        if (progress.done || progress.entriesProcessed === 0) break;
      }
    } catch (error) {
      setIndexNote(error instanceof Error ? error.message : "Indexing failed.");
    } finally {
      setIndexing(false);
    }
  }

  const embed = embedStatus.data;
  const data = status.data;

  return (
    <div className="leaf space-y-4 p-5">
      <div>
        <p className="small-caps-label">Corpus registry</p>
        <h2 className="font-display text-2xl">Verbatim diary ingestion</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The reconstruction reads from dated diary entries, not from a summary. Each year is
          fetched from the public-domain Wheatley edition, segmented by date, stripped of the
          editor&rsquo;s footnotes, and refused if it falls beyond the historical cutoff.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="small-caps-label">Entries</p>
          <p className="font-display text-2xl">{data?.totalEntries.toLocaleString() ?? "—"}</p>
        </div>
        <div>
          <p className="small-caps-label">Characters</p>
          <p className="font-display text-2xl">
            {data ? `${Math.round(data.totalCharacters / 1000)}k` : "—"}
          </p>
        </div>
        <div>
          <p className="small-caps-label">Span</p>
          <p className="font-mono text-xs text-muted-foreground">
            {data?.firstEntry ?? "—"} → {data?.lastEntry ?? "—"}
          </p>
        </div>
      </div>

      {data?.years.length ? (
        <div className="flex flex-wrap gap-1.5">
          {data.years.map((y) => (
            <button
              key={y.year}
              onClick={() => ingest.mutate(y.year)}
              disabled={ingest.isPending || !session.signedIn}
              title={`Re-ingest ${y.year} from the source volume`}
              className="rounded-md border border-border bg-secondary/60 px-2 py-1 font-mono text-[11px] transition-colors hover:border-seal disabled:opacity-50"
            >
              {ingest.isPending && ingest.variables === y.year
                ? `${y.year}…`
                : `${y.year} · ${y.entries}`}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="small-caps-label">Not yet ingested</p>
        {data?.pendingYears.length ? (
          <div className="flex flex-wrap gap-1.5">
            {data.pendingYears.map((year) => (
              <button
                key={year}
                onClick={() => ingest.mutate(year)}
                disabled={ingest.isPending || !session.signedIn}
                className="rounded-md bg-seal px-2.5 py-1.5 font-mono text-[11px] text-seal-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {ingest.isPending && ingest.variables === year ? `${year}…` : `Ingest ${year}`}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {data ? "Every year from 1660 to the cutoff is ingested." : "Reading registry…"}
          </p>
        )}
      </div>

      <div className="rounded-md border border-border/70 p-4">
        <p className="small-caps-label">Semantic index</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Retrieval is hybrid: word matching plus meaning matching over embedded passages, so a
          paraphrase reaches the day he wrote about. Every passage is still filtered on the
          historical cutoff inside the database.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 font-mono text-[11px]">
          <div>
            <p className="small-caps-label">Entries indexed</p>
            <p>
              {embed ? `${embed.embeddedEntries} / ${embed.entries}` : "—"}
            </p>
          </div>
          <div>
            <p className="small-caps-label">Passages</p>
            <p>{embed ? embed.chunks.toLocaleString() : "—"}</p>
          </div>
          <div>
            <p className="small-caps-label">Model</p>
            <p className="break-all">{embed?.model ?? "—"}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => (indexing ? (stop.current = true) : buildIndex())}
            disabled={!embed || !session.signedIn || (embed.done && !indexing)}
            className="rounded-md bg-seal px-2.5 py-1.5 font-mono text-[11px] text-seal-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {indexing ? "Pause indexing" : embed?.done ? "Index complete" : "Build semantic index"}
          </button>
          {indexNote ? (
            <span className="font-mono text-[11px] text-muted-foreground">{indexNote}</span>
          ) : null}
        </div>
      </div>

      {ingest.data ? (
        <p className="font-mono text-[11px] text-muted-foreground">
          {ingest.data.year}: {ingest.data.entries} entries, {ingest.data.firstEntry} →{" "}
          {ingest.data.lastEntry}
        </p>
      ) : null}
      {ingest.error ? (
        <p className="text-sm text-destructive">{(ingest.error as Error).message}</p>
      ) : null}
    </div>
  );
}
