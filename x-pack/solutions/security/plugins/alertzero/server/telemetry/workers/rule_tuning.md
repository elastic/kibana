# How the Rule Tuning Worker reports

The Worker's global sweep reports the run, and each review reports its own rule. Its own events are under [Events](#events); the envelope and the events every Worker shares are in the [telemetry README](../README.md).

| Workflow | Step | `event` | Where |
|---|---|---|---|
| `rule_tuning_worker.yaml` | `report_worker_run_completed` | `worker_run_completed` | Right before `emit_result` |
| `rule_tuning_review.yaml` | `report_investigation_closed_declined`, `_applied`, `_dismissed` | `worker_investigation_closed` | Right after each close |
| `rule_tuning_review.yaml` | `report_review_completed_declined` | `rule_tuning_review_completed` | Right before `stop_declined`, in the entry gate's `dismissed` arm |
| `rule_tuning_review.yaml` | `report_review_completed_undecided` | `rule_tuning_review_completed` | Right before `stop_expired`, in the entry gate's `expired` arm |
| `rule_tuning_review.yaml` | `report_review_completed` | `rule_tuning_review_completed` | Right before `emit_result` |

The review reports a manual entry gate in the gate's own arm: `entry_gate: declined` or `undecided` (with `decision: none`) right before the step that ends the run. The review's main report sends `approved` or `skipped`.

## Runs

| `candidates_found` | `items_dispatched` | `items_in_flight` | `source_read_failed` / `lookup_failed` |
|---|---|---|---|
| Rules over the false-positive thresholds that are still enabled, at the revision their alerts came from, so found minus requested is what the per-sweep cap held back | Reviews requested | Earlier reviews plus the ones requested | The harvest query or the enabled-rules lookup / the in-flight review lookup |

The sweep does not report `items_failed`. It starts its reviews without waiting for them, so the review decisions come from each review's own event.

- `failed_source_unavailable` when the harvest or the enabled-rules lookup fails, `produced` when it requested a review, `empty_nothing_found` otherwise. The harvest drops rules already under review, so a sweep that finds only those reports `empty_nothing_found` with a non-zero `items_in_flight`.
- A failed lookup that the sweep carries on without gives `degraded_reason: dependency_unavailable`.

## Rule type and source

The review reads both from the reviewed rule (`fetch_rule`) and passes the rule's own `type`, which the step maps: `machine_learning` to `ml`, `saved_query` to `query`, and any type outside the list to `other`. A rule is `prebuilt` when its `rule_source.type` is `external` or it is `immutable`.

## Applied

The review sends `applied` only when the change landed, and `approved_not_applied` when an approved change did not. It re-reads the rule after an action reported success (`refetch_rule`). A query, risk score, threshold or schedule change bumps the rule's revision; an added exception item does not, so that arm counts on the action's success. An approved change identical to the rule (no new revision) counts as not applied. A `manual` change has no action, so neither flag is set.

## Closes

| Close | `close_reason` |
|---|---|
| Entry gate declined | `other` |
| Tuning proposal approved | `resolved` |
| Tuning proposal dismissed | `other` |

## Events

Each event takes this input on the `alertzero.reportWorkerOutcome` step (see the [step README](../../step_types/report_worker_outcome/README.md)):

| `event` | Reports | Fields |
|---|---|---|
| `rule_tuning_review_completed` | `alertzero_rule_tuning_review_completed` | `entry_gate`, `change_type`, `decision` (required), `confidence` (default `none`), `applied`, `approved_not_applied`, `backtest_ran`, `backtest_reduced_alerts`, `rule_unavailable` (flags), `rule_type` (the rule's own `type`, which the step maps to the event's vocabulary), `rule_source` (optional), `investigation_id` (UUID, required unless `rule_unavailable`) |

### `alertzero_rule_tuning_review_completed`

Emitted by a Rule Tuning review for one rule, when it ends: after the manual entry gate is declined, or after the tuning proposal is decided.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See [the envelope](../README.md#the-envelope) |
| `entry_gate` | keyword | yes | `skipped` (no entry gate ran: assisted autonomy, or a rule that could not be read), `approved`, `declined` or `undecided` (nobody answered it) |
| `change_type` | keyword | yes | The tuning change proposed: `query`, `risk_score`, `exception`, `threshold`, `schedule`, `manual` (the action-less arm, which also takes any type the other arms do not name) or `none` |
| `confidence` | keyword | yes | The diagnosis's stated confidence: `low`, `medium`, `high` or `none` |
| `decision` | keyword | yes | `approved`, `dismissed`, `undecided` (a proposal nobody decided) or `none` (no proposal) |
| `applied` | boolean | yes | Whether an approved change landed on the rule, confirmed by re-reading it: a new revision, or the exception item the change added |
| `approved_not_applied` | boolean | yes | Whether an approved change with an action succeeded but could not be confirmed on the rule (the re-read failed or showed no new revision). The review still tags the alerts and closes the Investigation, so no later sweep retries it |
| `backtest_ran` | boolean | yes | Whether both backtest previews (current and proposed rule) succeeded |
| `backtest_reduced_alerts` | boolean | yes | Whether the proposed rule produced fewer preview alerts. False when the backtest did not run |
| `rule_unavailable` | boolean | yes | Whether the rule could not be read or was disabled, so the review did nothing |
| `rule_type` | keyword | no | The reviewed rule's type: `query`, `eql`, `esql`, `threshold`, `new_terms`, `ml`, `threat_match` or `other` (`ml` is machine learning; `query` includes saved query). The YAML passes the rule's own `type` and the step maps it, so the vocabulary lives in one place. Absent when the rule could not be read |
| `rule_source` | keyword | no | `prebuilt` (an Elastic prebuilt rule) or `custom`. Absent when the rule could not be read |
| `investigation_id` | keyword | no | The Investigation the review opened. It joins to the close. Absent only when `rule_unavailable` is true, because the review opens none for a rule it cannot read or that is disabled |
