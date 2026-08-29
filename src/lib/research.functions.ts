import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CutoffInput = z.object({
  cutoff: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().min(1).max(60),
});

const VisitorInput = z.object({ visitorKey: z.string().min(4).max(80) });

const ForgetInput = z.object({
  visitorKey: z.string().min(4).max(80),
  memoryId: z.string().uuid(),
});

// Experiment-wide controls: only a signed-in researcher may move the
// historical cutoff or re-derive personality.
export const setCutoff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CutoffInput.parse(input))
  .handler(async ({ data }) => {
    const { applyCutoff } = await import("./research.server");
    return applyCutoff(data.cutoff, data.label);
  });

export const rebuildPersonality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { runPersonalityDerivation } = await import("./research.server");
    return runPersonalityDerivation();
  });

// Visitor-scoped: the anonymous visitor key is the bearer of its own private
// memories, so these stay reachable without a researcher account.
export const visitorMemory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => VisitorInput.parse(input))
  .handler(async ({ data }) => {
    const { readVisitorMemory } = await import("./research.server");
    return readVisitorMemory(data.visitorKey);
  });

export const forgetMemory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ForgetInput.parse(input))
  .handler(async ({ data }) => {
    const { deleteVisitorMemory } = await import("./research.server");
    return deleteVisitorMemory(data.visitorKey, data.memoryId);
  });
