
-- conversations: no public reads
DROP POLICY IF EXISTS "public read conversations" ON public.conversations;

-- messages: no public reads
DROP POLICY IF EXISTS "public read messages" ON public.messages;

-- interactions: only signed-in owner rows, never anonymous rows
DROP POLICY IF EXISTS "read own interactions" ON public.interactions;
CREATE POLICY "read own interactions" ON public.interactions
  FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- relationships: only signed-in owner rows
DROP POLICY IF EXISTS "read own relationship" ON public.relationships;
CREATE POLICY "read own relationship" ON public.relationships
  FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- concepts: server-only writes (server uses the privileged client)
DROP POLICY IF EXISTS "anyone can add concepts" ON public.concepts;
REVOKE INSERT ON public.concepts FROM anon, authenticated;

-- safe aggregate helpers so public UI counters keep working without row access
CREATE OR REPLACE FUNCTION public.count_messages()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.messages;
$$;

CREATE OR REPLACE FUNCTION public.count_interactions(_subject_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.interactions WHERE subject_id = _subject_id;
$$;

CREATE OR REPLACE FUNCTION public.count_visitors(_subject_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.relationships WHERE subject_id = _subject_id;
$$;

GRANT EXECUTE ON FUNCTION public.count_messages() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_interactions(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_visitors(uuid) TO anon, authenticated;
