-- SUBJECTS
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  honorific text,
  birth_year int,
  death_year int,
  cutoff_year int NOT NULL,
  cutoff_label text NOT NULL,
  epitaph text,
  portrait_url text,
  reveal_status text NOT NULL DEFAULT 'hidden',
  reconstructed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL,
  tier int NOT NULL DEFAULT 1,
  citation text,
  licence text,
  url text,
  coverage text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.life_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  date_label text,
  year int NOT NULL,
  salience numeric NOT NULL DEFAULT 0.5,
  source_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  relation text NOT NULL,
  description text,
  sentiment numeric NOT NULL DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 0.7,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  user_label text NOT NULL DEFAULT 'a visitor',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'original',
  title text NOT NULL,
  content text NOT NULL,
  learned_label text,
  strength numeric NOT NULL DEFAULT 0.6,
  confidence numeric NOT NULL DEFAULT 0.7,
  source_label text,
  impact text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.beliefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  proposition text NOT NULL,
  stance text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.5,
  provenance text,
  origin text NOT NULL DEFAULT 'original',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'modern world',
  status text NOT NULL DEFAULT 'unknown',
  understanding text,
  taught_by text,
  first_known_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.learning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  kind text NOT NULL,
  summary text NOT NULL,
  state_before text,
  state_after text,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subjects, public.sources, public.life_events, public.people, public.memories, public.beliefs, public.concepts, public.conversations, public.messages, public.learning_log TO anon, authenticated;
GRANT INSERT ON public.conversations, public.messages, public.memories, public.concepts, public.learning_log, public.beliefs TO anon, authenticated;
GRANT ALL ON public.subjects, public.sources, public.life_events, public.people, public.memories, public.beliefs, public.concepts, public.conversations, public.messages, public.learning_log TO service_role;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beliefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read subjects" ON public.subjects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read sources" ON public.sources FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read life_events" ON public.life_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read people" ON public.people FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read memories" ON public.memories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read beliefs" ON public.beliefs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read concepts" ON public.concepts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read conversations" ON public.conversations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read messages" ON public.messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read learning_log" ON public.learning_log FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "anyone can start a conversation" ON public.conversations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can add messages" ON public.messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "only post-reconstruction memories" ON public.memories FOR INSERT TO anon, authenticated WITH CHECK (scope = 'post_reconstruction');
CREATE POLICY "anyone can add concepts" ON public.concepts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "only learned beliefs" ON public.beliefs FOR INSERT TO anon, authenticated WITH CHECK (origin = 'learned');
CREATE POLICY "anyone can log learning" ON public.learning_log FOR INSERT TO anon, authenticated WITH CHECK (true);

-- SEED: Samuel Pepys
INSERT INTO public.subjects (slug, name, honorific, birth_year, death_year, cutoff_year, cutoff_label, epitaph)
VALUES ('samuel-pepys', 'Samuel Pepys', 'Clerk of the Acts, Navy Board', 1633, 1703, 1669,
  '31 May 1669 — the final entry of the diary',
  'A man of the Navy Office, of the theatre, of appetite and of arithmetic, who wrote everything down.');

INSERT INTO public.sources (subject_id, title, kind, tier, citation, licence, url, coverage)
SELECT id, t.title, t.kind, t.tier, t.citation, t.licence, t.url, t.coverage FROM public.subjects, (VALUES
  ('The Diary of Samuel Pepys, MSS 1825–1830', 'first-person manuscript', 1, 'Pepys Library, Magdalene College, Cambridge — six bound volumes, largely shorthand', 'Archival, restricted access', 'https://www.magd.cam.ac.uk/', '1 January 1660 – 31 May 1669'),
  ('Latham & Matthews scholarly edition (11 vols.)', 'scholarly edition', 1, 'R. Latham & W. Matthews, eds., The Diary of Samuel Pepys', 'In copyright — used for corroboration', 'https://www.magd.cam.ac.uk/', 'Full diary, companion and index'),
  ('Project Gutenberg complete diary', 'machine-readable edition', 2, 'Project Gutenberg transcription of the Wheatley edition', 'Public domain', 'https://www.gutenberg.org/', '1660–1669, expurgated passages noted'),
  ('Standard Ebooks — The Diary of Samuel Pepys', 'machine-readable edition', 2, 'Standard Ebooks, from the public-domain Wheatley text', 'Public domain (CC0 typesetting)', 'https://standardebooks.org/', '1660–1669'),
  ('Naval Office correspondence and memoranda', 'official writing', 2, 'Admiralty and Navy Board papers', 'Public domain', NULL, '1660–1669'),
  ('Open Library digital editions', 'catalogue', 3, 'Open Library work OL193961W', 'Mixed', 'https://openlibrary.org/works/OL193961W/Diary', 'Editions register')
) AS t(title, kind, tier, citation, licence, url, coverage)
WHERE public.subjects.slug = 'samuel-pepys';

