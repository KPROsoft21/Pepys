import { supabase } from "@/integrations/supabase/client";

import { publicCounts } from "./counts.functions";

import {
  SUBJECT_SLUG,
  type Belief,
  type Concept,
  type Fork,
  type ForkEvent,
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
        publicCounts({ data: { subjectId: id } }),
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
      messageCount: messages.messages,
    };
  },
};

export const forksQuery = {
  queryKey: ["forks"],
  queryFn: async (): Promise<{ forks: Fork[]; events: ForkEvent[] }> => {
    const { data: forks, error } = await supabase
      .from("forks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (forks ?? []).map((f) => f.id);
    if (!ids.length) return { forks: [], events: [] };
    const { data: events } = await supabase
      .from("fork_events")
      .select("*")
      .in("fork_id", ids)
      .order("year");
    return { forks: (forks ?? []) as Fork[], events: (events ?? []) as ForkEvent[] };
  },
};

export type CuriosityState = {
  id: string;
  target_label: string;
  target_type: string;
  curiosity_strength: number;
  personal_relevance: number;
  knowledge_gap: number;
  novelty: number;
  surprise: number;
  contradiction_strength: number;
  relevance_basis: string | null;
  questions_generated: number;
  questions_answered: number;
  exploration_count: number;
  resolved: boolean;
  updated_at: string;
};

export type CuriosityQuestion = {
  id: string;
  curiosity_id: string;
  question: string;
  gap_addressed: string | null;
  grounded_in: string | null;
  expected_information_gain: number;
  asked: boolean;
  answered: boolean;
  answer: string | null;
  depth: number;
  created_at: string;
};

export const curiosityQuery = {
  queryKey: ["curiosity"],
  queryFn: async (): Promise<{ states: CuriosityState[]; questions: CuriosityQuestion[] }> => {
    const { data: subject } = await supabase
      .from("subjects")
      .select("id")
      .eq("slug", SUBJECT_SLUG)
      .single();
    if (!subject) return { states: [], questions: [] };
    const [states, questions] = await Promise.all([
      supabase
        .from("curiosity_states")
        .select("*")
        .eq("subject_id", subject.id)
        .order("curiosity_strength", { ascending: false }),
      supabase
        .from("curiosity_questions")
        .select("*")
        .eq("subject_id", subject.id)
        .order("created_at", { ascending: false })
        .limit(80),
    ]);
    return {
      states: (states.data ?? []) as CuriosityState[],
      questions: (questions.data ?? []) as CuriosityQuestion[],
    };
  },
};

export type Instrumentation = {
  state: {
    label: string | null;
    historical_cutoff: string;
    identity_state: string;
    current_simulated_time: string | null;
  } | null;
  denials: {
    id: string;
    requested: string;
    reason: string;
    cutoff: string;
    blocked_count: number;
    created_at: string;
  }[];
  leaks: {
    id: string;
    detected_concept: string;
    response: string;
    severity: string;
    cutoff: string;
    created_at: string;
  }[];
  revisions: {
    id: string;
    confidence_before: number | null;
    confidence_after: number;
    stance_before: string | null;
    stance_after: string;
    change_reason: string;
    evidence: string | null;
    created_at: string;
    beliefs: { proposition: string } | null;
  }[];
  traits: {
    id: string;
    trait: string;
    value: number;
    confidence: number;
    evidence_note: string | null;
    period_start: string | null;
    period_end: string | null;
  }[];
  emotion: { dimensions: Record<string, number>; trigger: string | null; created_at: string } | null;
  contradictions: {
    id: string;
    held_proposition: string;
    new_claim: string;
    strength: number;
    status: string;
    resolution: string | null;
    created_at: string;
  }[];
  counts: {
    interactions: number;
    diaryEntries: number;
    visitors: number;
    provenance: number;
  };
};

export const instrumentationQuery = {
  queryKey: ["instrumentation"],
  queryFn: async (): Promise<Instrumentation> => {
    const { data: subject } = await supabase
      .from("subjects")
      .select("id")
      .eq("slug", SUBJECT_SLUG)
      .single();
    if (!subject) throw new Error("Subject not found");
    const id = subject.id;

    const [
      state,
      denials,
      leaks,
      revisions,
      traits,
      emotion,
      contradictions,
      entries,
      provenance,
      counts,
    ] = await Promise.all([
      supabase
        .from("pepys_state")
        .select("label,historical_cutoff,identity_state,current_simulated_time")
        .eq("subject_id", id)
        .is("fork_id", null)
        .maybeSingle(),
      supabase
        .from("access_denials")
        .select("id,requested,reason,cutoff,blocked_count,created_at")
        .eq("subject_id", id)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("leakage_events")
        .select("id,detected_concept,response,severity,cutoff,created_at")
        .eq("subject_id", id)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("belief_history")
        .select(
          "id,confidence_before,confidence_after,stance_before,stance_after,change_reason,evidence,created_at,beliefs(proposition)",
        )
        .eq("subject_id", id)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("personality_traits")
        .select("id,trait,value,confidence,evidence_note,period_start,period_end")
        .eq("subject_id", id)
        .order("value", { ascending: false }),
      supabase
        .from("emotional_states")
        .select("dimensions,trigger,created_at")
        .eq("subject_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("contradictions")
        .select("id,held_proposition,new_claim,strength,status,resolution,created_at")
        .eq("subject_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("diary_entries")
        .select("id", { count: "exact", head: true })
        .eq("subject_id", id),
      supabase
        .from("provenance_records")
        .select("id", { count: "exact", head: true })
        .eq("subject_id", id),
      publicCounts({ data: { subjectId: id } }),
    ]);

    return {
      state: (state.data ?? null) as Instrumentation["state"],
      denials: (denials.data ?? []) as Instrumentation["denials"],
      leaks: (leaks.data ?? []) as Instrumentation["leaks"],
      revisions: (revisions.data ?? []) as unknown as Instrumentation["revisions"],
      traits: (traits.data ?? []) as Instrumentation["traits"],
      emotion: (emotion.data ?? null) as Instrumentation["emotion"],
      contradictions: (contradictions.data ?? []) as Instrumentation["contradictions"],
      counts: {
        interactions: counts.interactions,
        diaryEntries: entries.count ?? 0,
        visitors: counts.visitors,
        provenance: provenance.count ?? 0,
      },
    };
  },
};
