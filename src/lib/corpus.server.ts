import type { SupabaseClient } from "@supabase/supabase-js";

import { GUTENBERG_VOLUMES, parseVolume, type ParsedEntry } from "./corpus-parse";
import { SUBJECT_SLUG } from "./subject.server";

const CORPUS_VERSION = "wheatley-gutenberg-1";

/** Supplementary volumes: the "Complete 1660 N.S." volume omits January 1660. */
const SUPPLEMENTS: Record<number, number[]> = { 1660: [4118] };

export const CORPUS_YEARS = Object.keys(GUTENBERG_VOLUMES)
  .map(Number)
  .sort((a, b) => a - b);

export type IngestResult = {
  year: number;
  entries: number;
  characters: number;
  firstEntry: string | null;
  lastEntry: string | null;
};

async function fetchVolume(gutenbergId: number): Promise<string> {
  const urls = [
    `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`,
    `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}-0.txt`,
  ];
  let lastError = "";
  for (const url of urls) {
    const res = await fetch(url);
    if (res.ok) return res.text();
    lastError = `${res.status} ${url}`;
  }
  throw new Error(`Could not fetch diary volume ${gutenbergId} (${lastError})`);
}

async function diarySourceId(supabase: SupabaseClient, subjectId: string): Promise<string | null> {
  const { data } = await supabase
    .from("sources")
    .select("id,title")
    .eq("subject_id", subjectId)
    .order("tier")
    .limit(20);
  const diary = (data ?? []).find((s: { title: string }) => /diary/i.test(s.title));
  return diary?.id ?? null;
}

/**
 * Ingests one year of the diary: fetches the public-domain volume, segments it
 * into dated entries, and upserts them as the subject's primary corpus.
 * Entries after the historical cutoff are rejected outright — the corpus itself
 * must never contain text the reconstruction is not permitted to know.
 */
export async function ingestYear(
  supabase: SupabaseClient,
  year: number,
): Promise<IngestResult> {
  const volumeId = GUTENBERG_VOLUMES[year];
  if (!volumeId) throw new Error(`No registered diary volume for ${year}`);

  const { data: subject, error } = await supabase
    .from("subjects")
    .select("id,cutoff_year")
    .eq("slug", SUBJECT_SLUG)
    .single();
  if (error || !subject) throw new Error("Subject not found");

  const { data: state } = await supabase
    .from("pepys_state")
    .select("id,cutoff_date")
    .eq("subject_id", subject.id)
    .is("fork_id", null)
    .maybeSingle();
  const cutoff: string = state?.cutoff_date ?? `${subject.cutoff_year}-12-31`;

  const ids = [volumeId, ...(SUPPLEMENTS[year] ?? [])];
  const parsed: ParsedEntry[] = [];
  for (const id of ids) {
    parsed.push(...parseVolume(await fetchVolume(id), year));
  }

  const byDate = new Map<string, ParsedEntry>();
  for (const entry of parsed) {
    if (entry.entry_date > cutoff) continue; // hard corpus-level firewall
    const prev = byDate.get(entry.entry_date);
    if (!prev || prev.char_count < entry.char_count) byDate.set(entry.entry_date, entry);
  }
  const entries = [...byDate.values()].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  if (!entries.length) throw new Error(`No entries parsed for ${year}`);

  const sourceId = await diarySourceId(supabase, subject.id);
  const rows = entries.map((e) => ({
    subject_id: subject.id,
    source_id: sourceId,
    entry_date: e.entry_date,
    date_label: e.date_label,
    original_text: e.original_text,
    char_count: e.char_count,
    corpus_version: CORPUS_VERSION,
    derived: false,
  }));

  for (let i = 0; i < rows.length; i += 100) {
    const { error: upsertError } = await supabase
      .from("diary_entries")
      .upsert(rows.slice(i, i + 100), {
        onConflict: "subject_id,entry_date,corpus_version",
      });
    if (upsertError) throw new Error(upsertError.message);
  }

  await supabase.from("learning_log").insert({
    subject_id: subject.id,
    kind: "corpus_ingest",
    summary: `Ingested ${entries.length} verbatim diary entries for ${year} from the public-domain Wheatley edition.`,
    state_before: `corpus without ${year}`,
    state_after: `${entries.length} dated entries, ${entries.reduce((a, b) => a + b.char_count, 0).toLocaleString()} characters`,
    confidence: 1,
  });

  return {
    year,
    entries: entries.length,
    characters: entries.reduce((a, b) => a + b.char_count, 0),
    firstEntry: entries[0]?.date_label ?? null,
    lastEntry: entries.at(-1)?.date_label ?? null,
  };
}

export type CorpusStatus = {
  totalEntries: number;
  totalCharacters: number;
  firstEntry: string | null;
  lastEntry: string | null;
  years: { year: number; entries: number }[];
  pendingYears: number[];
};

export async function corpusStatus(supabase: SupabaseClient): Promise<CorpusStatus> {
  const { data: subject } = await supabase
    .from("subjects")
    .select("id")
    .eq("slug", SUBJECT_SLUG)
    .single();
  if (!subject) throw new Error("Subject not found");

  const { data } = await supabase
    .from("diary_entries")
    .select("entry_date,char_count")
    .eq("subject_id", subject.id)
    .eq("corpus_version", CORPUS_VERSION)
    .order("entry_date");

  const rows = (data ?? []) as { entry_date: string; char_count: number }[];
  const counts = new Map<number, number>();
  for (const row of rows) {
    const y = Number(row.entry_date.slice(0, 4));
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }

  return {
    totalEntries: rows.length,
    totalCharacters: rows.reduce((a, b) => a + b.char_count, 0),
    firstEntry: rows[0]?.entry_date ?? null,
    lastEntry: rows.at(-1)?.entry_date ?? null,
    years: CORPUS_YEARS.filter((y) => counts.has(y)).map((y) => ({
      year: y,
      entries: counts.get(y) ?? 0,
    })),
    pendingYears: CORPUS_YEARS.filter((y) => !counts.has(y)),
  };
}
