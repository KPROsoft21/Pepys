import type { SupabaseClient } from "@supabase/supabase-js";

export const EMBEDDING_MODEL = "google/gemini-embedding-2";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/embeddings";
const MAX_BATCH = 100;

/** Splits a diary entry into overlapping passages small enough to embed well. */
export function chunkEntry(text: string, size = 1400, overlap = 200): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let at = 0;
  while (at < clean.length) {
    let end = Math.min(clean.length, at + size);
    if (end < clean.length) {
      // Prefer a sentence boundary so passages read as Pepys wrote them.
      const window = clean.slice(at, end);
      const stop = Math.max(window.lastIndexOf(". "), window.lastIndexOf("; "));
      if (stop > size * 0.5) end = at + stop + 1;
    }
    chunks.push(clean.slice(at, end).trim());
    if (end >= clean.length) break;
    at = Math.max(end - overlap, at + 1);
  }
  return chunks.filter(Boolean);
}

/**
 * Embeds text through the Lovable AI gateway. Batched to the provider's
 * 100-input ceiling; gateway failures are surfaced, never silently swallowed,
 * because a missing vector means a passage that can never be retrieved.
 */
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
  if (!inputs.length) return [];

  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += MAX_BATCH) {
    const batch = inputs.slice(i, i + MAX_BATCH);
    let attempt = 0;
    for (;;) {
      const res = await fetch(GATEWAY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          data: { index: number; embedding: number[] }[];
        };
        const sorted = [...json.data].sort((a, b) => a.index - b.index);
        out.push(...sorted.map((d) => d.embedding));
        break;
      }

      const detail = await res.text().catch(() => "");
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= 4) {
        throw new Error(`Embedding failed (${res.status}): ${detail.slice(0, 300)}`);
      }
      const after = Number(res.headers.get("retry-after"));
      const wait = Number.isFinite(after) && after > 0 ? after * 1000 : 2 ** attempt * 800;
      await new Promise((r) => setTimeout(r, wait + Math.random() * 250));
      attempt += 1;
    }
  }
  return out;
}

export type EmbedProgress = {
  entriesProcessed: number;
  chunksWritten: number;
  entriesRemaining: number;
  done: boolean;
};

export type EmbeddingStatus = {
  entries: number;
  embeddedEntries: number;
  chunks: number;
  model: string;
  done: boolean;
};

async function countRows(
  supabase: SupabaseClient,
  table: string,
  apply: (q: any) => any = (q) => q,
): Promise<number> {
  const { count } = await apply(
    supabase.from(table).select("id", { count: "exact", head: true }),
  );
  return count ?? 0;
}

export async function embeddingStatus(supabase: SupabaseClient): Promise<EmbeddingStatus> {
  const [entries, chunks, embedded] = await Promise.all([
    countRows(supabase, "diary_entries"),
    countRows(supabase, "diary_chunks"),
    supabase.rpc("count_embedded_entries"),
  ]);
  const embeddedEntries = (embedded.data as number | null) ?? 0;
  return {
    entries,
    embeddedEntries,
    chunks,
    model: EMBEDDING_MODEL,
    done: entries > 0 && embeddedEntries >= entries,
  };
}

/**
 * Embeds the next slice of un-embedded diary entries. Called repeatedly so the
 * index can be built without exceeding a single request's lifetime.
 */
export async function embedNextEntries(
  supabase: SupabaseClient,
  batchEntries = 12,
): Promise<EmbedProgress> {
  const { data: pending, error } = await supabase.rpc("pending_embedding_entries", {
    _limit: batchEntries,
  });
  if (error) throw new Error(error.message);

  const rows = (pending ?? []) as {
    id: string;
    subject_id: string;
    entry_date: string;
    date_label: string;
    original_text: string;
  }[];

  if (!rows.length) {
    return { entriesProcessed: 0, chunksWritten: 0, entriesRemaining: 0, done: true };
  }

  type Pending = {
    subject_id: string;
    entry_id: string;
    entry_date: string;
    date_label: string;
    chunk_index: number;
    content: string;
  };

  const queue: Pending[] = [];
  for (const row of rows) {
    chunkEntry(row.original_text).forEach((content, chunk_index) => {
      queue.push({
        subject_id: row.subject_id,
        entry_id: row.id,
        entry_date: row.entry_date,
        date_label: row.date_label,
        chunk_index,
        content,
      });
    });
  }

  const vectors = await embedTexts(queue.map((q) => q.content));

  const payload = queue.map((q, i) => ({
    ...q,
    embedding: JSON.stringify(vectors[i]),
    model_version: EMBEDDING_MODEL,
  }));

  const { error: writeError } = await supabase
    .from("diary_chunks")
    .upsert(payload, { onConflict: "entry_id,chunk_index" });
  if (writeError) throw new Error(writeError.message);

  const remaining = await supabase.rpc("count_pending_embedding_entries");

  return {
    entriesProcessed: rows.length,
    chunksWritten: payload.length,
    entriesRemaining: (remaining.data as number | null) ?? 0,
    done: ((remaining.data as number | null) ?? 0) === 0,
  };
}