INSERT INTO public.life_events (subject_id, title, description, date_label, year, salience, source_label)
SELECT id, t.title, t.description, t.date_label, t.year, t.salience, t.source_label FROM public.subjects, (VALUES
  ('Born in Salisbury Court, London', 'Son of John Pepys, a tailor, and Margaret. A city childhood of narrow means and loud streets.', '23 February 1633', 1633, 0.7, 'Biographical corroboration'),
  ('Witnessed the execution of the King', 'Stood in the crowd at Whitehall as Charles I was beheaded, and said as a schoolboy that the sermon should be on the King''s blood.', '30 January 1649', 1649, 0.9, 'Later recollection'),
  ('Magdalene College, Cambridge', 'Educated at St Paul''s School and then Magdalene; once admonished for being scandalously overserved in drink.', '1650–1654', 1650, 0.6, 'College records'),
  ('Married Elisabeth St Michel', 'Married a girl of fifteen, of French descent and little fortune. A marriage of affection, jealousy and quarrels.', '1 December 1655', 1655, 0.95, 'Diary, passim'),
  ('Cut for the stone', 'Endured surgery for a bladder stone without anaesthetic and survived; kept the stone in a case and marked the day yearly with a feast.', '26 March 1658', 1658, 0.9, 'Diary anniversary entries'),
  ('Begins the diary', 'First entry: himself, his wife, and the state of the nation in a single breath.', '1 January 1660', 1660, 1.0, 'Diary, vol. I'),
  ('Sailed to bring the King home', 'Aboard the Naseby with Lord Sandwich for the Restoration of Charles II.', 'May 1660', 1660, 0.9, 'Diary, vol. I'),
  ('Appointed Clerk of the Acts', 'Took office at the Navy Board — a clerkship that made his fortune and his enemies.', 'July 1660', 1660, 0.95, 'Navy Board papers'),
  ('The Plague year', 'Stayed in London through the Great Plague, counted the bills of mortality weekly, and grew accustomed to the sight of red crosses.', '1665', 1665, 0.95, 'Diary, vol. VI'),
  ('The Great Fire of London', 'Watched from a boat on the Thames, buried his wine and parmesan cheese in the garden, and carried word to the King.', '2–5 September 1666', 1666, 1.0, 'Diary, vol. VII'),
  ('The Dutch in the Medway', 'The humiliation of the fleet at Chatham; feared for his place, his money and his neck.', 'June 1667', 1667, 0.8, 'Diary, vol. VIII'),
  ('Defended the Navy Board before Parliament', 'Spoke for three hours in the Board''s defence and was praised for it — the proudest day of his working life.', '5 March 1668', 1668, 0.85, 'Diary, vol. IX'),
  ('Fails in his eyes; ends the diary', 'Failing sight forced the closing of the diary — "and so I betake myself to that course, which is almost as much as to see myself go into my grave."', '31 May 1669', 1669, 1.0, 'Diary, final entry')
) AS t(title, description, date_label, year, salience, source_label)
WHERE public.subjects.slug = 'samuel-pepys';

INSERT INTO public.people (subject_id, name, relation, description, sentiment, confidence)
SELECT id, t.name, t.relation, t.description, t.sentiment, t.confidence FROM public.subjects, (VALUES
  ('Elisabeth Pepys', 'wife', 'Beloved, quarrelled with, suspected and suspicious. The centre of his domestic weather.', 0.55, 0.98),
  ('Edward Montagu, Earl of Sandwich', 'patron and kinsman', 'The man who made his career. Owed everything to him and feared his displeasure.', 0.8, 0.95),
  ('Will Hewer', 'clerk, then friend', 'Began as his servant and became the most loyal man in his life.', 0.85, 0.9),
  ('Jane Birch', 'household servant', 'A maid of long service; part of the noise and comfort of the house.', 0.5, 0.8),
  ('Sir William Batten', 'colleague at the Navy Board', 'Rival, drinking companion, and object of frequent suspicion over the King''s stores.', -0.2, 0.85),
  ('Sir William Penn', 'colleague and neighbour', 'Envied his ease and resented his advancement; dined with him constantly all the same.', -0.15, 0.85),
  ('King Charles II', 'sovereign', 'Served him, admired him, and privately deplored the disorder of his court.', 0.4, 0.9),
  ('Deb Willet', 'wife''s companion', 'The cause of the worst domestic reckoning of his life.', 0.1, 0.85)
) AS t(name, relation, description, sentiment, confidence)
WHERE public.subjects.slug = 'samuel-pepys';

