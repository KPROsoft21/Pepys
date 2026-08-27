export const SUBJECT_SLUG = "samuel-pepys";

export type Subject = {
  id: string;
  slug: string;
  name: string;
  honorific: string | null;
  birth_year: number | null;
  death_year: number | null;
  cutoff_year: number;
  cutoff_label: string;
  epitaph: string | null;
  reveal_status: string;
  reconstructed_at: string;
};

export type LifeEvent = {
  id: string;
  title: string;
  description: string | null;
  date_label: string | null;
  year: number;
  salience: number;
  source_label: string | null;
};

export type Person = {
  id: string;
  name: string;
  relation: string;
  description: string | null;
  sentiment: number;
  confidence: number;
};

export type Memory = {
  id: string;
  scope: "original" | "post_reconstruction" | string;
  title: string;
  content: string;
  learned_label: string | null;
  strength: number;
  confidence: number;
  source_label: string | null;
  impact: string | null;
  created_at: string;
};

export type Belief = {
  id: string;
  proposition: string;
  stance: string;
  confidence: number;
  provenance: string | null;
  origin: string;
  updated_at: string;
};

export type Concept = {
  id: string;
  name: string;
  category: string;
  status: "unknown" | "partial" | "understood" | string;
  understanding: string | null;
  taught_by: string | null;
  first_known_at: string | null;
};

export type SourceRecord = {
  id: string;
  title: string;
  kind: string;
  tier: number;
  citation: string | null;
  licence: string | null;
  url: string | null;
  coverage: string | null;
};

export type LearningEntry = {
  id: string;
  kind: string;
  summary: string;
  state_before: string | null;
  state_after: string | null;
  confidence: number | null;
  created_at: string;
};

export type ChatTurn = {
  id: string;
  role: "user" | "subject";
  content: string;
  evidence?: Evidence | null;
  pending?: boolean;
};

export type Evidence = {
  drawnFrom: string[];
  frontier: string | null;
  updates: string[];
};

export function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function bar(value: number, cells = 10) {
  const filled = Math.max(0, Math.min(cells, Math.round(value * cells)));
  return "█".repeat(filled) + "░".repeat(cells - filled);
}

export type Fork = {
  id: string;
  label: string;
  premise: string;
  divergence_year: number;
  divergence_label: string | null;
  summary: string | null;
  self_account: string | null;
  confidence: number;
  created_by: string | null;
  created_at: string;
};

export type ForkEvent = {
  id: string;
  fork_id: string;
  year: number;
  date_label: string | null;
  title: string;
  description: string | null;
  divergence: string;
  confidence: number;
};
