import type { SupabaseClient } from "@supabase/supabase-js";

export type RetrievedEntry = {
  id: string;
  entry_date: string;
  date_label: string;
  excerpt: string;
  relevance: number;
};

const STOPWORDS = new Set([
  "about","after","again","all","also","and","any","are","because","been","before","being","but","can",
  "could","did","does","doing","for","from","had","has","have","how","into","its","just","like","made",
  "make","many","may","might","more","most","much","must","not","now","one","only","other","our","out",
  "over","said","same","she","should","some","such","tell","than","that","the","their","them","then",
  "there","these","they","this","those","through","time","told","too","under","very","was","were","what",
  "when","where","which","while","who","why","will","with","would","you","your","yourself","were","ever",
]);

/** Reduces a visitor's message to the content words worth searching the diary for. */
export function searchTerms(message: string, limit = 8): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of message.toLowerCase().split(/[^a-z']+/)) {
    const word = raw.replace(/^'+|'+$/g, "");
    if (word.length < 4 || STOPWORDS.has(word) || seen.has(word)) continue;
    seen.add(word);
    terms.push(word);
    if (terms.length >= limit) break;
  }
  return terms;
}

function excerpt(text: string, terms: string[], span = 700): string {
  const lower = text.toLowerCase();
  let at = -1;
  for (const term of terms) {
    const found = lower.indexOf(term);
    if (found >= 0 && (at < 0 || found < at)) at = found;
  }
  if (at < 0) return text.slice(0, span).trim() + (text.length > span ? "…" : "");
  const start = Math.max(0, at - Math.floor(span / 3));
  const end = Math.min(text.length, start + span);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

/**
 * The retrieval firewall.
 *
 * Every passage the reconstruction may consult is fetched through this function,
 * which filters at the database level on the historical cutoff: an entry dated
 * after the cutoff can never enter the context window, regardless of what the
 * visitor asks. Ranking is relevance-first, recency-second.
 */
export async function retrievePassages(
  supabase: SupabaseClient,
  subjectId: string,
  cutoff: string,
  message: string,
  limit = 6,
): Promise<RetrievedEntry[]> {
  const terms = searchTerms(message);
  if (!terms.length) return [];

  const { data, error } = await supabase.rpc("search_diary_entries", {
    _subject_id: subjectId,
    _query: terms.join(" OR "),
    _cutoff: cutoff,
    _limit: limit,
  });
  if (error) {
    console.error("diary retrieval failed", error.message);
    return [];
  }

  return ((data ?? []) as {
    id: string;
    entry_date: string;
    date_label: string;
    original_text: string;
    relevance: number;
  }[])
    .filter((row) => row.entry_date <= cutoff)
    .map((row) => ({
      id: row.id,
      entry_date: row.entry_date,
      date_label: row.date_label,
      excerpt: excerpt(row.original_text, terms),
      relevance: row.relevance,
    }));
}
