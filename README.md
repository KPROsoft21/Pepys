<p align="center">
  <img src="public/pepys-logo.png" alt="PEPYS logo" width="220" />
</p>

<p align="center"><em>Temporal personality reconstruction — a mind sealed at 31 May 1669.</em></p>

---

## Overview

PEPYS reconstructs a historical person from surviving first-person evidence and lets you
speak with the result. The first subject is Samuel Pepys, whose diary ends on 31 May 1669.
The reconstruction knows nothing after that date unless a visitor teaches it, and every
exchange leaves an auditable trace in memory, belief and concept state.

It is not a claim of consciousness, sentience or resurrection. It is a bounded,
evidence-grounded model of an autobiographical identity, built to be inspected.

## Core ideas

- **Epistemic boundary.** The agent's world model is frozen at a historical cutoff. Modern
  concepts are held in an explicit "knowledge frontier" and are marked `unknown`, `partial`
  or `understood`.
- **Teaching mode.** A visitor can explain something modern. A post-conversation
  consolidation pass extracts what was actually learned and writes it back as new memories,
  concept transitions and belief revisions.
- **Evidence chains.** Every reply can be interrogated with "Why do you think that?",
  which surfaces the memories, beliefs, relationships and events it was drawn from, plus
  the frontier boundary that constrained it.
- **Life Book.** A readable rendering of the reconstructed self: chronology, people,
  memories, beliefs and unknowns, each with strength and confidence.
- **Forked lives.** Counterfactual biographies generated from a user premise, with each
  branch entry marked unchanged / changed / erased / invented and scored for warrant.
  Forks are never taught back to the subject.
- **Research mode.** Instrumentation over the whole system: frontier integrity metrics,
  state-transition log, source registry and the identity-reveal experimental condition.

## Features

| Surface | Route | What it does |
| --- | --- | --- |
| The Encounter | `/` | Portrait, streaming text chat, spoken replies, teaching mode, evidence panels |
| Life Book | `/book` | Chaptered view of chronology, relationships, memories, beliefs, unknowns |
| Forked Lives | `/forks` | Propose a divergence premise and read the life that follows |
| Research Mode | `/research` | Metrics, audit log, source registry, identity-reveal toggle |

## Tech stack

- **TanStack Start v1** (React 19, file-based routing, server functions) on **Vite**
- **Tailwind CSS v4** with a design token system in `src/styles.css`
- **shadcn/ui** primitives on Radix
- **TanStack Query** for data loading and cache
- **Lovable Cloud** (Postgres + row-level security) for persistence
- **Lovable AI Gateway** for conversation, structured fork generation and text-to-speech

## Data model

| Table | Purpose |
| --- | --- |
| `subjects` | Identity metadata, historical cutoff, reveal status |
| `sources` | Evidence corpus with tier, citation, licence and coverage |
| `life_events` | Chronology with salience and source attribution |
| `people` | Relationships with sentiment and confidence |
| `memories` | Episodic memory, partitioned `original` vs `post_reconstruction` |
| `beliefs` | Propositions with stance, confidence, provenance and origin |
| `concepts` | Knowledge frontier: modern concepts and their understanding state |
| `learning_log` | Append-only audit of every state transition |
| `conversations` / `messages` | Dialogue history feeding the prompt assembly |
| `forks` / `fork_events` | Counterfactual branches and their timelines |

## Project structure

```text
src/
  routes/
    __root.tsx        root shell, head metadata, providers
    index.tsx         the encounter: chat, voice, teaching, evidence
    book.tsx          Life Book chapters
    forks.tsx         counterfactual biographies
    research.tsx      instrumentation dashboard
    api/
      chat.ts         streaming conversation endpoint
      voice.ts        text-to-speech endpoint
  lib/
    pepys.ts          shared types and formatting helpers
    queries.ts        TanStack Query definitions
    subject.server.ts prompt assembly and epistemic-boundary enforcement
    consolidate.server.ts  post-conversation state extraction
    forks.server.ts   structured counterfactual generation
    *.functions.ts    server-function entry points
  components/pepys/   shared chrome and gauges
  integrations/supabase/  generated backend client and types
```

Server-only logic lives in `*.server.ts` and is reached exclusively through
`createServerFn` wrappers in `*.functions.ts`, so it never enters the client bundle.

## Running locally

Requires Node.js 20+ (install via [nvm](https://github.com/nvm-sh/nvm)).

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

The app serves on `http://localhost:8080`.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

### Environment

Backend and AI credentials are provisioned automatically by Lovable Cloud and written to
`.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `LOVABLE_API_KEY`). Server-only
values are read inside server-function handlers via `process.env`; browser-safe values use
`import.meta.env`. Do not commit secrets.

## Design system

An "ink on parchment" palette expressed entirely as semantic tokens in `src/styles.css`:
Cormorant Garamond for display, Karla for body, IBM Plex Mono for instrumentation.
Components consume tokens only — no hardcoded colour utilities — so theming stays coherent.

## Deployment

Open the project in [Lovable](https://lovable.dev) and publish. The build targets an edge
runtime, so server code must stay Worker-compatible (no native modules or child processes).

## Provenance and ethics

The primary corpus is the diary of Samuel Pepys, 1660–1669, together with tiered secondary
sources listed in the in-app source registry. Reconstructed statements are labelled with
confidence and provenance; inference is never presented as testimony. The identity-reveal
condition — whether the subject has been told what it is — is an explicit, logged
experimental variable rather than a hidden default.

## Licence

The source of the diary is in the public domain. This application's code is owned by the
project author.
