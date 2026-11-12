# How the Alert Triage Worker reports

Each batch the sweep starts reports how its alerts were classified and how its run ended, and its closure review reports how the proposal settled. Its own events are under [Events](#events); the envelope and the events every Worker shares are in the [telemetry README](../README.md).

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

## Events

Each event takes this input on the `alertzero.reportWorkerOutcome` step (see the [step README](../../step_types/report_worker_outcome/README.md)):

| `event` | Reports | Fields |
|---|---|---|
| `alert_triage_batch_classified` | `alertzero_alert_triage_batch_classified` | `alerts_total`, `verdicts_true_positive`, `verdicts_false_positive`, `verdicts_inconclusive`, `alerts_without_verdict`, `fp_candidates`, `fp_below_floor` (counts), `investigation_id` (UUID, optional, not sent by the batch) |
| `alert_triage_batch_grouped` | `alertzero_alert_triage_batch_grouped` | `alerts_with_strict_key`, `strict_keys`, `strict_keys_single_alert`, `wide_keys`, `wide_keys_single_alert`, `fp_candidates_on_fallback`, `alerts_joined`, `proposals_created`, `alerts_pooled` (counts), `conversation_created` (flag) |
| `alert_triage_closure_resolved` | `alertzero_alert_triage_closure_resolved` | `outcome` (required), `alerts_proposed`, `alerts_retag_failed`, `revisions` (counts), `auto_approve_requested` (required flag), `proposal_read_failed` (flag), `investigation_id` (UUID, required) |


### `alertzero_alert_triage_batch_classified`

Emitted by the Alert Triage Worker once a batch of alerts is classified, before the closure review starts.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See [the envelope](../README.md#the-envelope) |
| `alerts_total` | long | yes | Alerts in the batch |
| `verdicts_true_positive` | long | yes | Alerts classified as true positives |
| `verdicts_false_positive` | long | yes | Alerts classified as false positives |
| `verdicts_inconclusive` | long | yes | Alerts classified as inconclusive |
| `alerts_without_verdict` | long | yes | Alerts the analysis returned no verdict for. They are not tagged, noted or proposed |
| `fp_candidates` | long | yes | False positives at or above the confidence floor, which the closure proposal covers |
| `fp_below_floor` | long | yes | False positives below the floor, which are tagged and noted but not proposed |
| `investigation_id` | keyword | no | Absent: a batch has no Investigation of its own. Only a new proposal or a failure creates one |

### `alertzero_alert_triage_batch_grouped`

Emitted by the Alert Triage Worker once for each classified batch, after it tagged the alerts with their pattern keys. It shows how well a pattern key would group the alerts of one rule, and what the grouping did. A batch holds one rule (or one detection of a rule), so the counts give a distribution across batches. The event carries no rule id and no key.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See [the envelope](../README.md#the-envelope) |
| `alerts_with_strict_key` | long | yes | Classified alerts with a strict pattern key, whatever their verdict. An alert with no identifying field (path) has none |
| `strict_keys` | long | yes | Distinct strict keys among those alerts |
| `strict_keys_single_alert` | long | yes | Strict keys that only one alert of the batch has |
| `wide_keys` | long | yes | Distinct wide keys among the classified alerts. Every alert has one |
| `wide_keys_single_alert` | long | yes | Wide keys that only one alert of the batch has |
| `fp_candidates_on_fallback` | long | yes | False positives at or above the confidence floor that have no strict key, so they group by rule and detection only |
| `grouping` | keyword | yes | `on`, or why the batch was not grouped: `supervised` (supervised autonomy never groups), `flag_off` (the `alertzero.triageGrouping` kill switch), `lookup_incomplete` (the proposal lookup returned fewer proposals than it matched, so the batch got random proposal ids and no joins) or `no_candidates` (nothing to propose) |
| `alerts_joined` | long | yes | Alerts that joined a proposal an earlier batch opened. `0` when grouping is off |
| `proposals_created` | long | yes | New closure proposals the batch raised. `0` when grouping is off |
| `alerts_pooled` | long | yes | Alerts pooled into one shared proposal. `0` when grouping is off |
| `conversation_created` | boolean | yes | Whether the batch created a conversation: one for each new proposal, and one for a failure that does not end the run (no verdicts, or some alerts without one). A batch that only joins proposals or has no false positive to propose creates none |

### `alertzero_alert_triage_closure_resolved`

Emitted by the Alert Triage closure review once its proposal has settled and the outcome has been applied.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See [the envelope](../README.md#the-envelope) |
| `outcome` | keyword | yes | `approved`, `dismissed`, `expired` or `unknown` (any other gate state, which leaves the Investigation open) |
| `alerts_proposed` | long | yes | Alerts the closure proposal covered |
| `alerts_retag_failed` | long | yes | Alerts a dismissal could not re-tag from `az:false_positive`, `0` on any other outcome |
| `revisions` | long | yes | Revisions the proposal reached when it settled, counting the first as `1`. More than `1` means alerts joined it |
| `auto_approve_requested` | boolean | yes | Whether the review asked the gate to auto-approve (supervised autonomy) |
| `proposal_read_failed` | boolean | yes | Whether the decided proposal could not be read back. A dismissal then leaves the tags and the Investigation untouched |
| `investigation_id` | keyword | yes | The Investigation of the proposal the review settled. Each new proposal has its own, and it joins to the close. It does not join to `alertzero_alert_triage_batch_classified`, which carries none |
