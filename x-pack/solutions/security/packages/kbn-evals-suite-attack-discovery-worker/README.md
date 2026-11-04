# @kbn/evals-suite-attack-discovery-worker

End-to-end evals for the AlertZero Attack Discovery Worker, scoped **through review**: from alert
retrieval to the verdict parked at the analyst gate.

Each dataset row seeds one scenario into an isolated space (`ad-worker-eval`), triggers the global
runner workflow (`system-security-attack-discovery-worker`) once, polls the resulting review
workflows until they park, and scores what happened.

## What a row checks

| Step                                              | Gate type |
| ------------------------------------------------- | --------- |
| The runner completed, ran steps, and did not time out | code  |
| Exactly the seeded alerts were open and analyzed, none unseeded cited | code |
| Discoveries were persisted (audit evaluators)     | code      |
| Fingerprints were matched and dispatched          | code      |
| Every review ended or parked within the wait      | code      |
| Exactly one review per unmatched attack           | code      |
| An Investigation was opened                       | code      |
| FP/TP verdict matches the per-scenario gold       | code      |
| TP and inconclusive verdicts park at an open analyst gate (escalated, gate step still open, no gate failure) | code |
| The worker outcome was reported and its persisted count matches a separate count of the attack discovery index (scoped to the run's generation uuids) | code |
| Each stage ran on the endpoint the cohort planned (`StageModelResolved`) | code |
| Discovery and verdict quality                     | LLM judge (reported, never gates) |

Code scores gate through `assertCodeScoresPass`: a `null` score is never a pass, and `N/A` and
`MISSING` are distinct outcomes. A code check passes at a score of 1, except the graded ones listed
in `CODE_PASS_THRESHOLDS` (`run_summary.ts`): `PositiveControlRecall` passes at a recall of 0.6 or
more, the same threshold behind its `recalled`/`missed` label.

Seeding cleans up after itself: if the bulk write or the read-back fails midway, `seedScenario`
deletes the alerts it meant to write by exact document id before it throws, so the next row starts
in a clean space. A delete by id also reaches documents that are indexed but not yet searchable
after a transport failure; a missing document or index counts as cleaned, any other failed item is
reported together with the seed error. Fingerprints and discoveries are left alone: the workflow has
not started, so there are none from this seed. After a row has run, `cleanupSeed` clears the alerts
(matched exactly by its run marker), the space's fingerprints and its discoveries, and fails if a
delete reports failures or version conflicts.

`src/config_load_path.test.ts` loads `playwright.config.ts` and fails if any raw-text module
(`.yaml`, `.yml`, `.txt`, `.html`, `.peggy`) ends up loaded at config time (the
`@kbn/workflows/managed` barrel and deep imports of its definitions both do). Jest transforms those
but the Playwright loader cannot parse them. The guard mocks `@kbn/evals`, so it assumes that
package loads no such module itself.

`StageModelResolved` reads what each stage actually ran on and fails on a mismatch or when it
cannot be read. Generation is read from `api_config.connector_id` on the persisted discoveries;
the review from the `connectorId` in the `analyze` step usage of the analysis execution. Both are
compared with the planned endpoint id. The resolved model and the review token usage are stamped on
the score metadata (`generation.resolved_model`, `review.resolved_model`, `review.input_tokens`,
`review.output_tokens`, `review.cached_tokens`). Generation token usage is not reported by the
runner, so it is marked unavailable (`generation.tokens_available: false`).

Per-scenario gold:

| Scenario                              | Expected verdict                         |
| ------------------------------------- | ---------------------------------------- |
| `benign-batch`                        | FP                                       |
| `shared-ci-egress`                    | FP                                       |
| `threshold-meta-alerts`               | FP                                       |
| `positive-chain-with-noise`           | TP                                       |
| `same-display-name-cross-account`     | inconclusive (TP also accepted)          |

The suite runs the worker with `autonomy: 'manual'` so that TP and inconclusive verdicts stop at the
escalation gate instead of proceeding.

## Follow-ups (not covered)

- The attach path (a finding attached to an existing Investigation).
- The approve and dismiss specs (what happens after the analyst acts at the gate).

## Cohorts

`AD_WORKER_EVAL_COHORT` selects which stage the model under test drives. The other stage is pinned to
`AD_WORKER_EVAL_REFERENCE_MODEL`.

| Cohort       | Generation                | Review                    |
| ------------ | ------------------------- | ------------------------- |
| `whole`      | model under test          | model under test          |
| `generation` | model under test          | reference model           |
| `review`     | reference model           | model under test          |

The `generation` and `review` cohorts require a reference model that differs from the model under
test; the suite throws otherwise. Every score document carries the cohort, generation model, review
model and stage in its metadata. A unit test (`cohort_routing.test.ts`) proves each cohort resolves
the two stages to the expected models.

The `alertzero_frontier` and `alertzero_template_models` inference features are routed for the
duration of the run and restored afterwards.

```bash
# whole pipeline on one model
AD_WORKER_EVAL_COHORT=whole \
  node scripts/evals start --suite security-attack-discovery-worker --model <model-id>

# generation under test, review pinned to the reference model
AD_WORKER_EVAL_COHORT=generation AD_WORKER_EVAL_REFERENCE_MODEL=<reference-id> \
  node scripts/evals start --suite security-attack-discovery-worker --model <model-id>

# review under test, generation pinned to the reference model
AD_WORKER_EVAL_COHORT=review AD_WORKER_EVAL_REFERENCE_MODEL=<reference-id> \
  node scripts/evals start --suite security-attack-discovery-worker --model <model-id>
```

## Running

- The runner is manual-trigger only and is global, so the suite triggers it directly in the eval
  space through `/s/<space>/api/workflows/workflow/<id>/run`. No per-space floor Worker has to be
  installed.
- The Scout config set `evals_attack_discovery_worker` starts the stack with
  `xpack.alertzero.enabled`, `xpack.agenticInvestigations.enabled`, `xpack.proposals.enabled` and
  service accounts enabled. Without service accounts AlertZero installs no managed workflows.
- The per-space `securitySolution:enableAlertZero` setting is set by the preflight spec.
- Specs run with one Playwright worker: the runner's concurrency key is per space with
  cancel-in-progress.
- Timeouts: runner 40 min, review settle 20 min, Playwright rows x (runner + review settle +
  10 min overhead) per test (350 min for 5 rows), so the suite's own timeouts fire first. Wall time
  per row is dominated by one generation batch plus one review per unmatched attack (review
  concurrency 2).
- CI step timeout: `stepTimeoutInMinutes` in `.buildkite/pipelines/evals/evals.suites.json` is 395
  min, the 350 min Playwright timeout plus 45 min for bootstrap, Scout boot and report upload.
  Without it the step falls back to the 120 min default and Buildkite kills it before the suite's own
  timeouts fire, losing every score. `src/ci_step_timeout.test.ts` fails if the step timeout drops
  below the Playwright timeout (for example when a dataset row is added).

This suite has no entry in the weekly CI pipeline; it is cohort-driven and run on demand
(`evals:security-attack-discovery-worker` label).

## Provenance

The scenarios and the audit evaluators under `src/audit_failure_classes/` are copied from
`@kbn/evals-suite-attack-discovery` (elastic/kibana#302714, `src/audit_failure_classes/`). Suites do
not import from one another. The world seeding, inference routing and Entity Store handling follow
`@kbn/evals-suite-attack-discovery-fp-tp`. The package layout follows `@kbn/evals-suite-hunt-watch`.

## Tests

```bash
node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery-worker
```

Includes a dataset contract test and a positive-control test that proves the evaluators can fail.
