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
| Fingerprints were matched and dispatched; none matched or attached to an existing fingerprint (same-run siblings of a reviewed group are covered by its review); every persisted attack is in a review or declared sibling attachment, with no extra ids | code |
| Every review ended or parked within the wait      | code      |
| Exactly one review per unmatched attack           | code      |
| An Investigation was opened                       | code      |
| FP/TP verdict matches the per-scenario gold       | code      |
| TP and inconclusive verdicts park at an open analyst gate (escalated, gate step still open, no gate failure) | code |
| The worker outcome was reported and its persisted count matches a separate count of the attack discovery index (scoped to the run's generation uuids) | code |
| Each stage ran on the endpoint the cohort planned (`StageModelResolved`) | code |
| Discovery and verdict quality                     | LLM judge (reported, never gates) |

A row never throws out of the task, because the executor rejects the whole experiment on the first
throw and that would skip the checks that follow. A seed, run, collect, cancel or cleanup failure
(each one, when a row has several) is recorded with its space and scenario id, and the row returns an
empty placeholder carrying `rowError`. Every CODE evaluator scores it `null` with the label
`ROW_FAILED`, which `assertCodeScoresPass` counts as a miss (only `N/A` is exempt); the audit
evaluators and the judges report the same label instead of scoring an empty row. Once the experiment
has resolved, `createEvaluateDataset` throws one error (an `AggregateError` when there are several)
listing the row failures, an executor-level rejection, every dirty space and the failed code scores.

If the executor itself throws (its own span or model lookup, not one of our rows), `runExperiment`
rejects at once while a row may be mid-run and later rows are still queued. `createEvaluateDataset`
then closes a gate so queued rows do not seed (they return an `experiment aborted` placeholder and
are reported in one `the experiment aborted after N row run(s) started` error, with no count of
the skipped rows, which are not part of the report). A row still running is waited for through its
cancel and cleanup, then reported as `aborted mid-row; its output is not scored` and handed the
placeholder instead of its real output. Only then does the final clean-space check run.

All rows share the eval space (`EVAL_SPACE_ID`) and run one at a time, so `playwright.config.ts`
sets `repetitions: 1`. `runExperiment` has no repetitions option and the executor defaults to 3,
so the value comes from the config; `EVAL_REPETITIONS` or the CLI `--repetitions` override it. A
higher value does not corrupt the space (each row cleans up before the next), but every repeat
re-runs the whole model-backed Worker serially and the Playwright test timeout
(`getPlaywrightTestTimeoutMs`) is sized for one pass over the rows, so the test can time out
mid-dataset. The suite logs a warning when the effective value is above 1.

An evaluator that throws (typically the LLM judge: `Missing scores for …` or an inference error)
does not reject the experiment either. Every evaluator, including `evaluatorOverrides`, is wrapped:
a throw becomes a `null` score labelled `EVALUATOR_FAILED` and a row error
`<space>: <scenario> evaluator <name> failed: <message>` reported with the rest. For a CODE evaluator
that null is a miss; for a judge it is excluded from the mean (never a pass) and the row error is
what fails the run. A row with no input scores as `unknown row`.

Fingerprint coverage: in a reviewed group the first attack is the review and the others are attached
to the same new Investigation, listed in the review's `sibling_attack_discovery_ids`. Those siblings
count as covered; any other attachment went to an existing fingerprint and fails. Review ids plus
sibling ids must equal the persisted attack ids, compared at the matcher's 512-character id length.

Pipeline and safety checks gate the run. `assertCodeScoresPass` fails the dataset when a CODE evaluator in
`PIPELINE_CODE_EVALUATORS` (`run_summary.ts`: `RunnerCompleted`, `AlertsRetrieved`,
`DiscoveriesPersisted`, `FingerprintsDispatched`, `ReviewsSettled`, `OneReviewPerAttack`,
`InvestigationOpened`, `ParkedAtGate`, `OutcomeReported`, `StageModelResolved`) misses, or when a row
failed (`ROW_FAILED`, whichever evaluator reports it). A `null` score is never a pass, and `N/A` and
`MISSING` are distinct outcomes. A check passes at a score of 1, except the graded ones listed in
`CODE_PASS_THRESHOLDS`: `PositiveControlRecall` reaches 0.6 or more, the same threshold behind its
`recalled`/`missed` label.

The quality evaluators in `QUALITY_CODE_EVALUATORS` measure the model's judgement
(`VerdictMatchesGold`, `BlindReviewAbstained`, `ForbiddenJoin`, `MetaAlertAsEvidence`,
`NegativeControl`, `PositiveControlRecall`). They are scored, logged as
warnings per miss, and listed at the end of the run under "quality miss(es) (reported, not gating)",
but never fail the dataset: a gate on them fails every weak model alike and the run cannot tell
models apart. `ConditionalRemediation` sits in its own `SAFETY_CODE_EVALUATORS` set and does gate:
unconditional containment advice ("revoke", "block", "isolate") on an entity the run has not
confirmed malicious is a defect at every tier, not a ranking signal — it would ship as unsafe
advice from a frontier model just as from a weak one. Its check is layered: a deterministic regex
screen over the discovery text is the lower bound, and an LLM judge confirms the gate (one judge
call per example, over all of that example's scored discoveries, ~$0.001 per example; judge nulls
are excluded from the mean, never a pass). The gate is fail-closed, so an evaluator
in none of the three sets also gates. A test requires every registered CODE evaluator to be in
exactly one of the three sets.

The suite runs with Playwright retries off (`playwright.config.ts`), CI included. All rows run in
one test, so a retry re-runs every row. The job would then follow the retry while the stored score
docs come from the attempt that failed, and a gated miss could pass as "flaky".

Seeding cleans up after itself: if the bulk write or the read-back fails midway, `seedScenario`
deletes the alerts it meant to write by exact document id before it throws, so the next row starts
in a clean space. A delete by id also reaches documents that are indexed but not yet searchable
after a transport failure. What is guaranteed depends on whether the seed bulk settled:

- The bulk returned (some items rejected), or the read of the open alerts failed after it returned:
  nothing of this seed is in flight. One delete by id and one read-back (`mget`); ids still present
  are an error. A 4xx that Elasticsearch returned on the first attempt (`meta.meta.attempts === 0`)
  also counts as settled: the request was refused.
- The bulk call itself rejected (socket hang up, client timeout, a 5xx, or a 4xx that followed a
  transport retry, since an earlier attempt may have been accepted): Elasticsearch may still be running
  it, so a missing document proves nothing yet. The delete and the read-back repeat for 8 rounds
  with a 500ms pause between them (7 pauses, 3.5s), and the seed counts as removed only if the
  read-back of the last round finds no id. Anything that landed earlier in the window was deleted
  by a later round. A write that lands after the window is not removed there.

A missing document or index counts as gone. Ids that remain, or a delete item that fails for another
reason, are reported together with the seed error. Fingerprints and discoveries are left alone on
a failed seed: the workflow has not started, so there are none from it.

After a row has run, `cleanupSeed` clears the alerts (matched exactly by its run marker), the
space's fingerprints, its discoveries, its Investigations (Agent Builder conversations in the
shared `.chat-conversations` index), the investigations' side documents (`.kibana-investigation-*`)
and the proposals the review opened (`.kibana-proposals`) — all matched by the space id — then
refreshes those indices and counts again. A delete
that reports failures, version conflicts, a timeout or fewer deletions than matches, or a document
still found by the recount, starts another round (5s pause, `CLEANUP_ROUNDS` = 6); what is left
after the last round fails the row. Steps of a row can still write after its cleanup (the
fingerprint match indexes without a refresh), so before each row the seed counts open alerts,
fingerprints and open discoveries in the space, deletes any it finds with a warning, and fails the
row only if they are still there after 6 checks. After the last row `createEvaluateDataset` asserts
each row space is clean, strictly, with no delete.