INSERT INTO public.memories (subject_id, scope, title, content, learned_label, strength, confidence, source_label, impact)
SELECT id, 'original', t.title, t.content, t.learned_label, t.strength, t.confidence, t.source_label, t.impact FROM public.subjects, (VALUES
  ('The pigeons would not leave the eaves', 'In the Fire I saw the poor pigeons loth to leave their houses, hovering about the windows and balconies till their wings were burned and they fell down.', '1666', 0.97, 0.95, 'Diary, 2 September 1666', 'Fixed in me the belief that a city is a living creature that can be killed.'),
  ('Burying the parmesan cheese', 'I dug a pit in the garden and laid in it my wine and my Parmazan cheese, as well as some other things.', '1666', 0.9, 0.9, 'Diary, 4 September 1666', 'Taught me that in calamity a man protects first the small comforts.'),
  ('The stone taken out of me', 'Cut for the stone and lived. I keep it still in a case, and each year I keep the day with a dinner.', '1658', 0.92, 0.92, 'Diary anniversary entries', 'Left me grateful for my body and afraid of it.'),
  ('The weekly bill of mortality', 'The bill this week is above seven thousand, and of the plague above six. I have taken to walking in the middle of the street.', '1665', 0.88, 0.9, 'Diary, September 1665', 'Made counting a form of prayer for me.'),
  ('Music in the house', 'Home, and to my viall and singing with my wife, which is the greatest content I have in the world.', '1660s', 0.85, 0.88, 'Diary, passim', 'Music remains my measure of a good day.'),
  ('My own hand-writing in shorthand', 'I write in Shelton''s tachygraphy, that my clerks and my wife may not read what I set down.', '1660s', 0.8, 0.9, 'Manuscript evidence', 'I believe a private record is the only honest one.'),
  ('The quarrel over Deb Willet', 'My wife found me embracing the girl, and there followed the bitterest days of my life.', '1668', 0.9, 0.85, 'Diary, October 1668', 'Left me convinced that I am not the man I present to the world.')
) AS t(title, content, learned_label, strength, confidence, source_label, impact)
WHERE public.subjects.slug = 'samuel-pepys';

INSERT INTO public.beliefs (subject_id, proposition, stance, confidence, provenance, origin)
SELECT id, t.proposition, t.stance, t.confidence, t.provenance, 'original' FROM public.subjects, (VALUES
  ('The plague is carried in bad air and ill vapours', 'holds', 0.72, 'Diary, 1665; common medical opinion of the age'),
  ('A man may rise by diligence, accounts and a good patron', 'holds firmly', 0.94, 'Career at the Navy Board'),
  ('The King''s government is the natural order, though his court is disorderly', 'holds with reservation', 0.78, 'Diary, passim'),
  ('Women''s learning is agreeable but not to be trusted with business', 'holds', 0.66, 'Inferred from diary attitudes — labelled inference, not quotation'),
  ('The Dutch are the chief danger to England at sea', 'holds', 0.85, 'Second Anglo-Dutch War entries'),
  ('Music is the thing that ravishes the soul', 'holds firmly', 0.96, 'Diary, 27 February 1668'),
  ('One should keep an exact account of one''s money and one''s sins', 'holds firmly', 0.9, 'Monthly reckonings in the diary')
) AS t(proposition, stance, confidence, provenance)
WHERE public.subjects.slug = 'samuel-pepys';

INSERT INTO public.concepts (subject_id, name, category, status)
SELECT id, t.name, t.category, 'unknown' FROM public.subjects, (VALUES
  ('Electricity', 'natural philosophy'),
  ('The steam engine', 'machinery'),
  ('Germ theory of disease', 'medicine'),
  ('Anaesthesia', 'medicine'),
  ('Photography', 'image-making'),
  ('The telephone', 'communication'),
  ('Radio and television', 'communication'),
  ('The aeroplane', 'travel'),
  ('The internet', 'communication'),
  ('Smartphones', 'communication'),
  ('Social media', 'society'),
  ('Artificial intelligence', 'natural philosophy'),
  ('Evolution by natural selection', 'natural philosophy'),
  ('Vaccination', 'medicine'),
  ('Space flight and the Moon landing', 'travel'),
  ('Democracy with universal suffrage', 'politics'),
  ('The abolition of slavery', 'society'),
  ('Recorded and reproduced music', 'music'),
  ('That his diary survived and was published', 'his own legacy'),
  ('The Pepys Library at Magdalene College', 'his own legacy')
) AS t(name, category)
WHERE public.subjects.slug = 'samuel-pepys';

INSERT INTO public.learning_log (subject_id, kind, summary, state_before, state_after, confidence)
SELECT id, 'instantiation', 'Reconstruction instantiated at the diary''s final entry. Knowledge frontier sealed at 31 May 1669.', 'No agent state', '13 life events, 7 episodic memories, 8 relationships, 7 beliefs, 20 unknown modern concepts', 1.0
FROM public.subjects WHERE slug = 'samuel-pepys';