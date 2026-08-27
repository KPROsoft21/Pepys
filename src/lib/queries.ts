import { supabase } from "@/integrations/supabase/client";

import {
  SUBJECT_SLUG,
  type Belief,
  type Concept,
  type LearningEntry,
  type LifeEvent,
  type Memory,
  type Person,
  type SourceRecord,
  type Subject,
} from "./pepys";

export type Dossier = {
  subject: Subject;
  events: LifeEvent[];
  people: Person[];
  memories: Memory[];
  beliefs: Belief[];
  concepts: Concept[];
  sources: SourceRecord[];
  log: LearningEntry[];
  messageCount: number;
};

export const dossierQuery = {
  queryKey: ["dossier"],
  queryFn: async (): Promise<Dossier> => {
    const { data: subject, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("slug", SUBJECT_SLUG)
      .single();
    if (error || !subject) throw new Error(error?.message ?? "Subject not found");

    const id = subject.id;
    const [events, people, memories, beliefs, concepts, sources, log, messages] =
      await Promise.all([
        supabase.from("life_events").select("*").eq("subject_id", id).order("year"),
        supabase.from("people").select("*").eq("subject_id", id).order("confidence", {
          ascending: false,
        }),
        supabase
          .from("memories")
          .select("*")
          .eq("subject_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("beliefs")
          .select("*")
          .eq("subject_id", id)
          .order("confidence", { ascending: false }),
        supabase.from("concepts").select("*").eq("subject_id", id).order("name"),
        supabase.from("sources").select("*").eq("subject_id", id).order("tier"),
        supabase
          .from("learning_log")
          .select("*")
          .eq("subject_id", id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ]);

    return {
      subject: subject as Subject,
      events: (events.data ?? []) as LifeEvent[],
      people: (people.data ?? []) as Person[],
      memories: (memories.data ?? []) as Memory[],
      beliefs: (beliefs.data ?? []) as Belief[],
      concepts: (concepts.data ?? []) as Concept[],
      sources: (sources.data ?? []) as SourceRecord[],
      log: (log.data ?? []) as LearningEntry[],
      messageCount: messages.count ?? 0,
    };
  },
};
