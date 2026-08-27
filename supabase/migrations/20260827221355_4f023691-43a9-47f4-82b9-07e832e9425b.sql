CREATE OR REPLACE FUNCTION public.pending_embedding_entries(_limit integer DEFAULT 12)
RETURNS TABLE (
  id uuid,
  subject_id uuid,
  entry_date date,
  date_label text,
  original_text text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT e.id, e.subject_id, e.entry_date, e.date_label, e.original_text
  FROM public.diary_entries e
  WHERE NOT EXISTS (SELECT 1 FROM public.diary_chunks c WHERE c.entry_id = e.id)
  ORDER BY e.entry_date
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.count_pending_embedding_entries()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.diary_entries e
  WHERE NOT EXISTS (SELECT 1 FROM public.diary_chunks c WHERE c.entry_id = e.id);
$$;

CREATE OR REPLACE FUNCTION public.count_embedded_entries()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(DISTINCT c.entry_id)::integer FROM public.diary_chunks c;
$$;