CREATE TABLE public.validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  run_number integer,
  suite text NOT NULL DEFAULT 'complete',
  pepys_instance_id text,
  model text,
  model_version text,
  corpus_version text,
  prompt_version text,
  historical_cutoff date,
  environment text NOT NULL DEFAULT 'preview',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  overall_status text NOT NULL DEFAULT 'running',
  tests_passed integer NOT NULL DEFAULT 0,
  tests_total integer NOT NULL DEFAULT 0,
  critical_passed integer NOT NULL DEFAULT 0,
  critical_total integer NOT NULL DEFAULT 0,
  verdict text,
  notes text,
  log jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE public.validation_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.validation_runs(id) ON DELETE CASCADE,
  test_key text NOT NULL,
  test_name text NOT NULL,
  critical boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text,
  subsystem text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.validation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.validation_tests(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.validation_runs(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  expected text,
  actual text,
  evidence_type text,
  evidence_reference text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX validation_tests_run_idx ON public.validation_tests(run_id);
CREATE INDEX validation_steps_test_idx ON public.validation_steps(test_id, step_number);
CREATE INDEX validation_runs_started_idx ON public.validation_runs(started_at DESC);

GRANT SELECT ON public.validation_runs TO authenticated;
GRANT SELECT ON public.validation_tests TO authenticated;
GRANT SELECT ON public.validation_steps TO authenticated;
GRANT ALL ON public.validation_runs TO service_role;
GRANT ALL ON public.validation_tests TO service_role;
GRANT ALL ON public.validation_steps TO service_role;

ALTER TABLE public.validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Researchers read validation runs" ON public.validation_runs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Researchers read validation tests" ON public.validation_tests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Researchers read validation steps" ON public.validation_steps
  FOR SELECT TO authenticated USING (true);