# PEPYS — from character prompt to cognitive engine

The current app has a good shell: a seeded Pepys subject, a chat endpoint that builds one big system prompt, a consolidation pass, and Life Book / Research / Forks pages. The gap is that the prompt *is* the mind: there is no persistent state, no retrieval, no cutoff enforcement below the prompt, no curiosity model, and several dashboard numbers are not backed by defined calculations.

This plan replaces the prompt-as-mind with a state machine the prompt merely reads from. Existing tables (subjects, memories, beliefs, concepts, people, life_events, sources, learning_log, forks) are kept and extended rather than rebuilt.

## Phase 1 — Structured state and provenance (foundation)

Migration work, additive:

- `pepys_state` — one row per instance: identity_state (enum: unspecified / interacting / asked / uncertain / historical_self / revealed / post_revelation), historical_cutoff (date, configurable), current_simulated_time, emotional_state (jsonb), curiosity/self-model versions, memory/belief/corpus versions.
- Extend `memories` with the full structured record: type (episodic / semantic / social / emotional / procedural / autobiographical / learned_post_cutoff), certainty, importance, emotional_salience, recall_count, last_recalled_at, decay_rate, immutable_historical, post_cutoff, supersedes, contradicted_by, event_date_start/end, firsthand, public_or_private, owner_user_id.
- `provenance_records` — every memory/belief/concept row links to either a source document (with exact date and edition) or an interaction event. Nothing important may exist without one.
- `diary_entries` — dated corpus entries with untouched original text, separate from derived memories.
- `belief_history` — append-only; beliefs are never silently overwritten.
- `personality_traits`, `emotional_states`, `identity_events`, `contradictions`.
- `interactions` — durable record of each exchange, distinct from `messages`.

Every new public table gets GRANTs plus RLS; user-scoped rows are readable only by their owner.

## Phase 2 — Corpus ingestion

An ingestion pipeline (server function, run in batches) that takes public-domain diary text, splits it into dated entries, normalises Old Style dates, and stores the original verbatim. A second derivation pass extracts people, places, events and candidate memories per entry, each written with provenance back to its entry. Source text is never modified by derivation.

Realistic scope note: full 1660–1669 ingestion is a long job. Phase 2 lands the pipeline plus a substantial ingested slice; the Research page reports exactly how much of the corpus is ingested rather than implying completeness.

## Phase 3 — Retrieval with a hard historical firewall

A single retrieval module all reads go through:

- Every query is filtered by `event_date <= historical_cutoff` (or `post_cutoff = true` for taught knowledge). Filtering happens in SQL, not in the prompt.
- Denied reads are logged to `access_denials` so the firewall is observable and testable.
- Ranking by relevance × importance × accessibility, where accessibility is the decay formula: importance × emotional modifier × recall modifier × recency modifier. Decay affects retrieval only; source rows are untouched.
- Retrieval returns a bounded `ResponseContext` (memories, beliefs, relationship, emotional state, curiosity, unknowns, style constraints) — never the whole database.

## Phase 4 — Curiosity engine

Real subsystem, not a prompt instruction:

- `curiosity_states` and `curiosity_questions` as specified (novelty, surprise, personal_relevance, emotional_salience, knowledge_gap, contradiction_strength, curiosity_strength, exploration_count, resolved, decay_rate).
- Salience is computed against Pepys's own evidence — his professions, places and interests as they appear in ingested entries — not a hard-coded interest list.
- Question generation is grounded in the specific gap detected, then ranked by expected information gain. Answering a question re-scores the concept and may open new gaps (recursive curiosity).
- A conversational budget suppresses question spam: at most one question per turn, gated on fatigue, topic continuity and emotional state; sometimes Pepys just listens or postpones.
- Sought-after information gets higher memory importance than passively received information, and the memory records the question that produced it.

## Phase 5 — Beliefs, personality, contradictions

- Belief updates go through evidence → interpretation → confidence change, writing a `belief_history` row each time. Contradiction detection creates a contradiction record and raises curiosity instead of overwriting.
- Personality traits are inferred from evidence with value, confidence and evidence ids; observed behaviour stays distinguishable from inference.

## Phase 6 — Response pipeline and leakage audit

Rewrite the chat route as an explicit pipeline: understand → retrieve → firewall check → curiosity check → build ResponseContext → generate → validate output → leakage check → respond → enqueue async learning. The learning pass stays off the response path.

A leakage detector scans replies for post-cutoff concepts not present in taught knowledge and writes `leakage_events` (prompt, response, cutoff, concept, severity, model version). Model contamination is documented as a limitation and surfaced in Research Mode, not claimed as solved.

## Phase 7 — Multi-user memory and relationships

Authentication (email + Google), then `relationships` per user (trust, familiarity, interaction count, topics, unresolved questions) and strict private/shared separation: user-scoped memories are RLS-isolated and never enter another user's context; promotion to shared knowledge is an explicit, provenance-carrying step.

## Phase 8 — Life Book, Research Mode, Forks

- Life Book gains Memories (important / recent / faded / uncertain), Curiosity, Contradictions, Identity, and a "Why does Pepys know this?" provenance drawer on every item.
- Research Mode metrics each get a stated calculation; anything not yet computed reads **Not yet evaluated** instead of a number. Existing placeholder figures are removed.
- Forks become real state clones with independent memory/belief/curiosity/relationship rows, a comparison view, and a reproducible 1663 blind test whose 1664–1669 evidence is withheld from retrieval and used only for scoring.

## Phase 9 — Tests, voice/avatar boundary

Vitest coverage for cutoff enforcement, denial logging, provenance presence, memory persistence across sessions, decay ordering, belief history, contradiction records, curiosity generation and recursion, private/shared isolation, fork independence and identity revelation. Voice stays a thin adapter behind a text + emotion metadata interface so the provider can be swapped; the avatar layer holds no cognitive state.

## Sequencing

I will implement phase by phase, verifying database state and the UI after each, and report what is real versus not yet evaluated as I go. The visual identity stays as it is.
