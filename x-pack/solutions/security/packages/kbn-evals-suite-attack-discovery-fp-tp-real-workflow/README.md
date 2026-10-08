# @kbn/evals-suite-attack-discovery-fp-tp-real-workflow

FP/TP verdict eval suite for the attack-discovery review workflow, built on the
`@kbn/evals` harness. Ships 7 vendored, validated JSONL corpora (1,017 cases) plus
the corpus loader, workflow task module, and evaluators that grade the review
step's structured verdict.

> **Status: harness + dataset validated, verdict path pending.** The review
> workflow under test is still a stub on main
> ([security-team#19282](https://github.com/elastic/security-team/issues/19282));
> the suite currently validates the run/poll/structured-output plumbing and the
> dataset layer. Once the stub lands, the Playwright eval drives it end-to-end.

## Corpus provenance

All corpora live in `corpora/*.jsonl` with per-corpus READMEs. Schema is
validated at load time (`src/corpus_loader.ts`) with the same semantics as
`validate.py` in the source repo.

| Corpus | Cases | Labels (TP/FP/Inconclusive) | Provenance | Flags / permitted use |
| --- | --- | --- | --- | --- |
| guide-sanity | 750 | 300 / 225 / 225 | `public` (GUIDE eval slice; ~21.6% majority-vote label noise) | **SANITY ONLY — acceptance thresholds against these labels are forbidden** |
| botsv3-benign-day | 96 | 0 / 96 / 0 | `replay` (BOTSv3 benign day, no attack) | FP regression set |
| botsv3-fp-alerts | 54 | 0 / 54 / 0 | `replay` (BOTSv3 alerts, honest known-FP slice; labels not human-adjudicated) | **PROVISIONAL** — pending review |
| tp-chains | 3 | 3 / 0 / 0 | `replay` (multi-stage BOTSv3 attack chains) | Small TP smoke set |
| adversarial-twins | 21 | 0 / 15 / 6 | `adversarial-mutation` (synthetic twins; every case carries `mutation_spec` naming the broken invariant) | Robustness: label must flip with the invariant |
| perturbations | 15 | 12 / 0 / 3 | `adversarial-mutation` (synthetic) | Robustness |
| cloud-fp-synthetic | 78 | 0 / 73 / 5 | `synthetic` (hand-built ECS fixtures from cloud-rule `false_positives` notes; per-clause verified) | **PROVISIONAL** — synthetic fixtures, detection-logic sanity and FP-condition modeling only |

Total: **1,017 cases.** Raw source telemetry (837MB BOTSv3 capture, GUIDE CSV)
is intentionally **not** vendored — see the external
`alertzero-datasets` repository for raw data, build scripts, and
`ACCEPTANCE.md` (corpus acceptance criteria and validation evidence).

## Permitted-use rules

- **GUIDE sanity-only:** `guide-sanity` labels are noisy public annotations.
  They may sanity-check system verdicts at the corpus level; pass/fail gates
  computed against them are forbidden.
- **PROVISIONAL:** `botsv3-fp-alerts` and `cloud-fp-synthetic` labels are not
  yet human-reviewed. Results against them are directional, not gating.
  Whether cloud-fp-synthetic is included in graded runs vs. kept untested is
  a review-time decision.
- The loader surfaces `sanityOnly` / `provisional` on every example's metadata
  so runners and reports can enforce these rules mechanically.

## Layout

- `src/corpus_loader.ts` — JSONL loading + schema/enum/count validation (throws on invalid)
- `src/workflow_task.ts` — `POST /api/workflows/{id}/run` + poll + `ai.agent`
  structured-output verdict extraction
- `src/evaluators.ts` — `VerdictAccuracy` (CODE, primary), `PayloadConformance`
  (CODE: label enum + `summary_markdown` present and ≤ 8k chars), and the LLM
  criteria set for verdict-quality review
- `src/constants.ts` — corpus registry with known case counts (regression guard)
- `evals/attack_discovery_fp_tp.spec.ts` — the Playwright eval (gated on the
  review workflow landing)
- `corpora/` — the 7 vendored corpora + READMEs

## Cohort selection and the safety metric

`FP_TP_COHORT` picks which corpora a run grades:

| value | corpora | cases |
| --- | --- | --- |
| `all` (default) | all 7 | 1,017 |
| `scored` | everything except `guide-sanity` | 267 |
| `sanity` | `guide-sanity` only | 750 |

A scored/gating run uses `FP_TP_COHORT=scored`. An unknown value throws rather
than falling back to `all`. `FP_TP_MAX_EXAMPLES_PER_CORPUS` (default 15; `0` or
non-numeric means no cap) applies per corpus on top of the cohort.

## Subject-model routing and Playwright budget

The workflow's `ai.agent` step resolves its connector from the
`alertzero_reasoning` inference feature, so `beforeAll` routes that feature to
the Playwright project's connector (`src/subject_model_routing.ts`, reusing the
sibling suite's `overrideInferenceFeature`) and `afterAll` restores the previous
settings. Without it, every model column would grade the space default
connector. Each row's task output carries `agentConnectorId`
(`metadata.usage.connectorId` from the `ai.agent` step) so per-row routing is
verifiable in results.

The Playwright test timeout is derived (`src/budget.ts`) from
`FP_TP_COHORT`, `FP_TP_MAX_EXAMPLES_PER_CORPUS`, `EVAL_REPETITIONS`, and
`EVAL_CONCURRENCY` (default 5) — 60s/case of wall clock, never below the
original 120 min. The full scored cohort (267 cases) × 3 reps at default
concurrency yields ceil(267·3/5) = 161 waves ≈ 161 min.

`UnsafeClose` scores 0 for any case where the verdict is `false_positive` and the
gold label is anything else. It is the `UnsafeClose` evaluator from
`@kbn/evals-suite-attack-discovery-fp-tp`, adapted to this suite's output shape.
It is zero-tolerance and reported on its own: never average it into, or weight
it against, `VerdictAccuracy`.

## Tests

`npx jest x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery-fp-tp-real-workflow`
runs the unit suite: loader validation against the real vendored corpora,
corrupt-label/duplicate-id/mutation-spec mutation tests, evaluator scoring, and
workflow task run/poll/verdict plumbing.
