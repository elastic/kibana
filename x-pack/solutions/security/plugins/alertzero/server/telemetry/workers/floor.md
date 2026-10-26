# How the Alert Triage Worker reports

Each batch the sweep starts reports how its alerts were classified and how its run ended, and its closure review reports how the proposal settled. Event fields are in the [telemetry README](../README.md).

| Workflow | Step | `event` | Where |
|---|---|---|---|
| `floor_alert_triage_batch.yaml` | `report_batch_classified` | `alert_triage_batch_classified` | After the false-positive candidates are counted |
| `floor_alert_triage_batch.yaml` | `report_batch_grouped` | `alert_triage_batch_grouped` | Right after `tag_pattern_keys`, which tags every classified alert with its pattern keys. Skipped when that step fails |
| `floor_alert_triage_batch.yaml` | `report_worker_run_completed` | `worker_run_completed` | The last step, so it sees whether the closure review started |
| `floor_alert_triage_review.yaml` | `report_investigation_closed_after_approval`, `_after_dismissal`, `_after_expiry`, `_after_join` | `worker_investigation_closed` | Right after each close |
| `floor_alert_triage_review.yaml` | `report_closure_resolved` | `alert_triage_closure_resolved` | The last step, after every outcome branch |

## Investigations

A batch has no Investigation of its own. A new proposal gets one, and a failure that does not end the run gets one. A batch of true positives, inconclusive verdicts or below-floor false positives creates none. So `alert_triage_batch_classified` sends no `investigation_id` (the field is optional), and `alert_triage_closure_resolved` sends the Investigation of the proposal it settled. `alert_triage_batch_grouped.conversation_created` says whether the batch created any, and `grouping` says whether the batch was grouped or why not (supervised autonomy, the kill switch, an incomplete proposal lookup, or nothing to propose). The batch summary in the execution log says the same.

## Runs

The run event comes from each batch, not from the sweep. A sweep that starts several batches has one run event per batch, all with the sweep's `run_id`, and a sweep that starts none sends no run event.

The items are the batch's alerts: `candidates_found` is the alerts in the batch, `items_dispatched` the alerts classified, `items_failed` the alerts without a verdict, and `items_in_flight` the false-positive candidates in proposals whose review started. There is no source read or lookup to fail.

- `empty_nothing_pending`: an empty batch.
- `failed_all_items`: the classification returned no verdict at all (`degraded_reason: dependency_unavailable`), for example with no model connector, or when the analysis skipped the batch.
- `degraded_partial`: some alerts have no verdict (`degraded_reason: missing_data`).
- `produced`: every alert has a verdict.

A batch that fails (Alert Analysis turned off, no alert loaded, a failed classification, a closure review that ended without a decision) never reaches its reports. The engine's failed-run event covers it.

## Closes

| Workflow | Close | `close_reason` |
|---|---|---|
| Closure review | Proposal approved | `false_positive` |
| Closure review | Proposal dismissed or expired | `other` |
| Closure review | The proposal was created first by another batch, and the alerts joined it | `other` |
