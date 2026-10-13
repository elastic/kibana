# @kbn/evals-suite-attack-discovery-fp-tp

Outcome eval for the Attack Discovery FP/TP analysis ([security-team#19285](https://github.com/elastic/security-team/issues/19285)). It seeds a world around one persisted Attack Discovery, runs the analysis workflow, and grades the workflow's execution output against the contract posted on [security-team#19280](https://github.com/elastic/security-team/issues/19280).

## What it runs

The suite runs the managed analysis workflow (`system-security-attack-discovery-fp-tp-analysis`, shipped as `attack_discovery_fp_tp_analysis.yaml`) in place — it is not installed or modified by the suite. There is no sample copy: a second YAML would drift from the managed one (a stranded-reader bug on PR #294309 came from exactly that), so the managed workflow is the single source of truth.

Caveat: scores measure the shipped managed prompt, not the finished product. The numbers in this README are the managed-path baseline measured on the commit in this PR, not a claim about the finished product. ClaimGrounding: no baseline yet.

The workflow's `ai.agent` step runs `alertzero-thin-agent` with no tools and resolves its connector from the `alertzero_reasoning` inference feature. `beforeAll` routes that feature to the model under test and restores the previous inference settings in `afterAll`.

## Dataset

The dataset is every example of every scenario registered in `src/scenarios/index.ts`. There are two scenarios.

`encoded-powershell` is authored: encoded PowerShell on a workstation vs. an Intune/SCCM box (see [its README](src/scenarios/encoded_powershell/README.md)):

| Example | Situation | World | Gold outcome |
| --- | --- | --- | --- |
| `encoded-powershell.fp` | U1 | FP twin | `false_positive` |
| `encoded-powershell.tp` | U6 | TP twin | `true_positive` |
| `encoded-powershell.tp-entities-missing` | U6 | TP twin, no entity documents | `true_positive` |
| `encoded-powershell.fp-entities-missing` | U1 | FP twin, no entity documents | `inconclusive` |
| `encoded-powershell.tp-events-missing` | U6 | TP twin, no raw events | `inconclusive` |
| `encoded-powershell.mixed-world` | U1 | FP entities + TP events | `inconclusive` |
| `encoded-powershell.failed-missing-ad` | U6 | No Attack Discovery document | `failed` |
| `encoded-powershell.failed-missing-cited-alert` | U6 | The discovery cites an alert that is not seeded | `failed` |

`mimicrat-clickfix` replays the MIMICRAT ClickFix chain from [Elastic Security Labs](https://www.elastic.co/security-labs/threat-command/mimicrat-custom-rat-mimics-c2-frameworks), ported from [#293023](https://github.com/elastic/kibana/pull/293023). Its 15 examples are two base worlds, the replay and a benign mimic, and variants of them, so together they reach every branch of the verdict rules. See [its README](src/scenarios/mimicrat_clickfix/README.md) for the table.

A missing source is one-sided: it blocks `false_positive` (missing evidence cannot clear an alert) but not `true_positive`, which needs a supporting raw-event check (`process_parent` or `network_destination`). `entity_role` alone never escalates, so `tp-events-missing` stays `inconclusive`.

Situations follow the contract: U1 lookalike, U2 benign alerts, U3 invented chain, U4 shared egress or jump box, U5 ambient, U6 true attack.

Every example records its `provenance`, where its world came from: `authored` (written by hand) or `replay` (a published chain rendered as documents). A world whose checked facts are invented is `authored` even when it reuses a replay's alerts and discovery, as the MIMICRAT benign mimic does. An example derived from another example's world also records a `variant`: its `kind`, the base it changes (`of`), and a `description`; a variant has its base's provenance. Examples with `checks` state the result each world check should reach, and `registry.test.ts` requires the gold to follow from them under the workflow's verdict rules (`deriveFpTpOutcome`). A `mutation` must change at least one check result against its base; one that changes none, such as reordering events, tests nothing new. A `perturbation` changes evidence the checks do not read, so it must change none, and its gold stays that of its base. `provisional` marks a gold that is not agreed yet. `deriveFpTpOutcome` mirrors the rules as `FP_TP_VERDICT_RULES` states them, and a test fails when that text and `attack_discovery_fp_tp_analysis.yaml` diverge.

Each example's metadata carries its scenario, situation, evidence state, provenance, variant kind and base, and whether it is provisional, so reports can be sliced by any of them. Every task seeds its documents under a fresh run marker and suffix (`uniquify`), so repetitions and examples never share a document, and deletes them when it ends.

Setup stops Entity Store log extraction (`PUT /api/security/entity_store/stop`) for the duration of the suite. Otherwise the store builds entities from the seeded raw events, and a world seeded without entities (`tp-entities-missing`) would gain them mid-run. Cleanup also deletes any entity on a seeded host. Teardown restarts extraction if it was running before the suite started. If a run is killed before teardown, run `PUT /api/security/entity_store/start` to resume it.

## Layout

```
src/
  world/                  Scenario-agnostic: world and gold types, seeding and cleanup,
                          uniquify, timestamp shifting, evidence-state helpers,
                          chain builder, mutations, verdict rules
  scenarios/
    index.ts              Registry: FP_TP_SCENARIOS, FP_TP_EXAMPLES, buildFpTpExampleWorld
    types.ts              FpTpScenario, FpTpExample, FpTpSituation, FpTpEvidenceState
    registry.test.ts      Invariants every scenario must hold
    encoded_powershell/   One authored scenario: ids, attack, entities, event overlays, gold, examples
    mimicrat_clickfix/    One replayed chain, its benign mimic, and their variants
  workflow_task.ts        Runs the workflow and reads its output
  evaluators.ts
```

## Adding a scenario

1. Create `src/scenarios/<scenario_key>/`. Either:
   - model it on `encoded_powershell/`: build alerts and raw events from a registry scenario in `@kbn/evals-suite-attack-discovery-agent-builder` (`buildAd2SeedPlan`), then add the authored attack, entity documents, event overlays, and gold for each twin; or
   - model it on `mimicrat_clickfix/`: write the chain as an `FpTpChainDefinition` (events, alert stages, discovery text) and render it with `buildChainWorld`, then derive variants with the helpers in `src/world/mutations.ts`. Each helper throws when no raw event matches, so a rewrite whose target moved fails the build instead of changing nothing.
2. Export an `FpTpScenario` from its `index.ts`:
   - `key`: the scenario key; every example id must start with `<key>.`.
   - `sharedNames`: every name the run marker does not make unique (attack id, host names, user names). `uniquify` suffixes them per run.
   - `twins`: the complete worlds a person can seed by hand, keyed by variant.
   - `examples`: one entry per eval example, with its situation, evidence state, gold outcome, provenance, `variant` if it changes another example's world, `checks` where the gold follows from the verdict rules, and `buildWorld(runMarker)`. Use the helpers in `src/world/evidence_states.ts` for the degraded-evidence and failure examples.
3. Add the scenario to `FP_TP_SCENARIOS` in `src/scenarios/index.ts`.
4. Run the package's jest tests. `registry.test.ts` checks the new examples for unique ids, no unsuffixed shared names, disjoint documents across runs, raw events inside the workflow's ±2h window, golds that follow from `checks`, variants whose base is in the same scenario, mutations that change a check result against their base, and perturbations that change none.

## Evaluators

- `OutcomeAccuracy` (primary): the outcome matches the gold; a `failed` gold also needs an explicit `FAILED` execution, so a timeout or cancellation does not pass. The label is the predicted outcome, so the report reads as a confusion matrix.
- `UnsafeClose`: 0 when the run predicts `false_positive` and the gold is anything else. A false positive closes the attack.
- `PayloadConformance`: the run completed and has a supported verdict, a non-empty `summary_markdown` of at most 8000 characters, a `rationale_markdown` of at most 50000 characters when present, and an `attack_discovery_id` that echoes the input. It also checks the verdict against the run's own `raw.checks` and `raw.coverage`: the three world checks are present, a `false_positive` has evidence from both sources, and the verdict obeys the prompt's rules 1-3. It only checks that a `false_positive` or `true_positive` verdict is permitted by those rules; it does not enforce rules 2/3 against an `inconclusive` verdict, so an unwarranted `inconclusive` still passes. A run whose gold is `failed` ended `FAILED` (a timeout or cancellation does not count) and produced no payload.
- `ClaimGrounding`: a code check of the model's `claims`, with no LLM. Cited ids are checked against the seeded documents: every `claims.world` entry must cite a seeded document from the evidence source its check is permitted to use (`entity_role` -> `entity_store`, `process_parent`/`network_destination` -> `raw_event`; `entity_store` ids resolve to a seeded entity's `entity.id`, `raw_event` ids to a seeded event `_id`). A world claim whose `check` is not one of those three is ungrounded. The claimed `result` is checked only against the model's own `raw.checks` (self-consistency): it must match a completed (not skipped) check there. It is not checked against the seeded documents, so a wrong but internally consistent verdict still scores as grounded; a wrong verdict is caught by `OutcomeAccuracy` and `PayloadConformance`, not by `ClaimGrounding`. World claims are deduplicated on (`check`, `result`, `source`, `id`) before counting, so repeating a claim does not raise the score; two claims that cite the same (`check`, `source`, `id`) with different `result` values are both scored. An `alert_link` is only grounded when its `field` is one of the prompt's pivot fields (`user.name`, `user.id`, `host.id`, `host.name`, `process.entity_id`, `process.pid`, `agent.id`, `source.ip`), `raw.checks` has `alert_linkage` with status `completed` and result `supports`, it cites only seeded alerts, at least two distinct ids, and every listed alert's source carries the pivot `field`'s value by membership (arrays and numeric pids included). Score is grounded claims / total claims. `missing-claims` (score 0) fires for a TP/FP verdict whose `claims.world` is empty, even when an `alert_link` is present. Claims are validated regardless of the verdict (including `inconclusive`); an `inconclusive` run with no claims at all (including a truncation downgrade, or no payload) is `N/A` (score null) so the inconclusive rate does not pad the mean.
- `trajectory`: the agent called no domain tools; harness planning tools such as `write_todos` are ignored. N/A when traces are unavailable.
- LLM criteria on the summary and rationale: cited ids exist in the seeded data, nothing is invented (the task output carries the seeded documents in `seededEvidence`), the discovery's and alerts' story is stated as fact only where the entities or raw events show it, the deciding checks are named, and an `inconclusive` verdict says what was missing or conflicting. N/A for failed runs.

The raw `coverage`, `checks`, and `claims` are captured in the task output and graded by `ClaimGrounding` against the seeded documents.

## Running locally

```bash
node scripts/evals start --suite security-attack-discovery-fp-tp --model <connector-id> --repetitions 5
```

The suite's stack uses the `evals_attack_discovery_fp_tp` Scout config set, which enables AlertZero (and the `agenticInvestigations` and `proposals` plugins it requires) plus the Workflows UI and agent settings.

## Reproducibility

Run with `--repetitions 5` or more. Each repetition is a separate run in the report, so per-example agreement is the share of an example's repetitions that land on the same outcome; `OutcomeAccuracy`'s label distribution per example shows it directly.

## Measured baseline (managed workflow)

Measured on commit `a688380f67b468802c0479e2c589f7e94bab1200` (the commit in this PR), 2026-10-05 on the Azure eval farm: 3 repetitions × 23 examples, 0 errored examples, judge `eis-google-gemini-3-1-pro`, 345 commit-pinned golden documents per model. The sweep refuses a judge that is also a candidate, so the gemini family is not measured and no cell is self-judged.

| Evaluator (n) | claude-5-opus | glm-5-3 | gpt-5-5 |
| --- | --- | --- | --- |
| `OutcomeAccuracy` (69) | 0.870 [0.739, 1.000] | 0.841 [0.696, 0.971] | 0.754 [0.580, 0.913] |
| LLM criteria (63) | 0.997 | 0.892 | 0.995 |
| `PayloadConformance` | 1.000 | 1.000 | 1.000 |
| `UnsafeClose` | 1.000 | 1.000 | 1.000 |

`PayloadConformance` and `UnsafeClose` are constant at 1.000 (all models, all repetitions). `trajectory` is N/A: the managed agent declares no tools.

What each evaluator checks after the #295393 tightening: `PayloadConformance` now also fails a run from contract-derived facts alone — a dropped world check (`entity_role`, `process_parent`, or `network_destination` missing from `checks`, except on a `block_truncated_clear` downgrade, which is only the `verdict: inconclusive` + truncated-source + `checks` omitted shape), a `false_positive` verdict while `coverage` shows a source with `seen: 0` or absent (missing evidence cannot clear an alert), a `false_positive` or `true_positive` verdict while completed world checks both support and contradict (rule 1 requires `inconclusive`; `alert_linkage` never decides), a `false_positive` without a completed world check contradicting and none supporting (rule 2), and a `true_positive` without `process_parent` or `network_destination` supporting, or with a world check contradicting (rule 3). `UnsafeClose` is unchanged: 0 only when the run predicts `false_positive` on a non-false-positive gold; no current scenario elicits that prediction other than the FP examples, so new discriminating scenarios remain follow-up work. The 2026-10-05 baseline numbers above predate this change; a re-baseline is pending.

## Acceptance criteria (proposed)

- Hard gates on the core models: `PayloadConformance` = 1.0 and `UnsafeClose` = 1.0. `PayloadConformance` now enforces the prompt's verdict rules 1-3, the missing-evidence rule, and world-check presence, so it can fail a wrong-but-well-formed answer; its threshold needs re-baselining against a new run. `UnsafeClose` is still saturated at 1.000 — no current scenario elicits a `false_positive` prediction on a non-FP gold, so it cannot detect a regression yet. See [security-team#19344](https://github.com/elastic/security-team/issues/19344).
- `OutcomeAccuracy`: set the threshold against the baseline above, whose floor is gpt-5-5 at 0.754 (CI down to 0.580).

## Follow-ups (sample-workflow removal done)

1. Add a weekly step to `.buildkite/pipelines/evals/llm_evals.yml`, copying `Evals: Alert Analysis Workflow` with `EVAL_SUITE_ID: 'security-attack-discovery-fp-tp'`.
2. Give `UnsafeClose` new discriminating scenarios — a `false_positive` prediction on a non-FP gold — so it can leave the 1.0 ceiling. `PayloadConformance` no longer needs this (rules 1-3 enforced). Tracked in #295393.

Until then the suite runs on demand through the `evals:security-attack-discovery-fp-tp` PR label.
