create extension if not exists vector;

CREATE TABLE public.diary_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  date_label text NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(3072) NOT NULL,
  model_version text NOT NULL DEFAULT 'google/gemini-embedding-2',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.diary_chunks TO anon;
GRANT SELECT ON public.diary_chunks TO authenticated;
GRANT ALL ON public.diary_chunks TO service_role;

ALTER TABLE public.diary_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read diary chunks" ON public.diary_chunks
  FOR SELECT TO anon, authenticated USING (true);

CREATE UNIQUE INDEX diary_chunks_entry_chunk_idx ON public.diary_chunks (entry_id, chunk_index);
CREATE INDEX diary_chunks_date_idx ON public.diary_chunks (subject_id, entry_date);
CREATE INDEX diary_chunks_embedding_idx
  ON public.diary_chunks USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

-- Hybrid retrieval: reciprocal-rank fusion of full-text rank and vector
-- similarity, both hard-bounded by the historical cutoff.
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
           ts_rank(to_tsvector('english', c.content),
                   websearch_to_tsquery('english', _query))::double precision AS rank,
           row_number() OVER (
             ORDER BY ts_rank(to_tsvector('english', c.content),
                              websearch_to_tsquery('english', _query)) DESC
           ) AS pos
    FROM public.diary_chunks c
    WHERE c.subject_id = _subject_id
      AND c.entry_date <= _cutoff
      AND nullif(btrim(_query), '') IS NOT NULL
      AND to_tsvector('english', c.content) @@ websearch_to_tsquery('english', _query)
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