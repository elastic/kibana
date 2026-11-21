# How the Rule Coverage Worker reports

The Worker's global sweep reports the run, and each review reports its own detection gap. Its own events are under [Events](#events); the envelope and the events every Worker shares are in the [telemetry README](../README.md).

| Workflow | Step | `event` | Where |
|---|---|---|---|
| `coverage_worker.yaml` | `report_worker_run_completed` | `worker_run_completed` | Right before `emit_result` |
| `coverage_review.yaml` | `report_investigation_closed_resolved`, `_dismissed` | `worker_investigation_closed` | Right after each close in the `close_investigation` switch |
| `coverage_review.yaml` | `report_investigation_closed_declined` | `worker_investigation_closed` | Right after `close_investigation_declined`, in the entry gate's `dismissed` arm |
| `coverage_review.yaml` | `report_review_completed_declined` | `rule_coverage_review_completed` | Right before `stop_declined`, in the entry gate's `dismissed` arm |
| `coverage_review.yaml` | `report_review_completed_undecided` | `rule_coverage_review_completed` | Right before `stop_expired`, in the entry gate's `expired` arm |
| `coverage_review.yaml` | `report_review_completed` | `rule_coverage_review_completed` | Right before `emit_result` |

The review reports a manual entry gate in the gate's own arm: `entry_gate: declined` or `undecided` (with `decision: none`) right before the step that ends the run. The review's main report sends `approved` or `skipped`.

## Runs

| `candidates_found` | `items_dispatched` | `items_in_flight` | `source_read_failed` / `lookup_failed` |
|---|---|---|---|
| Pending gap indicators in the lookback window | Reviews started | Earlier reviews plus the ones started | The indicator search / the active-review lookup |

The sweep does not report `items_failed`. It starts its reviews without waiting for them, so the review decisions come from each review's own event.

- `failed_source_unavailable` when the search fails, `empty_nothing_pending` with no pending indicator, `empty_at_capacity` when indicators are pending but no review slot is free, `degraded_partial` when the open-review ceiling left fewer free slots than the batch size and cut the batch short (both with `degraded_reason: capacity`), `produced` otherwise. A batch smaller than the queue with slots to spare is still `produced`.
- A failed lookup that the sweep carries on without gives `degraded_reason: dependency_unavailable`.

## Rule type and source

The review reads them from the rule the review is about: the one it proposes to enable, install or confirm, read back after the change when there was one. A proposed new rule is always `esql` and `custom`, since rule creation only drafts ES|QL. An install proposal is `prebuilt` even when the install didn't land, and then has no `rule_type`. The review passes the rule's own `type`, which the step maps: `machine_learning` to `ml`, `saved_query` to `query`, and any type outside the list to `other`. A rule is `prebuilt` when its `rule_source.type` is `external` or it is `immutable`.

## Applied

The review sends `applied` only when the change landed, and `approved_not_applied` when an approved change did not. It re-reads the rule after an approved enable or install, and requires it enabled.

## Closes

| Close | `close_reason` |
|---|---|
| Decision applied: read back from the close, which writes `resolved`, or `other` when the analyst only acknowledged a report | `resolved` or `other` |
| Proposal dismissed | `other` |
| Entry gate declined | `other` |

## Events

Each event takes this input on the `alertzero.reportWorkerOutcome` step (see the [step README](../../step_types/report_worker_outcome/README.md)):

| `event` | Reports | Fields |
|---|---|---|
| `rule_coverage_review_completed` | `alertzero_rule_coverage_review_completed` | `verdict`, `proposal_kind`, `decision`, `entry_gate` (required), `applied`, `approved_not_applied`, `rule_created`, `creation_skipped`, `creation_failed`, `check_failed`, `ki_processed` (flags), `rule_type` (the rule's own `type`, which the step maps to the event's vocabulary), `rule_source` (optional), `investigation_id` (UUID, required unless `check_failed`) |

### `alertzero_rule_coverage_review_completed`

Emitted by a Rule Coverage review for one detection gap (a knowledge indicator), when it ends.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See [the envelope](../README.md#the-envelope) |
| `verdict` | keyword | yes | The coverage check's verdict: `covered_enabled`, `covered_disabled`, `prebuilt_available`, `no_coverage` or `none` |
| `entry_gate` | keyword | yes | `skipped` (no entry gate ran: assisted autonomy, or no Investigation was opened), `approved`, `declined` or `undecided` (nobody answered it). A declined or unanswered gate ends the review, so its event has `decision: none` |
| `proposal_kind` | keyword | yes | What the review proposed: `enable_rule`, `install_prebuilt_rule`, `create_rule`, `confirm_coverage`, `manual_follow_up` (an action-less report when the check's result could not be acted on) or `none` |
| `decision` | keyword | yes | `approved`, `dismissed`, `undecided` (a proposal nobody decided) or `none` (no proposal) |
| `applied` | boolean | yes | Whether an approved enable or install landed, confirmed by re-reading the rule |
| `approved_not_applied` | boolean | yes | Whether an approved enable or install did not land. The indicator then stays pending |
| `rule_created` | boolean | yes | Whether a new rule was created for the gap |
| `rule_type` | keyword | no | The type of the rule the review is about (the one it proposed to enable, install, confirm or create): `query`, `eql`, `esql`, `threshold`, `new_terms`, `ml`, `threat_match` or `other` (`ml` is machine learning; `query` includes saved query), mapped by the step from the rule's own `type`. Absent when there is none |
| `rule_source` | keyword | no | `prebuilt` or `custom`, for the same rule. Absent when there is none |
| `creation_skipped` | boolean | yes | Whether the rule-creation run completed without proposing a rule |
| `creation_failed` | boolean | yes | Whether the rule-creation run failed |
| `check_failed` | boolean | yes | Whether the indicator was not found or the check returned no verdict |
| `ki_processed` | boolean | yes | Whether the indicator was marked processed |
| `investigation_id` | keyword | no | The Investigation the review opened. It joins to the close. Absent only when `check_failed` is true, because the review opens none when the indicator is not found |

The review's free-text outputs (`check_error`, `creation_error`, `creation_skip_reason`, rule names) are reported only as the booleans above.