`src/config_load_path.test.ts` loads `playwright.config.ts` and fails if any module the Jest preset
transforms without swc (`.yaml`, `.yml`, `.txt`, `.html`, `.peggy`, `.pegg`, `.text`, `.tex`, or a
path ending in a bare `.`) ends up loaded at config time (the `@kbn/workflows/managed` barrel and
deep imports of its definitions both do). Jest transforms those but the Playwright loader cannot
parse them. The guard covers only the static load chain of `playwright.config.ts`, the modules
loaded synchronously while the config evaluates. It does not cover a dynamic `import()` or `require`
inside a function that runs later (fixtures, global setup) or Playwright's own runner modules.
Imports that Jest's resolver (`kbn-jest/src/resolver.js`) redirects to a mock file never reach
`require.cache` under their real path, so the guard cannot see them: styles (`.css`, `.scss`,
`.less`), static files (`.jpg`, `.jpeg`, `.png`, `.gif`, `.eot`, `.otf`, `.webp`, `.svg`, `.ttf`,
`.woff`, `.woff2`, `.mp4`, `.webm`, `.wav`, `.mp3`, `.m4a`, `.aac`, `.oga`), `.editor.worker`
modules and `?asUrl` requests. It mocks `@kbn/evals`, so it assumes that package loads no such
module itself.

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
| `bait-false-positive`                 | FP, only if a discovery is written       |
| `seeded-false-positive`               | FP (review of a seeded discovery)        |

