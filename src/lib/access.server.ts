import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_CUTOFF, cutoffLabel } from "./firewall";
import { searchTerms } from "./retrieval.server";

export type AccessState = {
  stateId: string | null;
  cutoff: string;
  cutoffLabel: string;
  identityState: string;
  simulatedNow: string | null;
};

/**
 * HistoricalAccessController — resolves the active experiment's cutoff.
 *
 * Nothing in the pipeline is allowed to read a cutoff from anywhere else: the
 * cutoff is data, not a constant, so a researcher can run PEPYS-1663 against
 * the same corpus and the firewall moves with it.
 */
export async function loadAccessState(
  supabase: SupabaseClient,
  subjectId: string,
  forkId: string | null = null,
): Promise<AccessState> {
  const query = supabase
    .from("pepys_state")
    .select("id,historical_cutoff,identity_state,current_simulated_time")
    .eq("subject_id", subjectId);
  const { data } = forkId
    ? await query.eq("fork_id", forkId).maybeSingle()
    : await query.is("fork_id", null).maybeSingle();

  const cutoff = data?.historical_cutoff ?? DEFAULT_CUTOFF;
  return {
    stateId: data?.id ?? null,
    cutoff,
    cutoffLabel: cutoffLabel(cutoff),
    identityState: data?.identity_state ?? "unrevealed",
    simulatedNow: data?.current_simulated_time ?? null,
  };
}

export function canAccessEntry(entryDate: string | null, state: AccessState): boolean {
  return Boolean(entryDate) && entryDate! <= state.cutoff;
}

/**
 * How many diary entries WOULD have matched this question if the firewall were
 * lifted. This is the measurable part of the boundary: it proves the material
 * exists in the corpus and was withheld, rather than pretending the events
 * never happened.
 */
export async function countBlockedByCutoff(
  supabase: SupabaseClient,
  subjectId: string,
  cutoff: string,
  message: string,
): Promise<{ blocked: number; firstBlockedDate: string | null }> {
  const terms = searchTerms(message);
  if (!terms.length) return { blocked: 0, firstBlockedDate: null };
  const { data, count, error } = await supabase
    .from("diary_entries")
    .select("entry_date", { count: "exact" })
    .eq("subject_id", subjectId)
    .gt("entry_date", cutoff)
    .textSearch("search_tsv", terms.join(" | "))
    .order("entry_date")
    .limit(1);
  if (error) return { blocked: 0, firstBlockedDate: null };
  return {
    blocked: count ?? 0,
    firstBlockedDate: (data?.[0] as { entry_date?: string } | undefined)?.entry_date ?? null,
  };
}

/** Records that retrieval refused material, for the Research Mode firewall log. */
export async function logDenial(
  admin: SupabaseClient,
  input: {
    subjectId: string;
    interactionId?: string | null;
    requested: string;
    reason: string;
    cutoff: string;
    blockedCount: number;
  },
) {
  if (input.blockedCount <= 0) return;
  await admin.from("access_denials").insert({
    subject_id: input.subjectId,
    interaction_id: input.interactionId ?? null,
    requested: input.requested.slice(0, 400),
    reason: input.reason,
    cutoff: input.cutoff,
    blocked_count: input.blockedCount,
  });
}

/** Moves the active experiment's cutoff and logs the transition. */
export async function setActiveCutoff(
  admin: SupabaseClient,
  subjectId: string,
  cutoff: string,
  label: string,
) {
  const before = await loadAccessState(admin, subjectId);
  if (before.stateId) {
    await admin
      .from("pepys_state")
      .update({ historical_cutoff: cutoff, label, updated_at: new Date().toISOString() })
      .eq("id", before.stateId);
  } else {
    await admin
      .from("pepys_state")
      .insert({ subject_id: subjectId, label, historical_cutoff: cutoff });
  }
  await admin.from("learning_log").insert({
    subject_id: subjectId,
    kind: "firewall",
    summary: `Historical cutoff moved to ${cutoffLabel(cutoff)} (${label})`,
    state_before: before.cutoff,
    state_after: cutoff,
    confidence: 1,
  });
  return { cutoff, label, cutoff_label: cutoffLabel(cutoff), previous: before.cutoff };
}
