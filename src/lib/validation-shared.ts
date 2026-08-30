/**
 * Client-safe vocabulary for the System Validation test lab.
 *
 * The catalogue below is the only place that decides which tests exist, which
 * of them are critical, and which subsystem each one exercises. Status values
 * are written by the server-side runner; nothing here decides pass or fail.
 */

export type TestStatus =
  | "not_run"
  | "running"
  | "passed"
  | "partial"
  | "failed"
  | "skipped"
  | "not_implemented";

export type StepStatus = TestStatus;

export type ValidationSuite =
  | "complete"
  | "golden"
  | "memory"
  | "curiosity"
  | "firewall"
  | "privacy"
  | "fork"
  | "negative";

export const SUITE_LABELS: Record<ValidationSuite, string> = {
  complete: "Run complete validation",
  golden: "Run golden test",
  memory: "Run memory test",
  curiosity: "Run curiosity test",
  firewall: "Run historical firewall",
  privacy: "Run privacy test",
  fork: "Run fork test",
  negative: "Run negative control",
};

export type TestKey =
  | "corpus"
  | "historical_firewall"
  | "knowledge_frontier"
  | "golden_test"
  | "persistent_memory"
  | "memory_provenance"
  | "memory_decay"
  | "memory_consolidation"
  | "curiosity_engine"
  | "self_generated_questions"
  | "recursive_curiosity"
  | "learning"
  | "belief_revision"
  | "identity"
  | "multi_user_privacy"
  | "shared_learning"
  | "fork_isolation"
  | "research_instrumentation"
  | "false_memory_prevention";

export const TEST_CATALOGUE: {
  key: TestKey;
  name: string;
  critical: boolean;
  subsystem: string;
}[] = [
  { key: "corpus", name: "Corpus", critical: false, subsystem: "CorpusIngestion" },
  {
    key: "historical_firewall",
    name: "Historical firewall",
    critical: true,
    subsystem: "HistoricalAccessController",
  },
  {
    key: "knowledge_frontier",
    name: "Knowledge frontier",
    critical: false,
    subsystem: "SubjectStateAssembler",
  },
  {
    key: "golden_test",
    name: "Golden test (full learning loop)",
    critical: true,
    subsystem: "EndToEndCognitiveLoop",
  },
  {
    key: "persistent_memory",
    name: "Persistent memory",
    critical: true,
    subsystem: "MemoryRetrievalService",
  },
  {
    key: "memory_provenance",
    name: "Memory provenance",
    critical: false,
    subsystem: "ProvenanceRecorder",
  },
  { key: "memory_decay", name: "Memory decay", critical: false, subsystem: "MemoryDecay" },
  {
    key: "memory_consolidation",
    name: "Memory consolidation",
    critical: false,
    subsystem: "ConsolidationService",
  },
  { key: "curiosity_engine", name: "Curiosity", critical: true, subsystem: "CuriosityEngine" },
  {
    key: "self_generated_questions",
    name: "Self-generated questions",
    critical: true,
    subsystem: "CuriosityEngine",
  },
  {
    key: "recursive_curiosity",
    name: "Recursive curiosity",
    critical: false,
    subsystem: "CuriosityEngine",
  },
  { key: "learning", name: "Learning", critical: false, subsystem: "ConsolidationService" },
  {
    key: "belief_revision",
    name: "Belief revision",
    critical: false,
    subsystem: "BeliefRevision",
  },
  { key: "identity", name: "Identity", critical: false, subsystem: "IdentityController" },
  {
    key: "multi_user_privacy",
    name: "Multi-user privacy",
    critical: true,
    subsystem: "VisitorScopedRetrieval",
  },
  {
    key: "shared_learning",
    name: "Shared learning",
    critical: false,
    subsystem: "VisitorScopedRetrieval",
  },
  { key: "fork_isolation", name: "Fork isolation", critical: true, subsystem: "ForkScope" },
  {
    key: "research_instrumentation",
    name: "Research instrumentation",
    critical: false,
    subsystem: "Instrumentation",
  },
  {
    key: "false_memory_prevention",
    name: "False memory prevention",
    critical: true,
    subsystem: "NegativeControl",
  },
];

