# `alertzero.reportWorkerOutcome`

A workflow step that reports an allowlisted AlertZero Worker outcome as an EBT event (see the [telemetry README](../../telemetry/README.md)). It is the only way Worker YAML can emit an outcome. The server registers it only when `xpack.alertzero.enabled` is on and Agent Builder, Proposals and Agentic Investigations are all present, the same condition under which the Worker YAML that calls it is installed. The browser registers its YAML-editor definition whenever `xpack.alertzero.enabled` is on.

## Input

`with` is a closed union keyed by `event`. Each branch accepts only enums, bounded integer counts and booleans; the one id is the Worker's own `investigation_id`, which must be a UUID. Unknown keys fail the parse.

`worker_run_completed` and `worker_investigation_closed` are for any catalogued Worker: the step takes the Worker from the run's root (the envelope's `worker_id`), never from the input. Every other event belongs to one Worker, and the step reports it only when the run's root is that Worker (`event_worker_ids.ts`): the four `ad_worker_*` events to Attack Discovery, the two `alert_triage_*` events to Alert Triage, `rule_tuning_review_completed` to Rule Tuning, `rule_coverage_review_completed` to Rule Coverage, `hunt_report_completed` to Continuous Threat Hunt and `endpoint_analysis_completed` to Endpoint Analysis.

