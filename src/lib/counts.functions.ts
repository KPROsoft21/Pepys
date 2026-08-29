import { createServerFn } from "@tanstack/react-start";

/**
 * Aggregate-only counters. Visitor conversation rows are not publicly readable,
 * so totals shown in the Life Book and Research Mode are computed server-side
 * and only the numbers are returned — never any transcript content.
 */
export const publicCounts = createServerFn({ method: "GET" })
  .inputValidator((data: { subjectId: string }) => ({
    subjectId: String(data?.subjectId ?? ""),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [messages, interactions, visitors] = await Promise.all([
      supabaseAdmin.from("messages").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("interactions")
        .select("id", { count: "exact", head: true })
        .eq("subject_id", data.subjectId),
      supabaseAdmin
        .from("relationships")
        .select("id", { count: "exact", head: true })
        .eq("subject_id", data.subjectId),
    ]);
    return {
      messages: messages.count ?? 0,
      interactions: interactions.count ?? 0,
      visitors: visitors.count ?? 0,
    };
  });
