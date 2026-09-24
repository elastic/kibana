# @kbn/evals-suite-attack-discovery-fp-tp

Outcome eval for the Attack Discovery FP/TP analysis ([security-team#19285](https://github.com/elastic/security-team/issues/19285)). It seeds a world around one persisted Attack Discovery, runs the analysis workflow, and grades the workflow's execution output against the contract posted on [security-team#19280](https://github.com/elastic/security-team/issues/19280).

## What it runs

Until the managed analysis workflow ships ([security-team#19282](https://github.com/elastic/security-team/issues/19282)), the suite installs `src/sample_workflow/fp_tp_analysis.yaml` for the run and deletes it afterwards. The sample follows the contract's inputs, evidence sources, checks, and output shape, but it has **no claim-verification gate**: the verdict it returns is the model's proposal as-is. Its scores measure the prompt, not the product.

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

`mimicrat-clickfix` replays the MIMICRAT ClickFix chain from [Elastic Security Labs](https://www.elastic.co/security-labs/threat-command/mimicrat-custom-rat-mimics-c2-frameworks), ported from [#293023](https://github.com/elastic/kibana/pull/293023). Its 15 examples are the replay, a benign mimic, and variants that each change one fact the world checks read, so together they reach every branch of the verdict rules. See [its README](src/scenarios/mimicrat_clickfix/README.md) for the table.

A missing source is one-sided: it blocks `false_positive` (missing evidence cannot clear an alert) but not `true_positive`, which needs a supporting raw-event check (`process_parent` or `network_destination`). `entity_role` alone never escalates, so `tp-events-missing` stays `inconclusive`.

Situations follow the contract: U1 lookalike, U2 benign alerts, U3 invented chain, U4 shared egress or jump box, U5 ambient, U6 true attack.

Every example records its `labelProvenance`: `authored` (written by hand), `replay` (a published chain rendered as documents), or `adversarial-mutation` (a replay with one fact changed). Examples with `checks` state the result each world check should reach, and `registry.test.ts` requires the gold to follow from them under the workflow's verdict rules (`deriveFpTpOutcome`). A `mutation` must change at least one check result against its scenario's `.tp` example; one that changes none, such as reordering events, tests nothing new. A `perturbation` must change none, so its gold stays that of `.tp`; every `adversarial-mutation` example is exactly one of the two. `provisional` marks a gold that is not agreed yet.

Each example's metadata carries its scenario, situation, evidence state, label provenance, and whether it is provisional, so reports can be sliced by any of them. Every task seeds its documents under a fresh run marker and suffix (`uniquify`), so repetitions and examples never share a document, and deletes them when it ends.

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
    mimicrat_clickfix/    One replayed chain, its benign mimic, and single-fact mutations
  sample_workflow/        The workflow under test until #19282 ships
  workflow_task.ts        Runs the workflow and reads its output
  evaluators.ts
```

## Adding a scenario

1. Create `src/scenarios/<scenario_key>/`. Either:
   - model it on `encoded_powershell/`: build alerts and raw events from a registry scenario in `@kbn/evals-suite-attack-discovery-agent-builder` (`buildAd2SeedPlan`), then add the authored attack, entity documents, event overlays, and gold for each twin; or
   - model it on `mimicrat_clickfix/`: write the chain as an `FpTpChainDefinition` (events, alert stages, discovery text) and render it with `buildChainWorld`, then derive variants with the helpers in `src/world/mutations.ts`.
2. Export an `FpTpScenario` from its `index.ts`:
   - `key`: the scenario key; every example id must start with `<key>.`.
   - `sharedNames`: every name the run marker does not make unique (attack id, host names, user names). `uniquify` suffixes them per run.
   - `twins`: the complete worlds a person can seed by hand, keyed by variant.
   - `examples`: one entry per eval example, with its situation, evidence state, gold outcome, label provenance, `checks` where the gold follows from the verdict rules, and `buildWorld(runMarker)`. Use the helpers in `src/world/evidence_states.ts` for the degraded-evidence and failure examples.
3. Add the scenario to `FP_TP_SCENARIOS` in `src/scenarios/index.ts`.
4. Run the package's jest tests. `registry.test.ts` checks the new examples for unique ids, no unsuffixed shared names, disjoint documents across runs, raw events inside the workflow's ±2h window, golds that follow from `checks`, mutations that change a check result, and perturbations that change none.

## Evaluators

- `OutcomeAccuracy` (primary): the outcome matches the gold; a `failed` gold also needs an explicit `FAILED` execution, so a timeout or cancellation does not pass. The label is the predicted outcome, so the report reads as a confusion matrix.
- `UnsafeClose`: 0 when the run predicts `false_positive` and the gold is anything else. A false positive closes the attack.
- `PayloadConformance`: the run completed and has a supported verdict, a non-empty `summary_markdown` of at most 8000 characters, a `rationale_markdown` of at most 50000 characters when present, and an `attack_discovery_id` that echoes the input. A run whose gold is `failed` ended `FAILED` (a timeout or cancellation does not count) and produced no payload.
- `trajectory`: the agent called no tools. N/A when traces are unavailable.
- LLM criteria on the summary and rationale: cited ids exist in the seeded data, nothing is invented (the task output carries the seeded documents in `seededEvidence`), the discovery's and alerts' story is stated as fact only where the entities or raw events show it, the deciding checks are named, and an `inconclusive` verdict says what was missing or conflicting. N/A for failed runs.

A grader for whether `claims` are grounded in the seeded data waits for the verification gate; the raw `coverage`, `checks`, and `claims` are already captured in the task output.

## Running locally

```bash
node scripts/evals start --suite security-attack-discovery-fp-tp --model <connector-id> --repetitions 5
```

The suite's stack uses the `evals_attack_discovery_fp_tp` Scout config set, which enables AlertZero (and the `agenticInvestigations` and `proposals` plugins it requires) plus the Workflows UI and agent settings.

## Reproducibility

Run with `--repetitions 5` or more. Each repetition is a separate run in the report, so per-example agreement is the share of an example's repetitions that land on the same outcome; `OutcomeAccuracy`'s label distribution per example shows it directly.

## Acceptance criteria (proposed)

- Hard gates on the core models: `PayloadConformance` = 1.0 and `UnsafeClose` = 1.0.
- `OutcomeAccuracy`: record the sample workflow's numbers as the baseline #19282 has to beat, then set a threshold.

## Switching to the managed workflow (after #19282)

1. Set `FP_TP_WORKFLOW_SOURCE` in `src/constants.ts` to `managed`.
2. Delete `src/sample_workflow/` and the install and delete calls around it in the spec.
3. Add the claim-grounding evaluator.
4. Add a weekly step to `.buildkite/pipelines/evals/llm_evals.yml`, copying `Evals: Alert Analysis Workflow` with `EVAL_SUITE_ID: 'security-attack-discovery-fp-tp'`.

Until then the suite runs on demand through the `evals:security-attack-discovery-fp-tp` PR label.