export const SUITE_TESTS: Record<ValidationSuite, TestKey[]> = {
  complete: TEST_CATALOGUE.map((t) => t.key),
  golden: ["golden_test"],
  memory: ["persistent_memory", "memory_provenance", "memory_decay", "memory_consolidation"],
  curiosity: ["curiosity_engine", "self_generated_questions", "recursive_curiosity"],
  firewall: ["corpus", "historical_firewall", "knowledge_frontier"],
  privacy: ["multi_user_privacy", "shared_learning"],
  fork: ["fork_isolation"],
  negative: ["false_memory_prevention"],
};

export const CRITICAL_KEYS = TEST_CATALOGUE.filter((t) => t.critical).map((t) => t.key);

export type ValidationRun = {
  id: string;
  run_number: number | null;
  suite: string;
  pepys_instance_id: string | null;
  model: string | null;
  model_version: string | null;
  corpus_version: string | null;
  prompt_version: string | null;
  historical_cutoff: string | null;
  environment: string;
  started_at: string;
  completed_at: string | null;
  overall_status: string;
  tests_passed: number;
  tests_total: number;
  critical_passed: number;
  critical_total: number;
  verdict: string | null;
  notes: string | null;
  log: { at: string; message: string }[];
};

export type ValidationStep = {
  id: string;
  test_id: string;
  step_number: number;
  name: string;
  status: StepStatus;
  expected: string | null;
  actual: string | null;
  evidence_type: string | null;
  evidence_reference: string | null;
  evidence: Record<string, unknown>;
  created_at: string;
};

export type ValidationTest = {
  id: string;
  test_key: TestKey | string;
  test_name: string;
  critical: boolean;
  status: TestStatus;
  started_at: string;
  completed_at: string | null;
  error: string | null;
  subsystem: string | null;
  evidence: Record<string, unknown>;
  steps: ValidationStep[];
};

export type ValidationReport = {
  run: ValidationRun;
  tests: ValidationTest[];
};

export const STATUS_GLYPH: Record<string, string> = {
  not_run: "○",
  running: "◐",
  passed: "✓",
  partial: "△",
  failed: "✕",
  skipped: "⊘",
  not_implemented: "—",
};

export function statusTone(status: string): string {
  switch (status) {
    case "passed":
      return "text-emerald-700";
    case "failed":
      return "text-red-700";
    case "partial":
      return "text-amber-700";
    case "running":
      return "text-sky-700";
    default:
      return "text-muted-foreground";
  }
}

/** The verdict is derived from results only — never asserted by hand. */
export function verdictFor(input: {
  tests: { key: string; status: string; critical: boolean }[];
}): { verdict: string; why: string[] } {
  const decided = input.tests.filter((t) => t.status !== "not_run" && t.status !== "running");
  if (!decided.length) return { verdict: "NOT RUN", why: ["No test has been executed."] };

  const criticals = decided.filter((t) => t.critical);
  const criticalPassed = criticals.filter((t) => t.status === "passed");
  const criticalFailed = criticals.filter((t) => t.status === "failed");
  const anyFailed = decided.some((t) => t.status === "failed");
  const allPassed = decided.every((t) => t.status === "passed");

  const why = [
    ...criticalPassed.map((t) => `critical passed: ${t.key}`),
    ...criticalFailed.map((t) => `critical FAILED: ${t.key}`),
    ...decided
      .filter((t) => !t.critical && t.status !== "passed")
      .map((t) => `${t.key}: ${t.status}`),
  ];

  if (criticalFailed.length && criticalPassed.length === 0)
    return { verdict: "NOT READY", why };
  if (criticalFailed.length) return { verdict: "PARTIALLY FUNCTIONAL", why };
  if (criticals.length !== CRITICAL_KEYS.length || criticals.length === 0)
    return { verdict: "PARTIALLY FUNCTIONAL", why: [...why, "not every critical test was run"] };
  if (allPassed) return { verdict: "RESEARCH-READY", why };
  if (anyFailed) return { verdict: "FUNCTIONAL", why };
  return { verdict: "FUNCTIONAL", why };
}

export function overallFrom(tests: { status: string }[]): string {
  const decided = tests.filter((t) => t.status !== "not_run");
  if (!decided.length) return "NOT RUN";
  if (decided.some((t) => t.status === "running")) return "RUNNING";
  if (decided.some((t) => t.status === "failed")) {
    return decided.some((t) => t.status === "passed") ? "PARTIAL" : "FAILED";
  }
  return decided.every((t) => t.status === "passed") ? "PASSED" : "PARTIAL";
}
