import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ForkInput = z.object({
  premise: z.string().min(8).max(400),
  visitor: z.string().min(1).max(60),
});

export const forkLife = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ForkInput.parse(input))
  .handler(async ({ data }) => {
    const { createForkedLife } = await import("./forks.server");
    return createForkedLife(data);
  });
