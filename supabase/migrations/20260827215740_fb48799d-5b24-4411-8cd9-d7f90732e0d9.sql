-- ============ 1. reconstruction state ============
CREATE TABLE public.pepys_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  fork_id uuid NULL REFERENCES public.forks(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'root',
  identity_state text NOT NULL DEFAULT 'identity_unspecified',
  historical_cutoff date NOT NULL DEFAULT '1669-05-31',
  current_simulated_time timestamptz NOT NULL DEFAULT now(),
  emotional_state jsonb NOT NULL DEFAULT '{"mood":0.1,"arousal":0.35,"stress":0.2,"confusion":0.2,"curiosity":0.7,"irritation":0.1,"surprise":0.1}'::jsonb,
  personality_version integer NOT NULL DEFAULT 1,
  self_model jsonb NOT NULL DEFAULT '{}'::jsonb,
  curiosity_budget numeric NOT NULL DEFAULT 1.0,
  corpus_version text NOT NULL DEFAULT 'gutenberg-wheatley-v1',
  memory_version integer NOT NULL DEFAULT 1,
  belief_version integer NOT NULL DEFAULT 1,
  prompt_version text NOT NULL DEFAULT 'ctx-v2',
  model_version text NOT NULL DEFAULT 'openai/gpt-5.6-sol',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pepys_state_root_unique ON public.pepys_state(subject_id) WHERE fork_id IS NULL;
GRANT SELECT ON public.pepys_state TO anon, authenticated;
GRANT ALL ON public.pepys_state TO service_role;
ALTER TABLE public.pepys_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read pepys_state" ON public.pepys_state FOR SELECT TO anon, authenticated USING (true);

-- ============ 2. corpus ============
CREATE TABLE public.diary_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  source_id uuid NULL REFERENCES public.sources(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  date_label text NOT NULL,
  original_text text NOT NULL,
  char_count integer NOT NULL DEFAULT 0,
  derived boolean NOT NULL DEFAULT false,
  corpus_version text NOT NULL DEFAULT 'gutenberg-wheatley-v1',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX diary_entries_unique ON public.diary_entries(subject_id, entry_date, corpus_version);
CREATE INDEX diary_entries_date_idx ON public.diary_entries(entry_date);
GRANT SELECT ON public.diary_entries TO anon, authenticated;
GRANT ALL ON public.diary_entries TO service_role;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read diary_entries" ON public.diary_entries FOR SELECT TO anon, authenticated USING (true);

-- ============ 3. memory upgrade ============
ALTER TABLE public.memories
  ADD COLUMN memory_type text NOT NULL DEFAULT 'episodic',
  ADD COLUMN source_type text NOT NULL DEFAULT 'firsthand_diary',
  ADD COLUMN source_date date NULL,
  ADD COLUMN event_date_start date NULL,
  ADD COLUMN event_date_end date NULL,
  ADD COLUMN certainty numeric NOT NULL DEFAULT 0.7,
  ADD COLUMN importance numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN emotional_salience numeric NOT NULL DEFAULT 0.3,
  ADD COLUMN recall_count integer NOT NULL DEFAULT 0,
  ADD COLUMN last_recalled_at timestamptz NULL,
  ADD COLUMN decay_rate numeric NOT NULL DEFAULT 0.05,
  ADD COLUMN immutable_historical boolean NOT NULL DEFAULT false,
  ADD COLUMN post_cutoff boolean NOT NULL DEFAULT false,
  ADD COLUMN firsthand boolean NOT NULL DEFAULT true,
  ADD COLUMN visibility text NOT NULL DEFAULT 'shared',
  ADD COLUMN owner_user_id uuid NULL,
  ADD COLUMN owner_visitor_key text NULL,
  ADD COLUMN diary_entry_id uuid NULL REFERENCES public.diary_entries(id) ON DELETE SET NULL,
  ADD COLUMN supersedes uuid NULL,
  ADD COLUMN contradicted_by uuid NULL,
  ADD COLUMN people_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN sought_via_question_id uuid NULL,
  ADD COLUMN fork_id uuid NULL REFERENCES public.forks(id) ON DELETE CASCADE;
UPDATE public.memories SET immutable_historical = true, post_cutoff = false WHERE scope = 'original';
UPDATE public.memories SET post_cutoff = true, memory_type = 'learned_post_cutoff', source_type = 'user_taught', firsthand = false WHERE scope <> 'original';
CREATE INDEX memories_retrieval_idx ON public.memories(subject_id, post_cutoff, visibility);
DROP POLICY IF EXISTS "public read memories" ON public.memories;
CREATE POLICY "read shared memories" ON public.memories FOR SELECT TO anon, authenticated
  USING (visibility = 'shared' OR (owner_user_id IS NOT NULL AND owner_user_id = auth.uid()));

-- ============ 4. provenance ============
CREATE TABLE public.provenance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  category text NOT NULL,
  source_id uuid NULL REFERENCES public.sources(id) ON DELETE SET NULL,
  diary_entry_id uuid NULL REFERENCES public.diary_entries(id) ON DELETE SET NULL,
  source_edition text NULL,
  exact_date date NULL,
  interaction_id uuid NULL,
  conversation_id uuid NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
  taught_by text NULL,
  quote text NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX provenance_target_idx ON public.provenance_records(target_type, target_id);
GRANT SELECT ON public.provenance_records TO anon, authenticated;
GRANT ALL ON public.provenance_records TO service_role;
ALTER TABLE public.provenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read provenance" ON public.provenance_records FOR SELECT TO anon, authenticated USING (true);

-- ============ 5. beliefs, history, personality ============
ALTER TABLE public.beliefs
  ADD COLUMN emotional_salience numeric NOT NULL DEFAULT 0.3,
  ADD COLUMN stability numeric NOT NULL DEFAULT 0.6,
  ADD COLUMN contradiction_status text NOT NULL DEFAULT 'none',
  ADD COLUMN supporting_memory_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN counter_memory_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN post_cutoff boolean NOT NULL DEFAULT false,
  ADD COLUMN fork_id uuid NULL REFERENCES public.forks(id) ON DELETE CASCADE;

CREATE TABLE public.belief_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  belief_id uuid NOT NULL REFERENCES public.beliefs(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  confidence_before numeric NULL,
  confidence_after numeric NOT NULL,
  stance_before text NULL,
  stance_after text NOT NULL,
  change_reason text NOT NULL,
  evidence text NULL,
  conversation_id uuid NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.belief_history TO anon, authenticated;
GRANT ALL ON public.belief_history TO service_role;
ALTER TABLE public.belief_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read belief_history" ON public.belief_history FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.personality_traits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  fork_id uuid NULL REFERENCES public.forks(id) ON DELETE CASCADE,
  trait text NOT NULL,
  value numeric NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5,
  evidence_memory_ids uuid[] NOT NULL DEFAULT '{}',
  evidence_note text NULL,
  inferred_from text NOT NULL DEFAULT 'diary evidence',
  period_start date NULL,
  period_end date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.personality_traits TO anon, authenticated;
GRANT ALL ON public.personality_traits TO service_role;
ALTER TABLE public.personality_traits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read personality_traits" ON public.personality_traits FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.emotional_states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  conversation_id uuid NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
  dimensions jsonb NOT NULL,
  trigger text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.emotional_states TO anon, authenticated;
GRANT ALL ON public.emotional_states TO service_role;
ALTER TABLE public.emotional_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read emotional_states" ON public.emotional_states FOR SELECT TO anon, authenticated USING (true);

-- ============ 6. identity + contradictions ============
CREATE TABLE public.identity_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  conversation_id uuid NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
  from_state text NOT NULL,
  to_state text NOT NULL,
  trigger_quote text NULL,
  reaction text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.identity_events TO anon, authenticated;
GRANT ALL ON public.identity_events TO service_role;
ALTER TABLE public.identity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read identity_events" ON public.identity_events FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.contradictions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  conversation_id uuid NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
  held_proposition text NOT NULL,
  new_claim text NOT NULL,
  held_belief_id uuid NULL REFERENCES public.beliefs(id) ON DELETE SET NULL,
  held_memory_id uuid NULL REFERENCES public.memories(id) ON DELETE SET NULL,
  strength numeric NOT NULL DEFAULT 0.5,
  status text NOT NULL DEFAULT 'open',
  resolution text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contradictions TO anon, authenticated;
GRANT ALL ON public.contradictions TO service_role;
ALTER TABLE public.contradictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read contradictions" ON public.contradictions FOR SELECT TO anon, authenticated USING (true);

-- ============ 7. curiosity ============
CREATE TABLE public.curiosity_states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  fork_id uuid NULL REFERENCES public.forks(id) ON DELETE CASCADE,
  target_type text NOT NULL DEFAULT 'concept',
  target_id uuid NULL,
  target_label text NOT NULL,
  novelty numeric NOT NULL DEFAULT 0.5,
  surprise numeric NOT NULL DEFAULT 0.3,
  personal_relevance numeric NOT NULL DEFAULT 0.3,
  emotional_salience numeric NOT NULL DEFAULT 0.3,
  knowledge_gap numeric NOT NULL DEFAULT 0.7,
  uncertainty numeric NOT NULL DEFAULT 0.6,
  contradiction_strength numeric NOT NULL DEFAULT 0,
  goal_relevance numeric NOT NULL DEFAULT 0.2,
  existing_associations text[] NOT NULL DEFAULT '{}',
  curiosity_strength numeric NOT NULL DEFAULT 0.5,
  relevance_basis text NULL,
  questions_generated integer NOT NULL DEFAULT 0,
  questions_answered integer NOT NULL DEFAULT 0,
  exploration_count integer NOT NULL DEFAULT 0,
  last_explored timestamptz NULL,
  resolved boolean NOT NULL DEFAULT false,
  decay_rate numeric NOT NULL DEFAULT 0.08,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX curiosity_states_subject_idx ON public.curiosity_states(subject_id, resolved);
GRANT SELECT ON public.curiosity_states TO anon, authenticated;
GRANT ALL ON public.curiosity_states TO service_role;
ALTER TABLE public.curiosity_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read curiosity_states" ON public.curiosity_states FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.curiosity_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curiosity_id uuid NOT NULL REFERENCES public.curiosity_states(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  conversation_id uuid NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
  question text NOT NULL,
  gap_addressed text NOT NULL,
  grounded_in text NULL,
  expected_information_gain numeric NOT NULL DEFAULT 0.5,
  rank integer NOT NULL DEFAULT 1,
  asked boolean NOT NULL DEFAULT false,
  asked_at timestamptz NULL,
  answered boolean NOT NULL DEFAULT false,
  answer text NULL,
  answered_at timestamptz NULL,
  resulting_memory_id uuid NULL REFERENCES public.memories(id) ON DELETE SET NULL,
  parent_question_id uuid NULL REFERENCES public.curiosity_questions(id) ON DELETE SET NULL,
  depth integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.curiosity_questions TO anon, authenticated;
GRANT ALL ON public.curiosity_questions TO service_role;
ALTER TABLE public.curiosity_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read curiosity_questions" ON public.curiosity_questions FOR SELECT TO anon, authenticated USING (true);

-- ============ 8. interactions + relationships ============
CREATE TABLE public.interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  conversation_id uuid NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
  user_id uuid NULL,
  visitor_key text NULL,
  user_message text NOT NULL,
  subject_response text NULL,
  teaching_mode boolean NOT NULL DEFAULT false,
  retrieved_memory_ids uuid[] NOT NULL DEFAULT '{}',
  retrieved_belief_ids uuid[] NOT NULL DEFAULT '{}',
  denied_count integer NOT NULL DEFAULT 0,
  asked_question_id uuid NULL REFERENCES public.curiosity_questions(id) ON DELETE SET NULL,
  emotional_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text NULL,
  prompt_version text NULL,
  cutoff date NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX interactions_visitor_idx ON public.interactions(visitor_key);
GRANT SELECT ON public.interactions TO anon, authenticated;
GRANT ALL ON public.interactions TO service_role;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own interactions" ON public.interactions FOR SELECT TO anon, authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE TABLE public.relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  fork_id uuid NULL REFERENCES public.forks(id) ON DELETE CASCADE,
  user_id uuid NULL,
  visitor_key text NOT NULL,
  display_name text NULL,
  trust numeric NOT NULL DEFAULT 0.4,
  familiarity numeric NOT NULL DEFAULT 0.05,
  warmth numeric NOT NULL DEFAULT 0.2,
  interaction_count integer NOT NULL DEFAULT 0,
  topics text[] NOT NULL DEFAULT '{}',
  emotional_associations text[] NOT NULL DEFAULT '{}',
  unresolved_questions text[] NOT NULL DEFAULT '{}',
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX relationships_visitor_unique ON public.relationships(subject_id, visitor_key);
GRANT SELECT ON public.relationships TO anon, authenticated;
GRANT ALL ON public.relationships TO service_role;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own relationship" ON public.relationships FOR SELECT TO anon, authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

-- ============ 9. research ============
CREATE TABLE public.leakage_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  interaction_id uuid NULL REFERENCES public.interactions(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  response text NOT NULL,
  cutoff date NOT NULL,
  detected_concept text NOT NULL,
  detector text NOT NULL DEFAULT 'lexical-v1',
  severity text NOT NULL DEFAULT 'warning',
  model_version text NULL,
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leakage_events TO anon, authenticated;
GRANT ALL ON public.leakage_events TO service_role;
ALTER TABLE public.leakage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read leakage_events" ON public.leakage_events FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.access_denials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  interaction_id uuid NULL REFERENCES public.interactions(id) ON DELETE SET NULL,
  requested text NOT NULL,
  reason text NOT NULL,
  cutoff date NOT NULL,
  blocked_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.access_denials TO anon, authenticated;
GRANT ALL ON public.access_denials TO service_role;
ALTER TABLE public.access_denials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read access_denials" ON public.access_denials FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.evaluation_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  fork_id uuid NULL REFERENCES public.forks(id) ON DELETE CASCADE,
  kind text NOT NULL,
  cutoff date NOT NULL,
  status text NOT NULL DEFAULT 'running',
  model_version text NULL,
  prompt_version text NULL,
  corpus_version text NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);
GRANT SELECT ON public.evaluation_runs TO anon, authenticated;
GRANT ALL ON public.evaluation_runs TO service_role;
ALTER TABLE public.evaluation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read evaluation_runs" ON public.evaluation_runs FOR SELECT TO anon, authenticated USING (true);

-- ============ 10. concepts + forks extensions ============
ALTER TABLE public.concepts
  ADD COLUMN first_exposure_at timestamptz NULL,
  ADD COLUMN explanation text NULL,
  ADD COLUMN confidence numeric NOT NULL DEFAULT 0.4,
  ADD COLUMN related_concept_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN post_cutoff boolean NOT NULL DEFAULT true,
  ADD COLUMN visibility text NOT NULL DEFAULT 'shared',
  ADD COLUMN owner_visitor_key text NULL,
  ADD COLUMN fork_id uuid NULL REFERENCES public.forks(id) ON DELETE CASCADE;

ALTER TABLE public.forks
  ADD COLUMN kind text NOT NULL DEFAULT 'counterfactual',
  ADD COLUMN parent_state_id uuid NULL REFERENCES public.pepys_state(id) ON DELETE SET NULL,
  ADD COLUMN cutoff date NULL,
  ADD COLUMN condition text NULL;

ALTER TABLE public.life_events
  ADD COLUMN event_date date NULL,
  ADD COLUMN diary_entry_id uuid NULL REFERENCES public.diary_entries(id) ON DELETE SET NULL;

-- ============ 11. seed the root state ============
INSERT INTO public.pepys_state (subject_id, label, identity_state, historical_cutoff, self_model)
SELECT s.id, 'root', CASE WHEN s.reveal_status = 'revealed' THEN 'revealed_as_reconstruction' ELSE 'identity_unspecified' END,
       make_date(s.cutoff_year, 5, 31),
       jsonb_build_object('name', s.name, 'occupation', 'Clerk of the Acts to the Navy Board', 'city', 'London')
FROM public.subjects s;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER pepys_state_touch BEFORE UPDATE ON public.pepys_state FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER curiosity_states_touch BEFORE UPDATE ON public.curiosity_states FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER contradictions_touch BEFORE UPDATE ON public.contradictions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER personality_traits_touch BEFORE UPDATE ON public.personality_traits FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();