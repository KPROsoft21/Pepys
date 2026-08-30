import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import {
  startValidation,
  validationHistory,
  validationReport,
} from "@/lib/validation.functions";
import {
  STATUS_GLYPH,
  SUITE_LABELS,
  TEST_CATALOGUE,
  statusTone,
  verdictFor,
  type ValidationReport,
  type ValidationSuite,
  type ValidationStep,
  type ValidationTest,
} from "@/lib/validation-shared";

const SUITES: ValidationSuite[] = [
  "complete",
  "golden",
  "memory",
  "curiosity",
  "firewall",
  "privacy",
  "fork",
  "negative",
];

function stamp(value: string | null) {
  if (!value) return "—";
  return new Date(value).toISOString().replace("T", " ").slice(0, 19) + "Z";
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`font-mono text-xs uppercase tracking-wide ${statusTone(status)}`}>
      {STATUS_GLYPH[status] ?? "○"} {status.replace(/_/g, " ")}
    </span>
  );
}

function StepRow({ step, onEvidence }: { step: ValidationStep; onEvidence: () => void }) {
  return (
    <li className="border-t border-border/60 py-2 text-sm first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">
          {step.step_number}. {step.name}
        </span>
        <StatusChip status={step.status} />
      </div>
      {step.expected ? (
        <p className="mt-1 text-xs text-muted-foreground">Expected: {step.expected}</p>
      ) : null}
      {step.actual ? <p className="mt-0.5 text-xs">Observed: {step.actual}</p> : null}
      {step.evidence_type || step.evidence_reference ? (
        <button
          type="button"
          onClick={onEvidence}
          className="mt-1 text-xs underline decoration-dotted underline-offset-4"
        >
          Inspect evidence
          {step.evidence_type ? ` · ${step.evidence_type}` : ""}
          {step.evidence_reference ? ` ${step.evidence_reference.slice(0, 8)}` : ""}
        </button>
      ) : null}
    </li>
  );
}

