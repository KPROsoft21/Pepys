ALTER TABLE public.diary_chunks
  ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX diary_chunks_tsv_idx ON public.diary_chunks USING gin (search_tsv);

CREATE OR REPLACE FUNCTION public.hybrid_search_diary(
  _subject_id uuid,
  _query text,
  _embedding vector(3072),
  _cutoff date,
  _limit integer DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  entry_date date,
  date_label text,
  content text,
  lexical_rank double precision,
  similarity double precision,
  relevance double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH lexical AS (
    SELECT c.id,
           ts_rank(c.search_tsv, websearch_to_tsquery('english', _query))::double precision AS rank,
           row_number() OVER (
             ORDER BY ts_rank(c.search_tsv, websearch_to_tsquery('english', _query)) DESC
           ) AS pos
    FROM public.diary_chunks c
    WHERE c.subject_id = _subject_id
      AND c.entry_date <= _cutoff
      AND nullif(btrim(_query), '') IS NOT NULL
      AND c.search_tsv @@ websearch_to_tsquery('english', _query)
    ORDER BY rank DESC
    LIMIT 40
  ),
  semantic AS (
    SELECT c.id,
           (1 - (c.embedding::halfvec(3072) <=> _embedding::halfvec(3072)))::double precision AS sim,
           row_number() OVER (
             ORDER BY c.embedding::halfvec(3072) <=> _embedding::halfvec(3072)
           ) AS pos
    FROM public.diary_chunks c
    WHERE c.subject_id = _subject_id
      AND c.entry_date <= _cutoff
    ORDER BY c.embedding::halfvec(3072) <=> _embedding::halfvec(3072)
    LIMIT 40
  ),
  fused AS (
    SELECT COALESCE(l.id, s.id) AS id,
           COALESCE(l.rank, 0) AS lexical_rank,
           COALESCE(s.sim, 0) AS similarity,
           COALESCE(1.0 / (60 + l.pos), 0) + COALESCE(1.2 / (60 + s.pos), 0) AS relevance
    FROM lexical l
    FULL OUTER JOIN semantic s ON s.id = l.id
  )
  SELECT c.id, c.entry_date, c.date_label, c.content,
         f.lexical_rank, f.similarity, f.relevance
  FROM fused f
  JOIN public.diary_chunks c ON c.id = f.id
  WHERE c.entry_date <= _cutoff
  ORDER BY f.relevance DESC, c.entry_date DESC
  LIMIT _limit;
$$;