# How the Attack Discovery Worker reports

The runner reports the run; each review reports its own attack. Its own events are under [Events](#events); the envelope and the events every Worker shares are in the [telemetry README](../README.md).

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

## Events

Each event takes this input on the `alertzero.reportWorkerOutcome` step (see the [step README](../../step_types/report_worker_outcome/README.md)):

| `event` | Reports | Fields |
|---|---|---|
| `ad_worker_run_completed` | `alertzero_ad_worker_run_completed` | `alerts_analyzed`, `batches_total`, `batches_failed`, `attacks_generated`, `attacks_persisted` (counts, default `0`), `run_outcome` (required) |
| `ad_worker_review_started` | `alertzero_ad_worker_review_started` | `investigation_id` (UUID, required), `is_rereview` (required) |
| `ad_worker_analysis_completed` | `alertzero_ad_worker_analysis_completed` | `verdict` (required), `analysis_error` (default `false`) |
| `ad_worker_handoff_resolved` | `alertzero_ad_worker_handoff_resolved` | `outcome`, `verdict` (`true_positive` or `inconclusive`, the verdicts that escalate), `auto_approve_requested` (required) |

Semantics to keep in mind:
- Review events can arrive before `run_completed`.
- A missing `run_completed` means that the runner was cancelled, failed or timed out. Read the root's engine event.
- Skipped reviews send nothing, so `attacks_persisted` ≥ the number of `review_started` events.

### `alertzero_ad_worker_run_completed`

Emitted by the runner once every review has been dispatched.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See [the envelope](../README.md#the-envelope) |
| `run_outcome` | keyword | yes | `produced`, `empty_no_alerts`, `empty_no_attacks`, `empty_all_duplicates`, `degraded_partial` or `failed_all_batches`. When every batch fails, the run still completes; this marks it |
| `alerts_analyzed` | long | yes | Alerts sent to generation |
| `batches_total` | long | yes | Generation batches attempted |
| `batches_failed` | long | yes | Generation batches that failed |
| `attacks_generated` | long | yes | Attacks the model generated, before deduplication |
| `attacks_persisted` | long | yes | Attacks persisted and dispatched for review |

### `alertzero_ad_worker_review_started`

Emitted by a review once its Investigation exists.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See [the envelope](../README.md#the-envelope) |
| `investigation_id` | keyword | yes | The Investigation the review opened or reused. It joins Investigation events to the run |
| `is_rereview` | boolean | yes | Whether the attack already had an Investigation |

### `alertzero_ad_worker_analysis_completed`

Emitted by a review after the FP/TP verdict is recorded.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See [the envelope](../README.md#the-envelope) |
| `verdict` | keyword | yes | `true_positive`, `false_positive`, `inconclusive` or `failed`. Timeouts are `failed`, never `inconclusive` |
| `analysis_error` | boolean | yes | Whether the analysis failed or timed out. Liquid cannot tell a timeout apart from other failures |

### `alertzero_ad_worker_handoff_resolved`

Emitted by a review after a **completed** escalation gate. For a gate that failed or was cancelled, use the proposals events, which join to this run through the gate run's `workflow_execution_id` and the first hop of the Workflows engine's `executionChain`.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See [the envelope](../README.md#the-envelope) |
| `outcome` | keyword | yes | `approved`, `dismissed`, `expired` or `approved_action_failed` |
| `verdict` | keyword | yes | The verdict that led to the escalation (`true_positive` or `inconclusive`) |
| `auto_approve_requested` | boolean | yes | Whether the review asked the gate to auto-approve |
