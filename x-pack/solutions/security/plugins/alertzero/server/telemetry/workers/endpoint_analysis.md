# How the Endpoint Analysis Worker reports

The Worker reports its sweep, each analysis run reports how it settled its indicator, and the close gate reports an approved close. Its own events are under [Events](#events); the envelope and the events every Worker shares are in the [telemetry README](../README.md).

| Workflow | Step | `event` | Where |
|---|---|---|---|
| `forensics_endpoint_analysis.yaml` | `report_worker_run_completed` | `worker_run_completed` | Right before `emit_result`, only when the sweep started a new analysis, had a dispatch refused, or its search failed |
| `forensics_run_endpoint_analysis.yaml` | `report_analysis_completed` | `endpoint_analysis_completed` | Right before `mark_processed`, once every verdict condition is decided |
| `forensics_close_investigation_gate.yaml` | `report_investigation_closed` | `worker_investigation_closed` | Right before `journal_outcome`, only when the analyst approved the Close Investigation proposal and its action succeeded |

## Runs

The Worker polls every minute, so a sweep that started nothing, refused nothing and read its source cleanly sends nothing. Otherwise each space would send about 1,440 empty events a day.

`candidates_found` is the pending indicators in the lookback window, `items_dispatched` and `items_in_flight` the analyses started, and `items_failed` the dispatches the engine refused. `source_read_failed` is the indicator search; there is no lookup.

- `failed_source_unavailable`: the search failed.
- `failed_all_items`: every dispatch was refused (`degraded_reason: dependency_unavailable`).
- `degraded_partial`: some were (`dependency_unavailable`).
- `produced`: otherwise.

An indicator stays pending while its analysis runs, so every poll dispatches it again, and the engine drops that duplicate. `start_run` returns `skipped` for it, and the report counts only the other starts (`resolve_reported_starts`), so a poll that only re-dispatched running analyses sends nothing, and each analysis is counted once, by the poll that started it. The sweep's own `emit_result.started` still counts the duplicates.

## Analysis outcome

`analysis_outcome` follows the same conditions as the run's `mark_*` writes, in their order. Findings an earlier run attached without recording its outcome retire the indicator as `failed`, so they report `failed`.

The report runs before the `mark_*` writes, so it is the verdict the run reached, not one it is known to have written. A write that then fails the run (after its retries) leaves the indicator pending; its retry skips the agent and reports again, as `failed` with `reused_prior_assessment: true`, so that indicator has two events. A run that fails earlier, on a read such as `list_written_findings`, never reaches its report; the engine's failed-run event covers it.

## Closes

The Worker never opens an Investigation, and none of its workflows closes one. It works on the Attack Discovery Investigation named by the indicator; once every containment Proposal is decided (or right away when none was proposed), the close gate asks the analyst whether to close it, through an always-gated `Close Investigation` Proposal. Approving runs the `system-alertzero-action-close-attack-discovery-investigation` action as the approver, which closes the attack and its alerts, then the Investigation through the Agentic Investigations status route.

| Workflow | Close | `close_reason` |
|---|---|---|
| Close gate | The analyst approved the Close Investigation proposal and the action succeeded | The reason the analysis decided: `false_positive` for a `not_an_incident` verdict, `resolved` for `confirmed_incident`, `other` otherwise |

- The report is in the close gate, not the action: the step verifies that every ancestor is an AlertZero-managed execution, and the action's chain passes through the platform's proposal workflow, so a report there would skip as `not_managed`.
- `close_reason` is what the analysis decided and what the action writes on the attack and its alerts as `workflow_reason`. The status route writes no close reason on the Investigation itself yet.
- The action does not continue past a failed status-route close, so `succeeded` means the route returned. The route is idempotent, so an Investigation someone closed while the card was pending is counted as the Worker's. The route also sends `agentic_investigations_investigation_closed`.

## Events

Each event takes this input on the `alertzero.reportWorkerOutcome` step (see the [step README](../../step_types/report_worker_outcome/README.md)):

| `event` | Reports | Fields |
|---|---|---|
| `endpoint_analysis_completed` | `alertzero_endpoint_analysis_completed` | `analysis_outcome` (required), `reused_prior_assessment`, `host_resolved`, `agent_failed`, `timeline_found`, `iocs_found`, `findings_attached` (flags), `auto_approve_requested` (required flag), `actions_recommended`, `proposals_dispatched`, `proposals_dispatch_failed` (counts) |


### `alertzero_endpoint_analysis_completed`

Emitted by one Endpoint Analysis run for one indicator, once it has reached its verdict and before it writes it to the indicator. The run works on the Attack Discovery Investigation named by the indicator and never opens one of its own. The Worker's proposal gate closes that Investigation once every containment Proposal is decided.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See [the envelope](../README.md#the-envelope) |
| `analysis_outcome` | keyword | yes | How the run settled the indicator: `processed`, `no_host` (the discovery named no host), `failed` (no findings landed), `proposals_lost` (findings landed but a containment proposal did not reach the queue), `unreachable` (the Investigation could not be read), `invalid` (a malformed indicator) or `not_pending` (the indicator was no longer pending) |
| `reused_prior_assessment` | boolean | yes | Whether an earlier run's findings were already attached, so the agent did not run again |
| `host_resolved` | boolean | yes | Whether a host was found to analyze |
| `agent_failed` | boolean | yes | Whether the forensic agent failed |
| `timeline_found` | boolean | yes | Whether the analysis reconstructed any timeline event |
| `iocs_found` | boolean | yes | Whether the analysis extracted any indicator of compromise |
| `findings_attached` | boolean | yes | Whether both findings are on the Investigation |
| `actions_recommended` | long | yes | Containment actions the analysis recommended |
| `proposals_dispatched` | long | yes | Containment proposals dispatched to the queue |
| `proposals_dispatch_failed` | long | yes | Containment proposals that did not reach the queue |
| `auto_approve_requested` | boolean | yes | Whether the proposals ask the gate to auto-approve (supervised autonomy) |
