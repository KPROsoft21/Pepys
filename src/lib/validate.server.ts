import type { SupabaseClient } from "@supabase/supabase-js";

import { detectAnachronisms, type LeakFinding } from "./firewall";

/**
 * Output validator.
 *
 * The context pipeline is the only legitimate route by which post-cutoff
 * knowledge can reach the reconstruction, so any post-cutoff vocabulary in a
 * reply that was neither taught nor uttered by the visitor is a leak from the
 * underlying language model. We record it rather than hide it: a measured
 * leakage rate is a research result.
 */
export async function validateReply(
  admin: SupabaseClient,
  input: {
    subjectId: string;
    interactionId: string | null;
    visitorMessage: string;
    reply: string;
    cutoff: string;
    modelVersion: string;
  },
): Promise<LeakFinding[]> {
  const [{ data: concepts }, { data: memories }] = await Promise.all([
    admin
      .from("concepts")
      .select("name,status")
      .eq("subject_id", input.subjectId)
      .neq("status", "unknown"),
    admin
      .from("memories")
      .select("title")
      .eq("subject_id", input.subjectId)
      .neq("scope", "original")
      .limit(200),
  ]);

  // Anything the visitor just said is fair game for him to repeat back.
  const allowed = [
    ...(concepts ?? []).map((c) => c.name as string),
    ...(memories ?? []).map((m) => m.title as string),
    ...input.visitorMessage.toLowerCase().split(/[^a-z' ]+/),
  ].filter(Boolean);

  const findings = detectAnachronisms(input.reply, allowed);
  if (!findings.length) return [];

  await admin.from("leakage_events").insert(
    findings.map((f) => ({
      subject_id: input.subjectId,
      interaction_id: input.interactionId,
      prompt: input.visitorMessage.slice(0, 500),
      response: f.excerpt.slice(0, 500),
      cutoff: input.cutoff,
      detected_concept: f.term,
      detector: "lexicon-v1",
      severity: "warning",
      model_version: input.modelVersion,
    })),
  );

  return findings;
}
