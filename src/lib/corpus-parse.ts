/**
 * Diary corpus parser.
 *
 * Turns a Project Gutenberg (Wheatley edition) yearly volume into dated
 * entries. The parser only *segments and cleans editorial apparatus* — it
 * never rewrites Pepys's own words. Two classes of text are removed and
 * recorded as such:
 *   1. Project Gutenberg's licence header/footer.
 *   2. Wheatley's editorial footnotes (indented bracketed blocks and inline
 *      `--[ ... ]--` interpolations), which are not the diarist's text.
 */

export const MONTHS = [
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
] as const;

export const GUTENBERG_VOLUMES: Record<number, number> = {
  1660: 4125,
  1661: 4131,
  1662: 4138,
  1663: 4145,
  1664: 4153,
  1665: 4162,
  1666: 4171,
  1667: 4184,
  1668: 4195,
  1669: 4199,
};

export type ParsedEntry = {
  entry_date: string; // ISO yyyy-mm-dd (New Style year as printed on the volume)
  date_label: string; // e.g. "Saturday 1 January 1660"
  original_text: string;
  char_count: number;
};

/** "February 1st. ..." — a month heading opens each month. */
const MONTH_HEAD_RE = new RegExp(
  `^(${MONTHS.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|d|th)?\\.\\s*(.*)$`,
);
/** "2d. ...", "23rd. ..." — subsequent days within the open month. */
const DAY_HEAD_RE = /^(\d{1,2})(?:st|nd|rd|d|th)?\.\s*(.*)$/;
/** "JANUARY 1663-64" / "MAY 1664" — the edition's month section headings. */
const SECTION_RE = new RegExp(
  `^(${MONTHS.map((m) => m.toUpperCase()).join("|")})[,]?\\s+16\\d\\d(?:-\\d{1,4})?\\.?\\s*$`,
);

function stripGutenbergWrapper(raw: string): string {
  const start = raw.search(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG/i);
  const end = raw.search(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG/i);
  let body = raw;
  if (start >= 0) body = body.slice(raw.indexOf("\n", start) + 1);
  if (end >= 0) {
    const cut = body.search(/\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG/i);
    if (cut >= 0) body = body.slice(0, cut);
  }
  return body;
}

/** Drops Wheatley's footnotes: inline `--[ ... ]--` and indented `[ ... ]` blocks. */
export function stripEditorialApparatus(text: string): string {
  let out = "";
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === "[") {
      depth++;
      continue;
    }
    if (ch === "]") {
      if (depth > 0) depth--;
      continue;
    }
    if (depth === 0) out += ch;
  }
  return out
    .replace(/--\s*--/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function iso(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

function weekday(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: "UTC",
  });
}

/**
 * `year` is the New Style year printed on the volume ("Complete 1663 N.S."),
 * so January entries already belong to that year — no Old Style shift needed.
 */
export function parseVolume(raw: string, year: number): ParsedEntry[] {
  const body = stripGutenbergWrapper(raw);
  const lines = body.split(/\r?\n/);

  const entries: ParsedEntry[] = [];
  let current: { month: number; day: number; buf: string[] } | null = null;
  let bracketDepth = 0;
  let sawFirstEntry = false;
  let openMonth: number | null = null;

  const flush = () => {
    if (!current) return;
    const date = iso(year, current.month, current.day);
    const text = stripEditorialApparatus(current.buf.join("\n"));
    current = null;
    if (!date || text.length < 40) return;
    entries.push({
      entry_date: date,
      date_label: `${weekday(date)} ${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1]} ${year}`,
      original_text: text,
      char_count: text.length,
    });
  };

  for (const line of lines) {
    // Track bracket nesting so a date mentioned inside a footnote is not read
    // as the start of a new entry.
    const opens = (line.match(/\[/g) ?? []).length;
    const closes = (line.match(/\]/g) ?? []).length;

    const atMargin = bracketDepth === 0 && !line.startsWith(" ");
    const section = atMargin ? SECTION_RE.exec(line) : null;
    if (section) {
      flush();
      sawFirstEntry = true;
      openMonth =
        MONTHS.findIndex((m) => m.toUpperCase() === section[1]) + 1 || openMonth;
      bracketDepth = 0;
      continue;
    }
    const monthHead = atMargin ? MONTH_HEAD_RE.exec(line) : null;
    const dayHead = !monthHead && atMargin && openMonth ? DAY_HEAD_RE.exec(line) : null;

    if (monthHead) {
      flush();
      sawFirstEntry = true;
      openMonth = MONTHS.indexOf(monthHead[1] as (typeof MONTHS)[number]) + 1;
      current = { month: openMonth, day: Number(monthHead[2]), buf: [monthHead[3] ?? ""] };
    } else if (dayHead && Number(dayHead[1]) >= 1 && Number(dayHead[1]) <= 31) {
      flush();
      current = { month: openMonth!, day: Number(dayHead[1]), buf: [dayHead[2] ?? ""] };
    } else if (current && sawFirstEntry) {
      current.buf.push(line);
    }

    bracketDepth = Math.max(0, bracketDepth + opens - closes);
  }
  flush();

  // Deduplicate on date, keeping the longest text (volumes occasionally repeat
  // a heading in front matter).
  const byDate = new Map<string, ParsedEntry>();
  for (const e of entries) {
    const prev = byDate.get(e.entry_date);
    if (!prev || prev.char_count < e.char_count) byDate.set(e.entry_date, e);
  }
  return [...byDate.values()].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
}
