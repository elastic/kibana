# @kbn/evals-suite-attack-discovery-fp-tp-real-workflow

FP/TP verdict eval suite for the Attack Discovery FP/TP analysis workflow, built on
the `@kbn/evals` harness. This package currently ships the dataset layer: 7
vendored, validated JSONL corpora (1,017 cases), the corpus loader, cohort
selection, the Playwright budget calculation, and the evaluators that grade the
workflow's structured verdict. The workflow task module and the Playwright eval
that drive the real workflow are added in a follow-up.

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

- `src/corpus_loader.ts`: JSONL loading plus schema/enum/count validation (throws on invalid)
- `src/cohort.ts`: cohort selection (which corpora are scored, excluded, or evidence-gated)
- `src/budget.ts`: Playwright timeout derived from cohort size, repetitions and concurrency
- `src/evaluators.ts`: `VerdictAccuracy`, `PayloadConformance`, `UnsafeClose`, and the LLM criteria set
- `src/judge_retry.ts`: retries the LLM verdict judge on transient connection errors
- `src/constants.ts`: corpus registry with known case counts (regression guard)
- `corpora/`: the 7 vendored corpora plus READMEs
- `docs/label_integrity_findings.md`: label-integrity review of the corpora

## Cohort selection and the safety metric

`FP_TP_COHORT` picks which corpora a run grades:

| value | corpora | cases |
| --- | --- | --- |
| `evidenced` (default) | non-sanity rows that carry raw `events`, minus contested-label rows | 21 of 1,017 |
| `scored` | everything except `guide-sanity`, minus contested-label rows (exploratory) | 249 |
| `all` | all 7 corpora, minus contested-label rows (exploratory) | 999 |
| `sanity` | `guide-sanity` only | 750 |

`evidenced` is the only cohort whose rows the workflow can decide on, which is why
it is the default: with `FP_TP_COHORT` unset, VerdictAccuracy measures model
correctness rather than missing harness evidence. The analysis workflow reads
`entities-latest-<space>` and `logs-endpoint.events.*` and cannot clear an alert
without them, so rows with no evidence abstain by design. Under `evidenced` the
rows without events are excluded (neither scored nor counted as abstention
failures). `scored` and `all` still grade those rows and are for exploratory
sweeps only; do not read their accuracy as a model number.

Contested-label rows are excluded from **every** cohort. 18 of the 21
`adversarial-twins` rows (`domain-swap`, `entity-role-swap`, `parent-process-spoof`,
`chain-reorder`) carry a gold label their own evidence contradicts; see
`docs/label_integrity_findings.md` and `CONTESTED_MUTATION_TYPES` in `src/cohort.ts`.
The three `drop-link` twins stay. The scored/excluded counts are printed at startup.
Report results as n=21 with confidence intervals; do not extrapolate to the full
corpus.

A scored/gating run uses the default `evidenced` cohort. An unknown value throws rather
than falling back. `FP_TP_MAX_EXAMPLES_PER_CORPUS` (default 15, no cap under
`evidenced`; `0` or non-numeric means no cap) applies per corpus on top of the cohort.

## Tests

`node scripts/jest --config x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery-fp-tp-real-workflow/jest.config.js`
runs the unit suite: loader validation against the real vendored corpora,
corrupt-label/duplicate-id/mutation-spec mutation tests, cohort and budget
selection, evaluator scoring, and judge retry behaviour.
