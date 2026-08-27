/**
 * Pure, dependency-free logic for the historical knowledge firewall.
 *
 * Everything here is deliberately side-effect free so it can be unit tested and
 * imported from either the client or the server. The database-touching half
 * lives in `access.server.ts`.
 */

export const DEFAULT_CUTOFF = "1669-05-31";

/** The cutoffs Research Mode may run an experiment at. */
export const CUTOFF_OPTIONS: { id: string; label: string; cutoff: string }[] = [
  { id: "PEPYS-1660", label: "PEPYS-1660", cutoff: "1660-12-31" },
  { id: "PEPYS-1661", label: "PEPYS-1661", cutoff: "1661-12-31" },
  { id: "PEPYS-1662", label: "PEPYS-1662", cutoff: "1662-12-31" },
  { id: "PEPYS-1663", label: "PEPYS-1663", cutoff: "1663-12-31" },
  { id: "PEPYS-1664", label: "PEPYS-1664", cutoff: "1664-12-31" },
  { id: "PEPYS-1665", label: "PEPYS-1665", cutoff: "1665-12-31" },
  { id: "PEPYS-1666", label: "PEPYS-1666", cutoff: "1666-12-31" },
  { id: "PEPYS-1667", label: "PEPYS-1667", cutoff: "1667-12-31" },
  { id: "PEPYS-1668", label: "PEPYS-1668", cutoff: "1668-12-31" },
  { id: "PEPYS-1669", label: "PEPYS-1669 (default)", cutoff: DEFAULT_CUTOFF },
];

export type Dated = { entry_date: string };

/** True when a dated historical record is inside the active cutoff. */
export function canAccessDate(date: string | null | undefined, cutoff: string): boolean {
  if (!date) return false;
  return date <= cutoff;
}

/** Removes every record dated after the cutoff. Applied after any retrieval. */
export function filterByCutoff<T extends Dated>(rows: T[], cutoff: string): T[] {
  return rows.filter((row) => canAccessDate(row.entry_date, cutoff));
}

/**
 * Vocabulary that could only be used by someone with post-cutoff knowledge.
 * Used by the output validator: a term is a leak only when the reconstruction
 * has not been taught the corresponding concept in this run.
 */
export const ANACHRONISM_LEXICON: string[] = [
  "internet",
  "smartphone",
  "smart phone",
  "mobile phone",
  "cell phone",
  "telephone",
  "computer",
  "software",
  "algorithm",
  "electricity",
  "electric",
  "photograph",
  "camera",
  "television",
  "radio",
  "aeroplane",
  "airplane",
  "aircraft",
  "railway",
  "locomotive",
  "automobile",
  "motorcar",
  "antibiotic",
  "penicillin",
  "vaccine",
  "germ theory",
  "bacteria",
  "virus",
  "dna",
  "evolution",
  "atom",
  "nuclear",
  "satellite",
  "rocket",
  "spacecraft",
  "artificial intelligence",
  "language model",
  "database",
  "wifi",
  "email",
  "social media",
  "vaccination",
  "petrol",
  "gasoline",
  "plastic",
  "world war",
  "democracy poll",
];

export type LeakFinding = { term: string; excerpt: string };

/**
 * Scans a generated reply for post-cutoff vocabulary the reconstruction has not
 * been taught. `allowed` should contain the names/keywords of every concept it
 * legitimately knows (taught concepts, learned memories, the visitor's own
 * words in this exchange).
 */
export function detectAnachronisms(
  text: string,
  allowed: string[] = [],
  lexicon: string[] = ANACHRONISM_LEXICON,
): LeakFinding[] {
  const haystack = text.toLowerCase();
  const permitted = allowed.map((a) => a.toLowerCase());
  const findings: LeakFinding[] = [];
  for (const term of lexicon) {
    const at = haystack.indexOf(term);
    if (at < 0) continue;
    // Word-ish boundary check so "electric" doesn't fire inside "electricall".
    const before = haystack[at - 1];
    if (before && /[a-z]/.test(before)) continue;
    if (permitted.some((p) => p.includes(term) || term.includes(p))) continue;
    findings.push({
      term,
      excerpt: text.slice(Math.max(0, at - 60), at + term.length + 60).trim(),
    });
  }
  return findings;
}

export function cutoffLabel(cutoff: string): string {
  const [y, m, d] = cutoff.split("-");
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = months[Number(m) - 1] ?? m;
  return `${Number(d)} ${month} ${y}`;
}
