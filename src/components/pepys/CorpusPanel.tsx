import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getCorpusStatus, ingestCorpusYear } from "@/lib/corpus.functions";

export function CorpusPanel() {
  const queryClient = useQueryClient();
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
              disabled={ingest.isPending}
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
                disabled={ingest.isPending}
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
