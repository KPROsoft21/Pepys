import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { CorpusStatus, IngestResult } from "./corpus.server";

const YearInput = z.object({ year: z.number().int().min(1660).max(1669) });

export const getCorpusStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<CorpusStatus> => {
    const { corpusStatus } = await import("./corpus.server");
    const { serverSupabase } = await import("./subject.server");
    return corpusStatus(serverSupabase());
  },
);

export const ingestCorpusYear = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => YearInput.parse(input))
  .handler(async ({ data }): Promise<IngestResult> => {
    const { ingestYear } = await import("./corpus.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return ingestYear(supabaseAdmin, data.year);
  });

export const getEmbeddingStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { embeddingStatus } = await import("./embeddings.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return embeddingStatus(supabaseAdmin);
});

export const embedCorpusBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ entries: z.number().int().min(1).max(40).default(12) }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { embedNextEntries } = await import("./embeddings.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return embedNextEntries(supabaseAdmin, data.entries);
  });
