import type { SupabaseClient } from "@supabase/supabase-js";

import { GUTENBERG_VOLUMES, parseVolume, type ParsedEntry } from "./corpus-parse";
import { SUBJECT_SLUG } from "./subject.server";

const CORPUS_VERSION = "wheatley-gutenberg-1";

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

  const parsed: ParsedEntry[] = parseVolume(await fetchVolume(volumeId), year);

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

  const base = () =>
    supabase
      .from("diary_entries")
      .select("entry_date", { count: "exact", head: true })
      .eq("subject_id", subject.id)
      .eq("corpus_version", CORPUS_VERSION);

  const perYear = await Promise.all(
    CORPUS_YEARS.map(async (year) => {
      const { count } = await base()
        .gte("entry_date", `${year}-01-01`)
        .lte("entry_date", `${year}-12-31`);
      return { year, entries: count ?? 0 };
    }),
  );

  const [{ count: totalEntries }, first, last] = await Promise.all([
    base(),
    supabase
      .from("diary_entries")
      .select("entry_date")
      .eq("subject_id", subject.id)
      .eq("corpus_version", CORPUS_VERSION)
      .order("entry_date")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("diary_entries")
      .select("entry_date")
      .eq("subject_id", subject.id)
      .eq("corpus_version", CORPUS_VERSION)
      .order("entry_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Characters are summed per year page to stay under the Data API row cap.
  let totalCharacters = 0;
  for (const { year, entries } of perYear) {
    if (!entries) continue;
    for (let offset = 0; offset < entries; offset += 500) {
      const { data } = await supabase
        .from("diary_entries")
        .select("char_count")
        .eq("subject_id", subject.id)
        .eq("corpus_version", CORPUS_VERSION)
        .gte("entry_date", `${year}-01-01`)
        .lte("entry_date", `${year}-12-31`)
        .order("entry_date")
        .range(offset, offset + 499);
      for (const row of (data ?? []) as { char_count: number }[]) {
        totalCharacters += row.char_count;
      }
    }
  }

  return {
    totalEntries: totalEntries ?? 0,
    totalCharacters,
    firstEntry: first.data?.entry_date ?? null,
    lastEntry: last.data?.entry_date ?? null,
    years: perYear.filter((y) => y.entries > 0),
    pendingYears: perYear.filter((y) => y.entries === 0).map((y) => y.year),
  };
}
