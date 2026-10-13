# How the Continuous Threat Hunt Worker reports

The Worker reports its sweep, packaging reports each threat report, and packaging and the proposal gate report their closes. The reopen is reported from TypeScript (see `alertzero_worker_investigation_reopened`). Event fields are in the [telemetry README](../README.md).

| Workflow | Step | `event` | Where |
|---|---|---|---|
| `hunt_continuous_threat_hunt.yaml` | `report_worker_run_completed` | `worker_run_completed` | The last step, after `report_fan_out` |
| `hunt_package_report.yaml` | `report_investigation_closed_benign` | `worker_investigation_closed` | Right after `dismiss_investigation_if_clean` |
| `hunt_package_report.yaml` | `report_report_completed` | `hunt_report_completed` | Right before `emit_result` |
| `hunt_proposal_gate.yaml` | `report_investigation_closed_settled` | `worker_investigation_closed` | Right after `close_if_settled` |

## Runs

A `parallel` branch's output is its last step's output, and a branch allows only atomic steps, so each report's branch ends in `record_report_outcome`, a `data.set` of the outcome the branch already resolved. The run report reads them from `report_fan_out.output.results`.

The items are the selected threat reports: `candidates_found` is the reports selected, `items_dispatched` the report branches run, and `items_failed` the reports whose hunt failed plus the branches that failed. `source_read_failed` is the candidate selection and `lookup_failed` the index scope check. `items_in_flight` isn't reported.

- `blocked_precondition`: the index scope is blocked (`degraded_reason: missing_data` when nothing is visible, `dependency_unavailable` when the scope check failed).
- `failed_source_unavailable`: the candidate selection failed.
- `empty_nothing_pending`: nothing was selected.
- `produced`: every report completed.
- `failed_all_items`: no report completed or was partial.
- `degraded_partial`: otherwise (`dependency_unavailable` with a failed report, `other` with only partial ones).

## Tier 2

`hunt.yaml` outputs `tier2_invoked`, true when the coordinator's result has status `tier1_and_tier2`. The Worker passes it to packaging as `tier2Invoked`, and packaging sends it as `tier2_invoked`. Packaging leaves it out when the calling Worker hasn't picked up the version that passes it.

## Closes

| Workflow | Close | `close_reason` |
|---|---|---|
| Packaging | A clean run with no confirmed hits | `benign` |
| Proposal gate | Every Proposal of the Investigation settled | `resolved` |

Every gate of an Investigation runs `close_if_settled` once its own Proposal settles, so only the gate whose close changed `status` reports.
