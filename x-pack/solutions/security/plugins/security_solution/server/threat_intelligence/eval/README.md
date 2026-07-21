# Hunt eval-conformance seam

This directory holds **evaluation-conformance tests** for the continuous threat
hunt worker. They are deliberately separate from the worker's functional unit
tests (`../services/*.test.ts`, `../workflows/index.test.ts`): those prove the
feature *works*; these prove the feature is *evaluable*.

Two suites live here:

- **`hunt_eval_conformance.test.ts`** — unit-level invariants. Each test pins one
  invariant to a single exported function (id builder, persistence, workflow
  registration) in isolation.
- **`hunt_pipeline_e2e.test.ts`** — end-to-end pipeline eval. Drives the **real**
  orchestrator **and** the **real** persistence layer, mocking only the two leaf
  services that need a live ES query / live LLM. It proves the invariants survive
  when wired together on the exact path the scheduled worker runs on its cadence.
  (The feature's own `../services/hunt_orchestrator.test.ts` mocks
  `persist_hunt_findings`, so it never proves a durable outcome is written — this
  suite closes that gap.)

## Why a scheduled LLM worker needs a conformance seam

The continuous threat hunt is a scheduled, LLM-in-the-loop worker: it wakes on a
cadence, reasons over external threat reports, and proposes detections. A worker
like that cannot earn autonomy just by looking correct on a demo. It has to
satisfy a few invariants that an evaluation harness can check mechanically,
independent of any single hunt's output quality. This suite pins each invariant
to the worker's real exported behavior so a future refactor that breaks the seam
fails loudly instead of silently degrading the eval story.

## The four invariants

| Invariant | What it guarantees | Why an eval needs it |
| --- | --- | --- |
| **INV-1 — Durable outcome** | Each hunt finding is persisted with a stable, deterministic id (`buildHuntFindingId` over report + technique + day). | An outcome-level eval can only score what it can address run-over-run. No durable, stable-id outcome means the highest evidence an eval can produce is process-level, not outcome-level. |
| **INV-2 — Dedup fails closed** | Same-day re-runs collide on the deterministic id via `esClient.create` (create-only semantics → 409 on an existing id); a conflict is counted as *skipped*, a real error as *error* — never a silent duplicate. | A scheduled worker re-runs constantly. If dedup failed open, the corpus (and every metric computed over it) would inflate with duplicates. |
| **INV-3 — Source traceability** | Every finding carries the `report_id` and `technique_id` it came from; a behavior with no source report produces no finding. | When a hunt misses or false-positives, triage has to attribute it to *ingest* vs. *reasoning*. Orphan findings make that attribution impossible. |
| **INV-4 — Scheduled cadence is a contract** | The worker declares an explicit `scheduled` trigger + cadence in its definition, and the scheduled path routes through the persisting orchestrator. | The schedule is part of what gets evaluated and reviewed. A cadence buried in task-manager registration is neither visible to a reviewer nor assertable by a test. |

## The end-to-end pipeline eval

`hunt_pipeline_e2e.test.ts` re-proves the invariants above through the real
control flow instead of per-function. It runs the actual `huntOrchestrator` and
the actual `persistHuntFindings`, stubbing only `hunt_for_threat` (Tier 1 ES
probe) and `hunt_behavior` (Tier 2 LLM extraction):

| Case | What it proves end-to-end |
| --- | --- |
| **E2E-1 Durable outcome** | The real tier-gating → assembly → persistence path writes exactly one addressable, stable-id finding. |
| **E2E-2 Source traceability** | The persisted document carries `report_id`, `technique_id`, and a `hunt_run_id` — provenance survives the full pipeline, not just the leaf writer. |
| **E2E-3 Dedup fails closed** | A same-day re-run computes the same deterministic id, so ES `create` enforces dedup and no second row is appended. |
| **E2E-4 No outcome ⇒ no L4** | When Tier 2 is skipped, the pipeline persists nothing — the evidence ceiling stays at L3 exactly as the pyramid claims. |

## How to run

```
node scripts/jest --config x-pack/solutions/security/plugins/security_solution/jest.config.dev.js "server/threat_intelligence/eval/hunt" --maxWorkers=4
```

