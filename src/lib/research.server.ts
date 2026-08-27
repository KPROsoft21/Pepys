import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { setActiveCutoff } from "./access.server";
import { derivePersonality } from "./personality.server";
import {
  forgetVisitorMemory,
  visitorMemoryDossier,
} from "./relationship.server";
import { SUBJECT_SLUG } from "./subject.server";

async function subjectId(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("subjects")
    .select("id")
    .eq("slug", SUBJECT_SLUG)
    .single();
  if (!data) throw new Error("Subject not found");
  return data.id;
}

export async function applyCutoff(cutoff: string, label: string) {
  return setActiveCutoff(supabaseAdmin, await subjectId(), cutoff, label);
}

export async function runPersonalityDerivation() {
  return derivePersonality(supabaseAdmin, await subjectId());
}

export async function readVisitorMemory(visitorKey: string) {
  return visitorMemoryDossier(supabaseAdmin, await subjectId(), visitorKey);
}

export async function deleteVisitorMemory(visitorKey: string, memoryId: string) {
  return forgetVisitorMemory(supabaseAdmin, await subjectId(), visitorKey, memoryId);
}
