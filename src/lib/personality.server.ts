import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Evidence-backed personality derivation.
 *
 * These are computational approximations, not measurements: each trait is a
 * normalised rate at which its markers appear in Pepys's own recorded material,
 * carried with the evidence note that produced it. Nothing is hand-authored.
 */
const TRAIT_MARKERS: Record<string, string[]> = {
  curiosity: ["read", "learn", "observ", "experiment", "royal society", "microscop", "study"],
  sociability: ["dined", "supper", "company", "tavern", "friend", "merry", "visit"],
  ambition: ["office", "advance", "clerk", "preferment", "duke", "king", "place", "secretary"],
  "status sensitivity": ["my lord", "coach", "periwig", "gown", "honour", "esteem", "reputation"],
  frugality: ["worth", "£", "accounts", "spent", "cost", "money", "reckon"],
  "novelty seeking": ["new", "first time", "strange", "curious", "invention", "never before"],
  conscientiousness: ["early", "betimes", "business", "duty", "resolv", "vow", "diligen"],
  "emotional reactivity": ["angry", "vexed", "afeard", "troubled", "wept", "joy", "grief"],
  affection: ["my wife", "elisabeth", "love", "kiss", "dear", "tender"],
  "risk tolerance": ["venture", "plague", "fire", "danger", "sea", "storm", "hazard"],
};

type Corpus = { text: string; memoryId: string | null };

export async function derivePersonality(admin: SupabaseClient, subjectId: string) {
  const [{ data: memories }, { data: events }, { data: entries }] = await Promise.all([
    admin
      .from("memories")
      .select("id,title,content")
      .eq("subject_id", subjectId)
      .eq("scope", "original"),
    admin.from("life_events").select("title,description").eq("subject_id", subjectId),
    admin
      .from("diary_entries")
      .select("original_text,entry_date")
      .eq("subject_id", subjectId)
      .order("entry_date")
      .limit(400),
  ]);

  const corpus: Corpus[] = [
    ...(memories ?? []).map((m) => ({
      text: `${m.title} ${m.content}`.toLowerCase(),
      memoryId: m.id as string,
    })),
    ...(events ?? []).map((e) => ({
      text: `${e.title} ${e.description ?? ""}`.toLowerCase(),
      memoryId: null,
    })),
    ...(entries ?? []).map((e) => ({
      text: String(e.original_text).toLowerCase(),
      memoryId: null,
    })),
  ];
  if (!corpus.length) return { traits: 0 };

  const totalChars = corpus.reduce((n, c) => n + c.text.length, 0);
  const rows: Record<string, unknown>[] = [];

  for (const [trait, markers] of Object.entries(TRAIT_MARKERS)) {
    let hits = 0;
    const evidenceIds: string[] = [];
    const seenMarkers: string[] = [];
    for (const item of corpus) {
      let itemHits = 0;
      for (const marker of markers) {
        const found = item.text.split(marker).length - 1;
        if (found > 0) {
          itemHits += found;
          if (!seenMarkers.includes(marker)) seenMarkers.push(marker);
        }
      }
      if (itemHits && item.memoryId && evidenceIds.length < 8) evidenceIds.push(item.memoryId);
      hits += itemHits;
    }
    // Markers per 10k characters, squashed into 0..1.
    const rate = (hits / Math.max(1, totalChars)) * 10000;
    const value = Math.min(0.98, Math.round((1 - Math.exp(-rate / 4)) * 100) / 100);
    rows.push({
      subject_id: subjectId,
      trait,
      value,
      confidence: Math.min(0.9, Math.round((hits / (hits + 25)) * 100) / 100),
      evidence_memory_ids: evidenceIds,
      evidence_note: `${hits} marker occurrences across ${corpus.length} first-person records (${seenMarkers.slice(0, 5).join(", ")})`,
      inferred_from: "corpus-marker-rate-v1",
      period_start: "1660-01-01",
      period_end: "1669-05-31",
      updated_at: new Date().toISOString(),
    });
  }

  for (const row of rows) {
    const { data: existing } = await admin
      .from("personality_traits")
      .select("id")
      .eq("subject_id", subjectId)
      .eq("trait", row["trait"] as string)
      .is("fork_id", null)
      .maybeSingle();
    if (existing) await admin.from("personality_traits").update(row).eq("id", existing.id);
    else await admin.from("personality_traits").insert(row);
  }

  return { traits: rows.length };
}
