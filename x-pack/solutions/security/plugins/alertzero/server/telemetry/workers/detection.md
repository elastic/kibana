# How the Rule Tuning and Rule Coverage Workers report

Each Worker's global sweep reports the run, and each review reports its own rule or detection gap. Event fields are in the [telemetry README](../README.md).

| Workflow | Step | `event` | Where |
|---|---|---|---|
| `rule_tuning_worker.yaml` | `report_worker_run_completed` | `worker_run_completed` | Right before `emit_result` |
| `rule_tuning_review.yaml` | `report_investigation_closed_declined`, `_applied`, `_dismissed` | `worker_investigation_closed` | Right after each close |
| `rule_tuning_review.yaml` | `report_review_completed_declined` | `rule_tuning_review_completed` | Right before `stop_declined`, in the entry gate's `dismissed` arm |
| `rule_tuning_review.yaml` | `report_review_completed_undecided` | `rule_tuning_review_completed` | Right before `stop_expired`, in the entry gate's `expired` arm |
| `rule_tuning_review.yaml` | `report_review_completed` | `rule_tuning_review_completed` | Right before `emit_result` |
| `coverage_worker.yaml` | `report_worker_run_completed` | `worker_run_completed` | Right before `emit_result` |
| `coverage_review.yaml` | `report_investigation_closed_resolved`, `_dismissed` | `worker_investigation_closed` | Right after each close in the `close_investigation` switch |
| `coverage_review.yaml` | `report_investigation_closed_declined` | `worker_investigation_closed` | Right after `close_investigation_declined`, in the entry gate's `dismissed` arm |
| `coverage_review.yaml` | `report_review_completed` | `rule_coverage_review_completed` | Right before `emit_result` |

A Rule Coverage review that stops at its manual entry gate (declined or unanswered) ends before `report_review_completed`, so it sends no review event. A declined gate still reports its close.

## Runs

| Worker | `candidates_found` | `items_dispatched` | `items_in_flight` | `source_read_failed` / `lookup_failed` |
|---|---|---|---|---|
| Rule Tuning | Rules over the false-positive thresholds | Reviews requested | Reviews earlier sweeps still have in flight | The harvest query / the in-flight review lookup |
| Rule Coverage | Pending gap indicators in the lookback window | Reviews started | Earlier reviews plus the ones started | The indicator search / the active-review lookup |

Neither sweep reports `items_failed`. The sweeps start their reviews without waiting for them, so the review decisions come from each review's own event.

- **Rule Tuning:** `failed_source_unavailable` when the harvest fails, `produced` when it requested a review, `empty_nothing_found` otherwise.
- **Rule Coverage:** `failed_source_unavailable` when the search fails, `empty_nothing_pending` with no pending indicator, `empty_at_capacity` when indicators are pending but no review slot is free (`degraded_reason: capacity`), `produced` otherwise.
- A failed lookup that either sweep carries on without gives `degraded_reason: dependency_unavailable`.

## Rule type and source

- **Rule Tuning** reads both from the reviewed rule (`fetch_rule`).
- **Rule Coverage** reads them from the rule the review is about: the one it proposes to enable, install or confirm, read back after the change when there was one. A proposed new rule is always `esql` and `custom`, since rule creation only drafts ES|QL. An install proposal is `prebuilt` even when the install didn't land, and then has no `rule_type`.
- `machine_learning` is sent as `ml`, `saved_query` as `query`, and any type outside the list as `other`. A rule is `prebuilt` when its `rule_source.type` is `external` or it is `immutable`.

## Closes

| Worker | Close | `close_reason` |
|---|---|---|
| Rule Tuning | Entry gate declined | `other` |
| Rule Tuning | Tuning proposal approved | `resolved` |
| Rule Tuning | Tuning proposal dismissed | `other` |
| Rule Coverage | Decision applied: read back from the close, which writes `resolved`, or `other` when the analyst only acknowledged a report | `resolved` or `other` |
| Rule Coverage | Proposal dismissed | `other` |
| Rule Coverage | Entry gate declined | `other` |
