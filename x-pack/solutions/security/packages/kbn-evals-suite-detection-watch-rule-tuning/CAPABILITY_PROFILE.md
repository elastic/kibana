# Capability Profile: Detection Watch Rule Tuning Worker

**Suite:** `detection-watch-rule-tuning` (`@kbn/evals-suite-detection-watch-rule-tuning`)
**Owner:** `@elastic/security-detection-engineering` (see `.github/CODEOWNERS`)
**Sibling suite:** `detection-watch-rule-creation` — same evaluator taxonomy, same reporting
conventions; this profile mirrors it and diverges only where the workflows differ.

---

## What we're betting on

The tuning review (`system-security-rule-tuning-review`) can read a cluster of analyst-dismissed
false positives, retrieve that exact alert evidence, and recommend the correct tuning path —
`exception`, `query`, `risk_score`, or `manual` — well enough that an approved recommendation can be
applied without eroding detection coverage. The sweep/workflow plumbing already exists; what is
unproven is the **decision quality**, and the only honest way to measure it is against golden labels
on a real stack.

## Evaluators: gate vs smoke

| Evaluator | Kind | Role | May drive a pass/fail claim? |
|-----------|------|------|------------------------------|
| `ChangeTypeAccuracy` | CODE, binary per example | **gate** — the primary discriminating metric: predicted tuning path == golden label | yes |
| `TuningQuality` | LLM judge (summary criteria) | **gate** — the summary must be grounded in the seeded FP evidence and justify the chosen path against the alternatives | yes |
| `Tool Routing` | CODE, trace-derived | **gate** — the diagnose step actually invoked `investigate-rule.get_alerts_by_ids` instead of answering from the prompt alone | yes when it returns a score — see N/A below |
| `ValidProposal` | CODE, structural | **smoke** — schema/apply-gate conformance (branch payload + summary). Expected to **saturate at 1.0**; it is a regression tripwire, not a model-quality metric | **no** — reported, never averaged in |
| canary | — | not implemented in this suite; the sibling's inverted-expectation canary (a deliberately unwinnable gap that must trip the quality gate) is the model to copy when this suite gets one | n/a |

Reporting rules that follow from the table:

- Every dataset run ends with a per-evaluator line: `mean ± CI95 (n=N)`, plus flags
  `SATURATED(no signal)`, `N/A×k`, `UNMEASURED` (`src/evaluators/run_summary.ts`).
- **A saturated evaluator is reported, never averaged into a pass/fail claim.** A `ValidProposal`
  of 1.000 across the dataset says the schema contract held, not that the worker got better.
- Deltas smaller than the combined CI95 are not resolvable at that n, whatever the means table
  looks like (`areDistinguishable`).
- **`Tool Routing` scores N/A, never 0, when no TOOL span is reachable** on either join key (the
  review execution's trace id, then the diagnose step's persisted `conversation_id`). Zero spans
  means the measurement failed, not that the agent skipped the tool; a confident 0 from an
  unmeasured trace is the exact false signal this evaluator exists to prevent. The setup probe
  (`assertToolSpansReachable` in the spec's `beforeAll`) fails the run loudly when the trace
  cluster is unreachable, so N/A cannot quietly become the norm.

## Pass / kill thresholds

**All numeric thresholds are unratified.** They are set against the first real
`EVAL_REPETITIONS=3` baseline (AZ-3e), not before it — see the tradeoff below.

| Signal | Threshold | Status |
|--------|-----------|--------|
| `ChangeTypeAccuracy` at `EVAL_REPETITIONS=3` on the golden set | ≥ TBD | unratified |
| `TuningQuality` at `EVAL_REPETITIONS=3` | ≥ TBD | unratified |
| Kill: any `ValidProposal` score < 1.0 | any miss | unratified (regression tripwire; a miss is a schema/gate bug or an unhandled branch, not a quality dip) |
| Kill: `Tool Routing` = 0 on a measured run | any instance | unratified |
| Kill: a tuning change applied without an approved gate | any instance | **hard rule** — the reject arm of `evals/rule_tuning_approval.spec.ts` asserts the rule query is byte-identical after a rejection; its gate conditions are pinned by `src/approval_gate_contract.test.ts` |
| Kill: golden label edited in the same commit as a score change | any instance | **hard rule** (relabeling goes through `coverage_characterization.test.ts` or not at all) |

## Threshold tradeoffs

**Ratify early** — a clear pass/fail line before Pilot, easier stakeholder buy-in. Risk: committing
to a number before knowing whether it is achievable creates pressure to massage the eval rather than
improve the worker.

**Leave unratified** — run honest evals first, negotiate the threshold against real data. Risk:
without a pre-agreed number, goalposts can shift after results come in. The playbook allows
unratified for an MVP slice but requires sign-off before a Pilot promotion claim.

## Open questions before Pilot

- **Label quality** — the golden labels in `evals/rule_tuning_decision.spec.ts` are re-derived from
  each fixture's own description and are **preliminary**. The first full run is a characterization
  baseline. Any relabel must go through the golden-label characterization test in the same commit,
  and must never be made to move a number.
- **Resolution** — n=1 sits inside the measured >0.11 run-to-run band and is not evidence; runs that
  are meant to support a comparison need `EVAL_REPETITIONS=3` or more.
- **Counterfactual** — what does an analyst actually approve for manually-tuned rules? That sets the
  bar for whether an accuracy number is good or merely acceptable.
- **Volume** — how many proposals per week reach the gate? A given FP rate is tolerable at 5/week
  and a burden at 100/week.
- **Qualitative** — add a one-question analyst satisfaction check alongside the numeric verdict.

## Out of scope (MVP)

- Ratifying any numeric threshold (see above).
- The sweep's harvesting behaviour (`rule_tuning_worker`) — its fan-out is exercised indirectly by
  every fixture run, but it is not scored here.
- The approval-gate arms — approve → rule query patched + alerts tagged applied; reject → rule
  query byte-identical + alerts tagged dismissed. Driven end-to-end by
  `evals/rule_tuning_approval.spec.ts`, and pinned without a stack by
  `src/approval_gate_contract.test.ts` (which evaluates the workflow's own gate conditions with the
  real engine). Neither one produces a score: they are deterministic pass/fail gate proofs, so they
  are never averaged into a model-quality claim.
- Watch Orchestrator / `watch_detection.yaml`; the rule-creation worker's own capability profile.
