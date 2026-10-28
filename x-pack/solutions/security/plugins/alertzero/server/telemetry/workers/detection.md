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
| `coverage_review.yaml` | `report_review_completed_declined` | `rule_coverage_review_completed` | Right before `stop_declined`, in the entry gate's `dismissed` arm |
| `coverage_review.yaml` | `report_review_completed_undecided` | `rule_coverage_review_completed` | Right before `stop_expired`, in the entry gate's `expired` arm |
| `coverage_review.yaml` | `report_review_completed` | `rule_coverage_review_completed` | Right before `emit_result` |

Both reviews report a manual entry gate the same way: the gate's own arm reports `entry_gate: declined` or `undecided` (with `decision: none`) right before the step that ends the run, and the review's main report sends `approved` or `skipped`.

## Runs

| Worker | `candidates_found` | `items_dispatched` | `items_in_flight` | `source_read_failed` / `lookup_failed` |
|---|---|---|---|---|
| Rule Tuning | Rules over the false-positive thresholds that are still enabled, at the revision their alerts came from, so found minus requested is what the per-sweep cap held back | Reviews requested | Earlier reviews plus the ones requested | The harvest query or the enabled-rules lookup / the in-flight review lookup |
| Rule Coverage | Pending gap indicators in the lookback window | Reviews started | Earlier reviews plus the ones started | The indicator search / the active-review lookup |

Neither sweep reports `items_failed`. The sweeps start their reviews without waiting for them, so the review decisions come from each review's own event.

- **Rule Tuning:** `failed_source_unavailable` when the harvest or the enabled-rules lookup fails, `produced` when it requested a review, `empty_nothing_found` otherwise. The harvest drops rules already under review, so a sweep that finds only those reports `empty_nothing_found` with a non-zero `items_in_flight`, as Rule Coverage reports `empty_nothing_pending`.
- **Rule Coverage:** `failed_source_unavailable` when the search fails, `empty_nothing_pending` with no pending indicator, `empty_at_capacity` when indicators are pending but no review slot is free, `degraded_partial` when the open-review ceiling left fewer free slots than the batch size and cut the batch short (both with `degraded_reason: capacity`), `produced` otherwise. A batch smaller than the queue with slots to spare is still `produced`.
- A failed lookup that either sweep carries on without gives `degraded_reason: dependency_unavailable`.

## Rule type and source

- **Rule Tuning** reads both from the reviewed rule (`fetch_rule`).
- **Rule Coverage** reads them from the rule the review is about: the one it proposes to enable, install or confirm, read back after the change when there was one. A proposed new rule is always `esql` and `custom`, since rule creation only drafts ES|QL. An install proposal is `prebuilt` even when the install didn't land, and then has no `rule_type`.
- Both reviews pass the rule's own `type`, and the step maps it: `machine_learning` to `ml`, `saved_query` to `query`, and any type outside the list to `other`. A rule is `prebuilt` when its `rule_source.type` is `external` or it is `immutable`.

## Applied

Both reviews send `applied` only when the change landed, and `approved_not_applied` when an approved change did not.

- **Rule Tuning** re-reads the rule after an action reported success (`refetch_rule`). A query, risk score, threshold or schedule change bumps the rule's revision; an added exception item does not, so that arm counts on the action's success. An approved change identical to the rule (no new revision) counts as not applied. A `manual` change has no action, so neither flag is set.
- **Rule Coverage** re-reads the rule after an approved enable or install, and requires it enabled.

## Closes

| Worker | Close | `close_reason` |
|---|---|---|
| Rule Tuning | Entry gate declined | `other` |
| Rule Tuning | Tuning proposal approved | `resolved` |
| Rule Tuning | Tuning proposal dismissed | `other` |
| Rule Coverage | Decision applied: read back from the close, which writes `resolved`, or `other` when the analyst only acknowledged a report | `resolved` or `other` |
| Rule Coverage | Proposal dismissed | `other` |
| Rule Coverage | Entry gate declined | `other` |