| `event` | Reports | Fields |
|---|---|---|
| `ad_worker_run_completed` | `alertzero_ad_worker_run_completed` | `alerts_analyzed`, `batches_total`, `batches_failed`, `attacks_generated`, `attacks_persisted` (counts, default `0`), `run_outcome` (required) |
| `ad_worker_review_started` | `alertzero_ad_worker_review_started` | `investigation_id` (UUID, required), `is_rereview` (required) |
| `ad_worker_analysis_completed` | `alertzero_ad_worker_analysis_completed` | `verdict` (required), `analysis_error` (default `false`) |
| `ad_worker_handoff_resolved` | `alertzero_ad_worker_handoff_resolved` | `outcome`, `verdict` (`true_positive` or `inconclusive`, the verdicts that escalate), `auto_approve_requested` (required) |
| `worker_investigation_closed` | `alertzero_worker_investigation_closed` | `investigation_id` (UUID, required), `close_reason` (required, the Investigation template's close reason, or the class the Worker's close maps to) |
| `worker_run_completed` | `alertzero_worker_run_completed` | `run_outcome` (required), `degraded_reason` (default `none`; the event's `degraded` is derived from it and from `lookup_failed`, `source_read_failed` and `items_failed`), `candidates_found`, `items_dispatched`, `items_failed`, `items_in_flight` (counts, default `0`), `source_read_failed`, `lookup_failed` (default `false`) |
| `alert_triage_batch_classified` | `alertzero_alert_triage_batch_classified` | `alerts_total`, `verdicts_true_positive`, `verdicts_false_positive`, `verdicts_inconclusive`, `alerts_without_verdict`, `fp_candidates`, `fp_below_floor` (counts), `investigation_id` (UUID, optional, not sent by the batch) |
| `alert_triage_batch_grouped` | `alertzero_alert_triage_batch_grouped` | `alerts_with_strict_key`, `strict_keys`, `strict_keys_single_alert`, `wide_keys`, `wide_keys_single_alert`, `fp_candidates_on_fallback`, `alerts_joined`, `proposals_created`, `alerts_pooled` (counts), `conversation_created` (flag) |
| `alert_triage_closure_resolved` | `alertzero_alert_triage_closure_resolved` | `outcome` (required), `alerts_proposed`, `alerts_retag_failed`, `revisions` (counts), `auto_approve_requested` (required flag), `proposal_read_failed` (flag), `investigation_id` (UUID, required) |
| `rule_tuning_review_completed` | `alertzero_rule_tuning_review_completed` | `entry_gate`, `change_type`, `decision` (required), `confidence` (default `none`), `applied`, `approved_not_applied`, `backtest_ran`, `backtest_reduced_alerts`, `rule_unavailable` (flags), `rule_type` (the rule's own `type`, which the step maps to the event's vocabulary), `rule_source` (optional), `investigation_id` (UUID, required unless `rule_unavailable`) |
| `rule_coverage_review_completed` | `alertzero_rule_coverage_review_completed` | `verdict`, `proposal_kind`, `decision`, `entry_gate` (required), `applied`, `approved_not_applied`, `rule_created`, `creation_skipped`, `creation_failed`, `check_failed`, `ki_processed` (flags), `rule_type` (the rule's own `type`, mapped as for tuning), `rule_source` (optional), `investigation_id` (UUID, required unless `check_failed`) |
| `hunt_report_completed` | `alertzero_hunt_report_completed` | `hunt_status`, `package_status` (required), `mint_suppression` (default `none`), `has_confirmed_hit`, `closed_clean` (flags), `tier2_invoked` (optional), `proposals_prepared`, `proposals_dispatch_failed`, `coverage_kis_written`, `coverage_kis_skipped` (counts), `investigation_id` (UUID, required unless `package_status` is `run_incomplete`) |
| `endpoint_analysis_completed` | `alertzero_endpoint_analysis_completed` | `analysis_outcome` (required), `reused_prior_assessment`, `host_resolved`, `agent_failed`, `timeline_found`, `iocs_found`, `findings_attached` (flags), `auto_approve_requested` (required flag), `actions_recommended`, `proposals_dispatched`, `proposals_dispatch_failed` (counts) |

Liquid renders a missing value as `''`, so every count and flag treats `''` and `null` as absent, and a count or flag also accepts the text a `{{ }}` template renders (`'12'`, `'true'`). Prefer `${{ }}` typed values with a `default`. The engine does not apply the input schema at runtime, so the handler parses it itself.

## Adding a report step to Worker YAML

```yaml
- name: report_run_completed
  type: alertzero.reportWorkerOutcome
  on-failure:
    continue: true
  with:
    event: worker_run_completed
    run_outcome: "{{ … }}"
```

- **Never fail the run.** Set `on-failure: continue`, which also covers a `with` block that fails to render. Don't set a `timeout`: the step stops itself after 20s (`STEP_DEADLINE_MS`), returns `{ reported: false }` and logs `deadline_exceeded`.
- **Place it after the work it describes** and before the step that ends the run, never inside a `parallel` or `waitForApproval` branch. Nothing should read its output.
- **Report a close right after it.** This is a workaround: the platform's close events don't say which workflow run closed an Investigation, so a Worker reports its own closes, and only the close step knows whether it changed anything. Close in one of two ways, and report in the very next step:
  - `ai.conversation.metadata.patch` writing `status: closed`, reported with `if: "${{ steps.<close>.error == blank and steps.<close>.output.changed_fields contains 'status' }}"`, so a failed close, or one that found the Investigation already closed, isn't counted.
  - A `kibana.request` PUT to the Agentic Investigations status route, which returns no changed fields. Read the status with `ai.conversation.metadata.read` in the step right before the close (same `if`, `on-failure: continue`), and report only when the read found it `open` and the close returned `closed`. The read and the close aren't atomic: a close by someone else in between is counted as the Worker's, and two runs that close at the same moment can both count it.

  `worker_close_reports.test.ts` fails if any close in a workflow with a report step has no close report right after it, or if a status-route close has no status read right before it. Each Worker's `worker_reports.<worker>.test.ts` lists its closes with `describeCloseReports`, which evaluates every report's `if` against closes that changed the status, found it already closed, failed, or were skipped.
- **Keep comments short.** A close report needs none; another report needs at most one line saying why it sits where it does. These rules live here, not in each YAML file.
- **Bump the workflow's version** in its definition `.ts` and its pin in `managed_workflow_definitions.test.ts`, so installed spaces pick up the change. The bump needs no comment.
- **Document the Worker's reports** in `../../telemetry/workers/<worker>.md`.

Each Worker wires its YAML in its own change, and declares what it wired in its own files, so no shared list changes:

- `shipped_yaml_contract.<worker>.fixture.ts` here declares the Worker's workflows with report steps and runs that exercise each report. Its test renders each `with` block the way the engine does and validates it against the input schema, so a YAML edit the schema would reject fails in CI instead of logging `invalid_input` at runtime. `shipped_yaml_contract.test.ts` fails unless the declared workflows are exactly the AlertZero managed workflows with a report step.
- In `definitions/alertzero/`, `worker_close_reports.test.ts` fails when a close in a workflow with a report step has no close report right after it, and each `worker_reports.<worker>.test.ts` pins what the Worker's reports render.

Both shared guards check only the workflows that already have a report step, so on `main`, before any Worker adds one, they check nothing.

## Output

`{ reported: boolean }` and nothing else. The step never throws, so a telemetry problem never fails a Worker run. It gives itself 20s in all: the managed check (waiting for the managed workflows client, then the execution space's and the global space's state) and the read of the reporting execution and the parallel read of its ancestors take up to 5s each. Past the deadline it returns `{ reported: false }` and logs `deadline_exceeded`, and the checks still in flight see the run as aborted, so they make no further read and never report.

## What it verifies

In order, stopping at the first failure:

1. The run is not aborted. It is checked again after the opt-in read (so before the managed check), after the reporting execution is read, after its ancestors are read, and immediately before reporting, but not between the two managed-state reads of step 4. Otherwise `aborted`. Past the deadline the checks see the run as aborted too, but the step has already returned as `deadline_exceeded`.
2. The step's own execution is not a test run. Otherwise `test_run`.
3. Telemetry is opted in (a 1s read of the telemetry plugin's opt-in; no plugin or no decision counts as opted out). Otherwise `opted_out`. Every check before this one is local, so an opted-out cluster makes no Elasticsearch read.
4. AlertZero's owner-bound managed workflows client knows the reporting workflow id, in the execution space or else the global space (5s per read). Otherwise `not_managed`. With Kibana service accounts off, AlertZero starts no such client, so the step skips as `service_accounts_disabled`; with them on, a missing client is `lineage_unavailable`. This is a cheap pre-check, not the authorization: an inline run can carry an installed workflow id, so step 5 decides from the persisted executions' managed fields.
5. The reporting execution and its persisted ancestors, read through the Workflows management setup API with `omitStepExecutions`, 5s per read. The reporting execution is read first. A top-level one is its own root. A child lists its ancestors in the `executionChain` the Workflows engine stores in its context (root first, direct parent last, at most 10 hops, no repeated id), and the last hop must be its parent (`parentWorkflowExecutionId`, or else the `parent.executionId` a terminal save merges in beside it). The ancestors are then read together, in one parallel batch. Every execution must be in the same space (compared explicitly), not a test run, and managed by `alertzero`, and each ancestor must be the execution and workflow its hop names.
6. The root (the chain's first hop, which no workflow step started) is a catalog Worker (`originManagedWorkflowId` in `SYSTEM_SECURITY_WORKER_IDS`). Otherwise `not_catalog_root`.
7. The input parses, and does not contradict itself (`find_outcome_contradictions.ts`): a `worker_run_completed` whose `run_outcome` is `degraded_partial` must name a `degraded_reason`, and a Rule Tuning, Rule Coverage or Hunt report may leave out `investigation_id` only with `rule_unavailable`, `check_failed` or `package_status: run_incomplete` respectively. Otherwise `invalid_input`. Only a verified Worker chain gets this far, so no other caller can raise this warn-level skip.
8. A Worker-specific event comes from its own Worker: the root's `originManagedWorkflowId` is the event's owner in `event_worker_ids.ts`. Otherwise `wrong_worker`.

A child with no valid chain (for example, one whose chain started before the engine recorded chains), a missing or unreadable ancestor, a timeout, a chain that is too long or names other executions than the ones read, or an execution in another space is `lineage_unavailable`. The envelope is then built from the verified root, as for every Worker run event.

The caller check is best-effort. It checks every hop, not only the root, because a managed workflow another plugin owns can sit in the middle of a Worker's chain: the Proposals gate runs whatever action workflow id it is given, and some Workers let a model choose that id. Without the per-hop check, a gate under a Worker's run could run an AlertZero workflow that then reports under that Worker's `run_id`. The engine's `executionChain` names every ancestor, so the step reads them in one parallel batch rather than one parent at a time. The reads run only in this step, off the Worker's own path. Every report verifies its own chain: one read of the reporting execution, then one parallel batch of its ancestors. Once the gate runs only `action`-tagged workflows, the check can shrink to a read of the root.

## Skip reasons

A skip is written to the AlertZero server logger (`plugins.alertzero.telemetry`), never to the workflow event log or the step output, so the step cannot be used to probe other executions. When a read fails (a timeout, an Elasticsearch error, or a denial for the Worker's own service account), a debug line before the skip names the execution or workflow and the error's type and message, never the document.

At the deadline, or when the run is cancelled, the step stops waiting on its reads and starts no new one. It cannot cancel a read already sent: neither `getWorkflowExecution` nor `getInstalledWorkflowState` takes an abort signal.

| Reason | Level |
|---|---|
| `opted_out`, `test_run`, `not_managed`, `lineage_unavailable`, `service_accounts_disabled`, `not_catalog_root`, `aborted`, `deadline_exceeded` (the step ran past its 20s deadline) | debug |
| `invalid_input` (issue paths and codes only, never the rendered values), `wrong_worker` (the event name), `report_error` (the error's type and HTTP status only, never its message) | warn |