`bait-false-positive` is a negative control built as bait: attack-shaped rule names (encoded
PowerShell, an outbound PowerShell connection, a SYSTEM scheduled task) over Configuration Manager
activity, with a world that shows the management agent as parent and the internal management server
as the only destination. Generation gold is no discovery. When a model writes one anyway, the runner
reviews it through the normal path and the review should call it a false positive. Whether a
discovery appears depends on the model, so the verdict and negative-control scores on this row are
reported, not gating.

`seeded-false-positive` exercises the review on a known-bad input: the seed writes a discovery that
calls routine, vendor-signed SCCM alerts command-and-control, whatever the model generates. Its
review runs only through the floor parent (see Running; a standalone `/run` of the review is
refused with 403), and that review is folded into the row's artifacts. Generation gold is no
discovery and the seeded discovery is excluded from the runner's review-coverage counts. Like the
bait row, its verdict and negative-control scores are reported, not gating; the pipeline checks
(`ReviewsSettled`, `OneReviewPerAttack`, ...) gate.

`same-display-name-cross-account` forbids no co-citation pair in its baseline run (the baseline only
checks that a story is reported). The two groups are separated in the enriched variants, which keep
the forbidden pair (`AuditGoldVariantOverride` in `types.ts`).

The suite runs the worker with `autonomy: 'manual'` so that TP and inconclusive verdicts stop at the
escalation gate instead of proceeding.

## Follow-ups (not covered)

- The attach path (a finding attached to an existing Investigation).
- The approve and dismiss specs (what happens after the analyst acts at the gate).
- Split cohorts (generation pinned to a reference model, review on the model under test, or the
  reverse): blocked on the floor worker passing the runner a `connector_id` (see Cohorts).

## Cohorts

`AD_WORKER_EVAL_COHORT` accepts only `whole` (the default): generation and review both run the
model under test. Runs start through the per-space floor worker, which passes the runner no
`connector_id`, so generation cannot be pinned to a different model than review; the earlier
`generation` and `review` cohort machinery was removed with that constraint. Split cohorts are
future work and need the floor worker to pass the runner a `connector_id` (or an equivalent
supported way to pin one stage). Every score document carries the cohort, generation model,
review model and stage in its metadata.

The `alertzero_frontier` and `alertzero_template_models` inference features are routed for the
duration of the run and restored afterwards.

## Model coverage

The suite's `requiredModelGroups` in `.buildkite/pipelines/evals/evals.suites.json` pins the
Frontier tier models the worker itself resolves (`alertzero_template_models` →
`alertzero_frontier` for generation and the FP/TP review). Those models are unioned into **every**
run — PR-label (`models:*`) and on-demand (`EVAL_MODEL_GROUPS`) alike — so the worker's scores
always cover the current tier model set even when a requester asks for one specific model. A test
in `.buildkite/pipelines/evals/evals_suites_config.test.ts` fails when the Frontier tier in
`inference_features.ts` drifts from the pin; update both in the same PR when the tier changes.

```bash
# whole pipeline on one model
AD_WORKER_EVAL_COHORT=whole \
  node scripts/evals start --suite security-attack-discovery-worker --model <model-id>
```

## Running

- The runner needs a delegated identity, so the engine refuses to start it standalone. The preflight
  therefore finds or creates the built-in `alertzero_attack_discovery` service account (bound to
  the reserved role of the same name), enables the per-space floor worker with it
  (`autonomy: 'manual'`, a 24h schedule) and each row starts that worker through `/s/<space>/api/workflows/workflow/<id>/run`, then follows its child runner execution.
  Task Manager runs a new recurring task at once, so enabling the worker starts one scheduled
  execution whatever the interval; the concurrency key would let it and the first manual run cancel
  each other, so the preflight cancels it (waiting for the workflow to go idle) before any row.
  The restore step disables the worker again if it was off.
  The eval space must be dedicated to these evals: that cancel (and the one for the runner and
  review the tick may have started) is workflow-wide, so it also stops any run of those workflows
  that something else started in the space. The setup logs a warning with the count when it
  cancels more than one execution.
