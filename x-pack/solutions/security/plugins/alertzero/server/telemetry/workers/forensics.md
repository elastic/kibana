# How the Endpoint Analysis Worker reports

The Worker reports its sweep, each analysis run reports how it settled its indicator, and the proposal gate reports its close. Event fields are in the [telemetry README](../README.md).

| Workflow | Step | `event` | Where |
|---|---|---|---|
| `forensics_endpoint_analysis.yaml` | `report_worker_run_completed` | `worker_run_completed` | Right before `emit_result`, only when the sweep started a new analysis, had a dispatch refused, or its search failed |
| `forensics_run_endpoint_analysis.yaml` | `report_analysis_completed` | `endpoint_analysis_completed` | Right before `mark_processed`, once every verdict condition is decided |
| `forensics_proposal_gate.yaml` | `report_investigation_closed_settled` | `worker_investigation_closed` | Right after `close_if_settled` |

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

The Worker never opens an Investigation. It works on the Attack Discovery Investigation named by the indicator, and its proposal gate closes that Investigation once every containment Proposal is decided.

| Workflow | Close | `close_reason` |
|---|---|---|
| Proposal gate | Every containment Proposal of the Investigation decided | `other` |

- The gate closes through the Agentic Investigations status route, because it runs as the Worker's service account and doesn't own the Investigation. That route writes no close reason, so the close is `other`, and it also sends `agentic_investigations_investigation_closed`.
- The route doesn't return what it changed, so the gate reads the Investigation's status first (`read_status_before_close`) and reports only when it was `open` and the close returned `closed`. Two gates that settle at the same moment can both see it open, so a close can rarely be counted twice.
