import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ConsolidateInput = z.object({
  conversationId: z.string().nullable(),
  userMessage: z.string().min(1),
  reply: z.string().min(1),
  visitor: z.string().min(1).max(60),
});

const RevealInput = z.object({ revealed: z.boolean() });

export const consolidate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ConsolidateInput.parse(input))
  .handler(async ({ data }) => {
    const { consolidateExchange } = await import("./consolidate.server");
    return consolidateExchange(data);
  });

export const setRevealStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RevealInput.parse(input))
  .handler(async ({ data }) => {
    const { applyRevealStatus } = await import("./consolidate.server");
    return applyRevealStatus(data.revealed);
  });
