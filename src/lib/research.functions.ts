import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CutoffInput = z.object({
  cutoff: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().min(1).max(60),
});

const VisitorInput = z.object({ visitorKey: z.string().min(4).max(80) });

const ForgetInput = z.object({
  visitorKey: z.string().min(4).max(80),
  memoryId: z.string().uuid(),
});

export const setCutoff = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CutoffInput.parse(input))
  .handler(async ({ data }) => {
    const { applyCutoff } = await import("./research.server");
    return applyCutoff(data.cutoff, data.label);
  });

export const rebuildPersonality = createServerFn({ method: "POST" }).handler(async () => {
  const { runPersonalityDerivation } = await import("./research.server");
  return runPersonalityDerivation();
});

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
