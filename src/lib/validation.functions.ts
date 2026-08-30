import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SuiteInput = z.object({
  suite: z.enum([
    "complete",
    "golden",
    "memory",
    "curiosity",
    "firewall",
    "privacy",
    "fork",
    "negative",
  ]),
});

const RunInput = z.object({ runId: z.string().uuid().nullable() });

/** Executes a validation suite against the live cognitive services. */
export const startValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SuiteInput.parse(input))
  .handler(async ({ data }) => {
    const { runValidationSuite } = await import("./validation.server");
    return runValidationSuite(data.suite);
  });

export const validationReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ data }) => {
    const { readRun } = await import("./validation.server");
    return readRun(data.runId);
  });

export const validationHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { listRuns } = await import("./validation.server");
    return listRuns();
  });
