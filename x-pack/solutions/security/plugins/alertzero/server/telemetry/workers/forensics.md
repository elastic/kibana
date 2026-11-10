# How the Endpoint Analysis Worker reports

The Worker reports its sweep, each analysis run reports how it settled its indicator, and the close gate reports an approved close. Event fields are in the [telemetry README](../README.md).

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
