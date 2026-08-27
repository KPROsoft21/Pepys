-- Forked lives: counterfactual branches of the reconstruction's biography.

CREATE TABLE public.forks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  label text NOT NULL,
  premise text NOT NULL,
  divergence_year integer NOT NULL,
  divergence_label text,
  summary text,
  self_account text,
  confidence numeric NOT NULL DEFAULT 0.5,
  status text NOT NULL DEFAULT 'complete',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fork_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fork_id uuid NOT NULL REFERENCES public.forks(id) ON DELETE CASCADE,
  year integer NOT NULL,
  date_label text,
  title text NOT NULL,
  description text,
  divergence text NOT NULL DEFAULT 'changed',
  confidence numeric NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX forks_subject_idx ON public.forks (subject_id, created_at DESC);
CREATE INDEX fork_events_fork_idx ON public.fork_events (fork_id, year);

GRANT SELECT, INSERT ON public.forks, public.fork_events TO anon, authenticated;
GRANT ALL ON public.forks, public.fork_events TO service_role;

ALTER TABLE public.forks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fork_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read forks" ON public.forks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read fork_events" ON public.fork_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can propose a fork" ON public.forks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can add fork events" ON public.fork_events FOR INSERT TO anon, authenticated WITH CHECK (true);
