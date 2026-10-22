# How the Attack Discovery Worker reports

The runner reports the run; each review reports its own attack. Event fields are in the [telemetry README](../README.md).

| Workflow | Step | `event` | Where |
|---|---|---|---|
| `attack_discovery_runner.yaml` | `report_run_completed` | `ad_worker_run_completed` | After the review batches are dispatched |
| `attack_discovery_runner.yaml` | `report_worker_run_completed` | `worker_run_completed` | Next, right before `emit_result` |
| `attack_discovery_review.yaml` | `report_review_started` | `ad_worker_review_started` | Right after `verify_investigation` |
| `attack_discovery_review.yaml` | `report_analysis_completed` | `ad_worker_analysis_completed` | Right after `refresh_verdict`, for every verdict |
| `attack_discovery_review.yaml` | `report_investigation_closed_false_positive` | `worker_investigation_closed` | Right after the false-positive close, in the verdict switch's `false_positive` arm |
| `attack_discovery_review.yaml` | `report_handoff_resolved` | `ad_worker_handoff_resolved` | Right after `record_decision`, for an escalated review only |
| `attack_discovery_review.yaml` | `report_investigation_closed_declined` | `worker_investigation_closed` | Right after the close that follows a declined escalation |

## Run outcome

The runner derives `run_outcome` from its own counts, first match wins:

1. `empty_no_alerts`: no generation batch, because no alert was retrieved.
2. `failed_all_batches`: every batch failed.
3. `degraded_partial`: some batches failed, whether or not attacks persisted.
4. `produced`: at least one attack persisted.
5. `empty_all_duplicates`: attacks were generated, but every one already existed.
6. `empty_no_attacks`: nothing was generated.

In the shared `worker_run_completed`, the items are generation batches: `candidates_found` and `items_dispatched` are the batches attempted, `items_failed` the batches that failed, and `items_in_flight` is 0, because the run waits for its batches. Alerts analyzed and attacks handed to reviews are on `alertzero_ad_worker_run_completed`. The outcomes map to `produced`, `empty_nothing_pending` (no alerts), `empty_nothing_found` (no attacks, or only duplicates), `degraded_partial` and `failed_all_items`. A failed batch gives `degraded_reason: dependency_unavailable`.

## Closes and handoffs

- A false-positive verdict closes the Investigation (`close_reason: false_positive`), and so does a declined escalation (`close_reason: other`). A review that finds its Investigation already closed by a person sends nothing; Agentic Investigations reported that close.
- `ad_worker_handoff_resolved.outcome` is `approved` (the handoff action ran), `approved_action_failed` (approved, but the action didn't succeed), `dismissed` or `expired` (nobody decided).