(Kibana's jest wrapper does not accept `--workerIdleMemoryLimit`; use
`--maxWorkers=4` or `--runInBand` to bound memory.)

## Relationship to a broader evaluation architecture

These suites are the worker-local floor of a larger evaluation model for
scheduled, autonomous security workers: a layered testing pyramid (unit →
artifact conformity → tool/step correctness → outcome quality → human review)
plus a separate deterministic **gate** axis (dedup, output validation, approval
and execution-identity boundaries) that must fail closed regardless of output
quality.

Mapped onto that pyramid:

| Pyramid layer | Covered by |
| --- | --- |
| **L0 — unit** | `hunt_eval_conformance` INV-1 (id determinism), INV-4 (workflow registration), INV-5 (output validation guard) |
| **L1 — artifact conformity** | INV-3 finding-shape provenance; E2E-2 provenance on the persisted document |
| **L2 — tool / step correctness** | E2E-1 tier-gating → assembly → persistence runs end-to-end; live-LLM scorecard (ES\|QL validity, hallucination rate, MITRE-aware technique accuracy, ECE + Brier calibration) |
| **L3 — outcome quality precondition** | E2E-4: no Tier-2 outcome ⇒ nothing persisted ⇒ evidence ceiling stays at L3. `hunt_behavior` is a single-call structured-output extraction (not a multi-turn agent loop), so L3 multi-turn trajectory eval does not apply to this route. If the full hunt worker wraps `hunt_behavior` in an agent loop, that loop's trajectory gets L3 separately. |
| **L4 — outcome eval reachability** | INV-1 + E2E-1/E2E-3: a durable, stable-id, deduped finding exists to score run-over-run. Live scorecard produces per-model `.evaluation-scores` docs with full provenance (experiment_id, example_id, model_id, git sha/branch). |
| **Gate axis** | INV-2 + E2E-3 dedup fails closed (A1); INV-5 output validation (A2 — with documented gap: empty `technique_id` is not currently guarded in the persistence layer) |

INV-1/INV-3 are the *durable-outcome* and *source-tier* preconditions that make
the higher pyramid layers reachable; the E2E suite proves those preconditions
hold through the real pipeline, not just per-function. Keeping all of this as
code here means the eval story for this worker is enforced by CI, not just
described in a design doc.

### Cross-cutting dimensions (PR #35 § 5)

| Dimension | Covered by |
| --- | --- |
| **Correctness** | MITRE-aware Technique Accuracy (parent ↔ child sub-technique matching); RAG Precision@32/Recall@32/F1@32 retained for comparison |
| **Evidence completeness** | Not yet measured (future: evidence-quote rubric) |
| **Precision** | MITRE-aware Precision in Technique Accuracy evaluator |
| **Recall** | MITRE-aware Recall in Technique Accuracy evaluator |
| **Confidence calibration** | ECE (primary, gate ≤ 0.10, PR #35 § 5.3) + Brier (supporting view); high-confidence bin rule (≥0.80 conf → ≥80% correct) |
| **Safety** | Benign negative-case (example 8: patch advisory → 0 techniques extracted); hallucination rate (100% real ATT&CK IDs) |
| **Cost** | Trace-based: latency, input tokens, output tokens |
| **Auditability** | Score docs carry experiment_id, git branch/sha, example_id, trace_id |
| **Trust / autonomy comfort** | Pilot stage (L6) |

### Deliberately out of scope here

Higher-level orchestration invariants — one queue entry per run
(Investigation grouping), parallel `executeAsync` fan-out with a correct join,
mid-run open-vs-append correlation, per-proposal human-in-the-loop, and
escalation as a lossless fork to a new root — are **not** asserted in these
suites, because this worker persists findings to an index rather than into the
orchestrator/queue object model those invariants govern. They are gated at that
layer (where a Watch orchestrator, an investigation container, and a fork
mechanism actually exist), not here. Asserting them against this worker would be
fabricated coverage. This suite proves exactly what this worker can prove:
a durable, deduped, source-traceable finding on an explicit cadence.
