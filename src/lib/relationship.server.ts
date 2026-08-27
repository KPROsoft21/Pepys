import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Per-visitor relationship memory. Global knowledge lives on the subject;
 * whom he is speaking to, and what that person told him privately, lives here
 * and is only ever read back server-side for the owning visitor key.
 */
export async function recordRelationshipTurn(
  admin: SupabaseClient,
  input: {
    subjectId: string;
    visitorKey: string;
    displayName: string;
    topics: string[];
    taughtSomething: boolean;
    unresolvedQuestion: string | null;
  },
) {
  const { data: existing } = await admin
    .from("relationships")
    .select("*")
    .eq("subject_id", input.subjectId)
    .eq("visitor_key", input.visitorKey)
    .is("fork_id", null)
    .maybeSingle();

  const now = new Date().toISOString();
  const topics = Array.from(
    new Set([...(((existing?.topics as string[] | null) ?? []) as string[]), ...input.topics]),
  ).slice(0, 40);
  const unresolved = Array.from(
    new Set(
      [
        ...(((existing?.unresolved_questions as string[] | null) ?? []) as string[]),
        input.unresolvedQuestion,
      ].filter(Boolean) as string[],
    ),
  ).slice(0, 20);

  if (!existing) {
    const { data } = await admin
      .from("relationships")
      .insert({
        subject_id: input.subjectId,
        visitor_key: input.visitorKey,
        display_name: input.displayName,
        interaction_count: 1,
        familiarity: 0.1,
        trust: 0.3,
        warmth: 0.4,
        topics,
        unresolved_questions: unresolved,
        milestones: [{ at: now, what: "first met" }],
        first_seen_at: now,
        last_seen_at: now,
      })
      .select("*")
      .maybeSingle();
    return data;
  }

  const count = (existing.interaction_count as number) + 1;
  const familiarity = Math.min(0.98, 1 - Math.exp(-count / 12));
  const trust = Math.min(0.95, (existing.trust as number) + (input.taughtSomething ? 0.04 : 0.01));
  const warmth = Math.min(0.95, (existing.warmth as number) + 0.01);
  const milestones = [...(((existing.milestones as unknown[] | null) ?? []) as unknown[])];
  if (input.taughtSomething) milestones.push({ at: now, what: "taught him something new" });

  const { data } = await admin
    .from("relationships")
    .update({
      display_name: input.displayName,
      interaction_count: count,
      familiarity,
      trust,
      warmth,
      topics,
      unresolved_questions: unresolved,
      milestones: milestones.slice(-30),
      last_seen_at: now,
    })
    .eq("id", existing.id)
    .select("*")
    .maybeSingle();
  return data;
}

/** "What Pepys remembers about me" — scoped server-side to one visitor key. */
export async function visitorMemoryDossier(
  admin: SupabaseClient,
  subjectId: string,
  visitorKey: string,
) {
  const [{ data: relationship }, { data: memories }, { data: concepts }] = await Promise.all([
    admin
      .from("relationships")
      .select("*")
      .eq("subject_id", subjectId)
      .eq("visitor_key", visitorKey)
      .maybeSingle(),
    admin
      .from("memories")
      .select("id,title,content,visibility,importance,created_at,memory_type")
      .eq("subject_id", subjectId)
      .eq("owner_visitor_key", visitorKey)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("concepts")
      .select("id,name,status,understanding,visibility")
      .eq("subject_id", subjectId)
      .eq("owner_visitor_key", visitorKey)
      .limit(50),
  ]);

  return {
    relationship: relationship ?? null,
    memories: memories ?? [],
    concepts: concepts ?? [],
  };
}

export async function forgetVisitorMemory(
  admin: SupabaseClient,
  subjectId: string,
  visitorKey: string,
  memoryId: string,
) {
  const { data } = await admin
    .from("memories")
    .delete()
    .eq("subject_id", subjectId)
    .eq("owner_visitor_key", visitorKey)
    .eq("id", memoryId)
    .select("id")
    .maybeSingle();
  return { deleted: Boolean(data) };
}
