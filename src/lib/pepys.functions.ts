import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ConsolidateInput = z.object({
  conversationId: z.string().nullable(),
  userMessage: z.string().min(1),
  reply: z.string().min(1),
  visitor: z.string().min(1).max(60),
});

export const consolidate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ConsolidateInput.parse(input))
  .handler(async ({ data }) => {
    const { consolidateExchange } = await import("./consolidate.server");
    return consolidateExchange(data);
  });