export function ValidationLab({ authenticated }: { authenticated: boolean }) {
  const queryClient = useQueryClient();
  const run = useServerFn(startValidation);
  const report = useServerFn(validationReport);
  const history = useServerFn(validationHistory);

  const [suite, setSuite] = useState<ValidationSuite>("firewall");
  const [runId, setRunId] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<{ title: string; body: unknown } | null>(null);
  const [running, setRunning] = useState(false);

  const current = useQuery({
    queryKey: ["validation-report", runId],
    queryFn: () => report({ data: { runId } }) as Promise<ValidationReport | { run: null; tests: [] }>,
    enabled: authenticated,
    refetchInterval: running ? 2000 : false,
  });

  const runs = useQuery({
    queryKey: ["validation-history"],
    queryFn: () => history({}),
    enabled: authenticated,
    refetchInterval: running ? 5000 : false,
  });

  const start = useMutation({
    mutationFn: async (chosen: ValidationSuite) => {
      setRunning(true);
      const result = (await run({ data: { suite: chosen } })) as { runId: string };
      return result;
    },
    onSuccess: (result) => {
      setRunId(result.runId);
      void queryClient.invalidateQueries({ queryKey: ["validation-report"] });
      void queryClient.invalidateQueries({ queryKey: ["validation-history"] });
    },
    onSettled: () => {
      setRunning(false);
      void queryClient.invalidateQueries({ queryKey: ["validation-report"] });
      void queryClient.invalidateQueries({ queryKey: ["validation-history"] });
    },
  });

  const data = current.data?.run ? (current.data as ValidationReport) : null;
  const tests: ValidationTest[] = data?.tests ?? [];
  const verdict = useMemo(
    () =>
      verdictFor({
        tests: tests.map((t) => ({ key: t.test_key, status: t.status, critical: t.critical })),
      }),
    [tests],
  );

  const exportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pepys-validation-${data.run.run_number ?? data.run.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-5 rounded-lg border border-border bg-card/60 p-5">
      <header className="space-y-2">
        <p className="small-caps-label">System validation</p>
        <h2 className="font-display text-2xl">Cognitive system test lab</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Each test drives the live services — prompt assembly, cutoff-bound retrieval, the
          consolidation pass, the curiosity engine — and records the row or prompt fragment that
          justified its result. Nothing is asserted in advance: a test that cannot prove its claim
          reports FAILED, PARTIAL, SKIPPED or NOT IMPLEMENTED.
        </p>
      </header>

      {!authenticated ? (
        <p className="rounded border border-dashed border-border p-3 text-sm text-muted-foreground">
          Sign in above as a researcher to run validation. Runs write to the corpus under a
          temporary test instance and are cleaned up afterwards.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {SUITES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSuite(option)}
            className={`rounded border px-3 py-1.5 text-xs ${
              suite === option ? "border-foreground bg-foreground/10" : "border-border"
            }`}
          >
            {SUITE_LABELS[option]}
          </button>
        ))}
        <button
          type="button"
          disabled={!authenticated || running}
          onClick={() => start.mutate(suite)}
          className="rounded bg-foreground px-4 py-1.5 text-xs text-background disabled:opacity-50"
        >
          {running ? "Running…" : `Run ${SUITE_LABELS[suite]}`}
        </button>
        {data ? (
          <button type="button" onClick={exportJson} className="rounded border border-border px-3 py-1.5 text-xs">
            Export run as JSON
          </button>
        ) : null}
      </div>

      {start.isError ? (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          The run could not be completed: {String((start.error as Error).message)}. Any progress
          already recorded is shown below — long suites that call the model may exceed the request
          window while the run continues in the database.
        </p>
      ) : null}

      {data ? (
        <div className="space-y-5">
          <div className="grid gap-3 rounded border border-border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="small-caps-label">Run</p>
              <p>
                #{data.run.run_number ?? "—"} · {SUITE_LABELS[data.run.suite as ValidationSuite] ?? data.run.suite}
              </p>
              <p className="text-xs text-muted-foreground">{data.run.pepys_instance_id}</p>
            </div>
            <div>
              <p className="small-caps-label">Conditions</p>
              <p className="text-xs">
                model {data.run.model} · prompt {data.run.prompt_version} · corpus{" "}
                {data.run.corpus_version ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                cutoff {data.run.historical_cutoff} · {data.run.environment}
              </p>
            </div>
            <div>
              <p className="small-caps-label">Result</p>
              <p>
                <StatusChip status={String(data.run.overall_status).toLowerCase()} />
              </p>
              <p className="text-xs text-muted-foreground">
                {data.run.tests_passed}/{data.run.tests_total} tests · critical{" "}
                {data.run.critical_passed}/{data.run.critical_total}
              </p>
            </div>
            <div>
              <p className="small-caps-label">Verdict</p>
              <p className="font-display text-lg">{data.run.verdict ?? verdict.verdict}</p>
              <p className="text-xs text-muted-foreground">
                {stamp(data.run.started_at)} → {stamp(data.run.completed_at)}
              </p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {TEST_CATALOGUE.filter((meta) => tests.some((t) => t.test_key === meta.key)).map((meta) => {
              const test = tests.find((t) => t.test_key === meta.key)!;
              const expanded = open === test.id;
              return (
                <div key={test.id} className="rounded border border-border">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : test.id)}
                    className="flex w-full items-baseline justify-between gap-3 p-3 text-left"
                  >
                    <span className="text-sm">
                      {meta.name}
                      {meta.critical ? (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          critical
                        </span>
                      ) : null}
                      <span className="block text-xs text-muted-foreground">{test.subsystem}</span>
                    </span>
                    <StatusChip status={test.status} />
                  </button>
                  {expanded ? (
                    <div className="border-t border-border p-3">
                      {test.error ? (
                        <p className="mb-2 text-xs text-red-700">{test.error}</p>
                      ) : null}
                      <ul>
                        {test.steps.map((step) => (
                          <StepRow
                            key={step.id}
                            step={step}
                            onEvidence={() =>
                              setEvidence({
                                title: `${meta.name} · ${step.name}`,
                                body: step.evidence,
                              })
                            }
                          />
                        ))}
                      </ul>
                      {Object.keys(test.evidence ?? {}).length ? (
                        <button
                          type="button"
                          onClick={() =>
                            setEvidence({ title: `${meta.name} · summary`, body: test.evidence })
                          }
                          className="mt-2 text-xs underline decoration-dotted underline-offset-4"
                        >
                          Inspect test summary evidence
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div>
            <p className="small-caps-label">Live event stream</p>
            <pre className="mt-2 max-h-64 overflow-auto rounded border border-border bg-background/60 p-3 text-xs">
              {(data.run.log ?? []).map((entry) => `${stamp(entry.at)}  ${entry.message}`).join("\n") ||
                "No events recorded."}
            </pre>
          </div>

          {data.run.notes ? (
            <p className="text-xs text-muted-foreground">Findings: {data.run.notes}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {current.isLoading ? "Loading…" : "No validation run has been executed yet."}
        </p>
      )}

      <div>
        <p className="small-caps-label">Run history</p>
        <ul className="mt-2 space-y-1 text-xs">
          {(runs.data ?? []).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setRunId(r.id)}
                className="text-left underline decoration-dotted underline-offset-4"
              >
                #{r.run_number} · {SUITE_LABELS[r.suite as ValidationSuite] ?? r.suite} ·{" "}
                {r.overall_status} · {r.tests_passed}/{r.tests_total} · {r.verdict ?? "—"} ·{" "}
                {stamp(r.started_at)}
              </button>
            </li>
          ))}
          {!(runs.data ?? []).length ? <li className="text-muted-foreground">No runs yet.</li> : null}
        </ul>
      </div>

      {evidence ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-t-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg">{evidence.title}</h3>
              <button type="button" onClick={() => setEvidence(null)} className="text-sm underline">
                Close
              </button>
            </div>
            <pre className="overflow-auto text-xs">{JSON.stringify(evidence.body, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </section>
  );
}