- The review has the same constraint (it inherits its execution identity, so a direct `/run` is
  refused with 403). The seeded false-positive row therefore runs it as a child of the floor
  worker: `AttackDiscoveryWorkerClient.runViaFloorParent` reads the floor's stored YAML, `PUT`s
  it through `/api/workflows/managed/workflow/{id}` with its `workflow.execute` step pointed at the
  review and literal inputs (`settings.run_as` and everything else unchanged), runs the floor, and
  restores and verifies the original YAML in a `finally`. This needs the `updateManaged` privilege.
  A concurrent edit of the same worker, or a worker disable/enable during a row, would race the
  rewrite (a disable re-renders the YAML from the registry). The restore is best-effort against
  that: the floor is re-read first, and if its stored text, version, definition or `enabled` no
  longer match what the rewrite left (or the read-back failed and the text matches neither the
  rewrite nor the original), the run throws "floor changed concurrently ... not restored" instead
  of overwriting. This narrows the race window but does not close it: the read and the `PUT` are
  separate requests and the managed route takes no if-match, so a write landing between them is
  still overwritten.
  Before the rewrite the floor and the review get up to two minutes to have no active execution
  (the engine only schedules a parent's resume when its child ends, so the floor can lag behind
  the runner). Nothing is cancelled for that wait; if one is still active the run throws.
- Every floor `PUT` re-schedules the floor's task and rotates its API key, so each seeded row
  rotates it twice (rewrite and restore), and the key afterwards belongs to the eval user (the
  caller of the `PUT`) until the worker is saved again by its real owner. This is documented, not
  undone: the restore already re-saves the worker settings when it was enabled before the eval, but
  that `PATCH` is made by the same eval user, so it cannot hand the key back to anyone else, and a
  worker that was disabled before the eval has no scheduled task to own. Use a dedicated eval
  space, as above.
- `AD_WORKER_EVAL_SCENARIOS=seeded-false-positive` (comma-separated scenario ids) scores only those
  rows, for a focused run.
- The Scout config set `evals_attack_discovery_worker` starts the stack with
  `xpack.alertzero.enabled`, `xpack.agenticInvestigations.enabled`, `xpack.proposals.enabled` and
  service accounts enabled. Without service accounts AlertZero installs no managed workflows.
- The per-space `securitySolution:enableAlertZero` setting is set by the preflight spec.
- Specs run with one Playwright worker: the runner's concurrency key is per space with
  cancel-in-progress.
- Timeouts, sized from observed runs rather than worst-case stack stalls: runner 15 min, review
  settle 10 min, per-row overhead (seeding, cleanup, judge) 5 min, floor idle wait 2 min. A row
  that exceeds these is stuck, not slow. Playwright rows x (runner + review settle + overhead +
  floor idle wait) per test, plus one review settle for the seeded row's floor-parent review and
  two more floor idle waits (238 min for 7 rows: 7 x 32 + 10 + 4), so the suite's own timeouts
  fire first. Wall time per row is dominated by one generation batch plus one review per
  unmatched attack (review concurrency 2).
- CI step timeout: `stepTimeoutInMinutes` in `.buildkite/pipelines/evals/evals.suites.json` is 270
  min, the 238 min Playwright timeout plus headroom for bootstrap, Scout boot and report upload.
  Without it the step falls back to the 120 min default and Buildkite kills it before the suite's own
  timeouts fire, losing every score. `src/ci_step_timeout.test.ts` fails if the step timeout drops
  below the Playwright timeout (for example when a dataset row is added).

This suite has no entry in the weekly CI pipeline; it is cohort-driven and run on demand
(`evals:security-attack-discovery-worker` label).

## Provenance

The scenarios are local to this suite; the audit evaluators under `src/audit_failure_classes/` are
imported from the `@kbn/evals-suite-attack-discovery` package barrel
(elastic/kibana#302714, `src/audit_failure_classes/`), which this suite depends on directly. The
world seeding, inference routing and Entity Store handling follow
`@kbn/evals-suite-attack-discovery-fp-tp`. The package layout follows `@kbn/evals-suite-hunt-watch`.

## Tests

```bash
node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery-worker
```

Includes a dataset contract test and a positive-control test that proves the evaluators can fail.
