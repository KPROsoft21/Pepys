ALTER TABLE public.diary_entries
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', original_text)) STORED;

CREATE INDEX IF NOT EXISTS diary_entries_search_idx ON public.diary_entries USING gin (search_tsv);

CREATE OR REPLACE FUNCTION public.search_diary_entries(
  _subject_id uuid,
  _query text,
  _cutoff date,
  _limit integer DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  entry_date date,
  date_label text,
  original_text text,
  relevance real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id,
         d.entry_date,
         d.date_label,
         d.original_text,
         ts_rank(d.search_tsv, websearch_to_tsquery('english', _query))::real AS relevance
  FROM public.diary_entries d
  WHERE d.subject_id = _subject_id
    AND d.entry_date <= _cutoff
    AND d.search_tsv @@ websearch_to_tsquery('english', _query)
  ORDER BY ts_rank(d.search_tsv, websearch_to_tsquery('english', _query)) DESC, d.entry_date DESC
  LIMIT LEAST(GREATEST(_limit, 1), 25)
$$;

GRANT EXECUTE ON FUNCTION public.search_diary_entries(uuid, text, date, integer) TO anon, authenticated, service_role;