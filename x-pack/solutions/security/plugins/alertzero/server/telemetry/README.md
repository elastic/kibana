# AlertZero telemetry

Event-Based Telemetry (EBT) events registered by the `alertzero` plugin. They go through core analytics (`core.analytics`), so opted-out clusters send nothing.

The events are registered in `setup()` inside the `xpack.alertzero.enabled` guard, so with the kill switch off no AlertZero event type exists. See the plugin [README](../../README.md).

Run reliability (started, completed, failed, cancelled, timed out) is not duplicated here. It comes from the Workflows engine's own terminal execution events. Join them to these events through `run_id`, which is the root execution id. AlertZero events cover only what the engine cannot know: domain outcomes, including the Worker's own Investigation closes.

## Privacy contract

- **No identities.** No event carries a user name, email, role, API key, or anything read from a `KibanaRequest`. The static test in `event_types.test.ts` fails if any file in this directory imports `KibanaRequest` or `ProposalUser`, so audit data stays out by construction. Audit logging is a separate pipeline.
- **No free text.** Every field is a closed enum, a bounded count, a boolean, or a system-generated id. No field carries titles, summaries, descriptions, comments, rationales, verdict text, error messages, alert content or query content. No field uses the `text` type.
- **No space ids.** Events carry `is_default_space` instead. This holds only within AlertZero's own events (see "What a join reaches" below).
- **System ids ship raw.**
  - `run_id` and `execution_id` are generated UUIDs, which the engine already ships.
  - `investigation_id` is the Investigation's Agent Builder conversation id, which already ships raw as Agent Builder's `conversation_id`. Most Workers' Investigations get a random id, but two are derived from a customer record, so each is stable for that record. Neither names a person or carries alert content:
    - Attack Discovery: the review's `resolve_investigation_id` step takes the first 120 bits of the attack's `kibana.alert.uuid` (a SHA-256 hex) and sets the UUID version and variant characters to `8`.
    - Hunt: `buildHuntInvestigationConversationId` takes a UUID v5 of the threat report id.
  - Workflow ids ship only as a Worker catalog id; anything else is `other`.
- **Closed schemas.** No field is `pass_through`. In dev mode, a payload with an undeclared key throws, and the schema tests check this.
- **Never throw.** Every emission goes through `safeReportEvent`, which catches everything and logs at debug level. Emitters report after their write resolves, never inside an optimistic-concurrency callback, and only on a real transition.

### What a join reaches

The ids above add no content of their own, but they join to events other plugins already ship. So "no space ids" and "no free text" hold only within AlertZero's own events, not across a join:

- `run_id` and `execution_id` join to the Workflows engine's run events (`workflows_execution_workflow_completed`, `_failed` and `_cancelled`) on `workflowExecutionId`. Those carry the raw `spaceId`, the `workflowId` (for a custom workflow, usually built from its name), `ruleId` on an alert-triggered run, and the free-text `errorMessage` and `cancellationReason`.
- They also join to Agent Builder's round events (`agent_builder_round_complete` and `_round_error`) on `workflow_execution_id`, for the rounds an `ai.agent` step of that run started ([#297574](https://github.com/elastic/kibana/pull/297574)). A child run's rounds reach the Worker through the engine's `executionChain`.
- `investigation_id` joins to Agent Builder's events on `conversation_id`: `agent_builder_round_error`, whose `error_message` is free text truncated to 500 characters, and `agent_builder_conversation_fields_changed` ([#297578](https://github.com/elastic/kibana/pull/297578)), which reports every change to the Investigation's status and close reason.

The schema tests (`event_types.test.ts`) enforce the following:
- every field has a description;
- no field is `text` or `pass_through`;
- no field name is in the denylist (`user`, `username`, `email`, `name`, `title`, `message`, `rationale`, `comment`, `description`, `space_id`, `spaceId`, `decidedBy`, `executionError`, `actionInput`);
- this README documents exactly the registered events.

## Module

| File | Contents |
|---|---|
| `constants.ts` | `ALERTZERO_TELEMETRY_PREFIX`, the `ALERTZERO_TELEMETRY_EVENTS` name map, and the closed vocabularies |
| `event_types.ts` | One `EventTypeOpts` and one payload type per event, plus `ALERTZERO_TELEMETRY_EVENT_TYPES` |
| `register_telemetry_events.ts` | `registerAlertZeroTelemetryEvents(analytics)`, called once in `setup()` |
| `safe_report_event.ts` | `safeReportEvent` and `createAlertZeroTelemetryReporter`, the never-throw reporters; both return whether the event was reported |
| `envelope/` | `buildAlertZeroEnvelope` and its resolvers |
| `../../common/telemetry/constants.ts` | The Worker outcome vocabularies (the Attack Discovery Worker's, the shared run outcome, and each Worker's item events) and the Investigation close reasons any Worker reports, which the report step's input schema shares |
| `worker_investigation/` | `buildWorkerInvestigationReopenedPayload`, used by Hunt's find-or-create route |

## The envelope

Every Worker run event (the `alertzero_ad_worker_*` events, `alertzero_worker_investigation_closed`, `alertzero_worker_run_completed` and each Worker's item events) carries these fields. `buildAlertZeroEnvelope({ executionId, root })` builds them from the run's **root execution**, the persisted `WorkflowExecutionDto` of the Worker that started the chain. It reads nothing from workflow inputs or the step context.

| Field | Type | Required | Source |
|---|---|---|---|
| `worker_id` | keyword | yes | The root's `originManagedWorkflowId` if it is in the Worker catalog (`SYSTEM_SECURITY_WORKER_CATALOG`), else `other` |
| `watch_tag` | keyword | yes | The catalog entry's `watchTag`, else `other` |
| `autonomy_level` | keyword | no | The root's persisted `workflowDefinition.consts.worker_settings.autonomy` (`manual`, `assisted` or `supervised`). This is never the installed Worker's current settings: a review can park for 72h while the settings change. Absent when the root carries no recognised level, or when the run does not act at that level (see below) |
| `autonomy_mode` | keyword | no | Derived: `auto_accept` for `supervised` (the review gate auto-approves), `gated` for `manual` and `assisted`. Absent with `autonomy_level` |
| `run_id` | keyword | yes | The root execution id. Every event of one Worker run shares it |
| `execution_id` | keyword | yes | The execution that reported the event: the root or a descendant (for example a review) |
| `is_default_space` | boolean | yes | Whether the root's `spaceId` is the default space |
| `trigger_type` | keyword | yes | The root's persisted `triggeredBy`: `manual`, `scheduled`, `alert` or `workflow_step` for the built-in sources; `event` for a registered trigger id with the engine's dispatch evidence; `other` for any other provenance string; `unknown` when it is missing. `workflow_step` is the engine's `workflow-step` (its `triggerType` value), spelled with an underscore; the other built-in values and `event` match the engine's |

Launch-gate metrics should select `trigger_type: scheduled` (or `event` for pollers). A manual run of a managed Worker can be steered with inputs.

Some Workers act at their configured autonomy only for some triggers, and for those the envelope has no `autonomy_level` or `autonomy_mode` when the run started another way, rather than a level the run did not act at. `envelope/uses_configured_autonomy.ts` lists them, keyed by catalog Worker id, and a test fails when a Worker's YAML starts or stops reading `execution.triggeredBy` without the list changing. Today it lists one:

| Worker | Acts at its configured autonomy when | Otherwise |
|---|---|---|
| Endpoint Analysis | `trigger_type: scheduled` | `set_ki_autonomy` in `forensics_endpoint_analysis.yaml` writes `manual` to each indicator it dispatches, so the analysis waits for approval |

## Worker run events

The `alertzero.reportWorkerOutcome` workflow step emits these events from Worker YAML. Two are shared by every catalogued Worker, and the envelope's `worker_id` says which Worker sent them: `alertzero_worker_run_completed` (how one run ended) and `alertzero_worker_investigation_closed` (a Worker closing an Investigation). Every other event belongs to one Worker. Each Worker documents its report steps, where they sit and the close reasons it maps, in `workers/<worker>.md`, added with that Worker's YAML:

| Event | Worker | One per |
|---|---|---|
| `alertzero_ad_worker_run_completed`, `_review_started`, `_analysis_completed`, `_handoff_resolved` | Attack Discovery | Run, or reviewed attack |
| `alertzero_alert_triage_batch_classified` | Alert Triage | Classified alert batch |
| `alertzero_alert_triage_batch_grouped` | Alert Triage | Classified alert batch |
| `alertzero_alert_triage_closure_resolved` | Alert Triage | Settled closure proposal |
| `alertzero_rule_tuning_review_completed` | Rule Tuning | Reviewed rule |
| `alertzero_rule_coverage_review_completed` | Rule Coverage | Reviewed detection gap |
| `alertzero_hunt_report_completed` | Continuous Threat Hunt | Hunted and packaged threat report |
| `alertzero_endpoint_analysis_completed` | Endpoint Analysis | Analyzed indicator |

The step reports a Worker's own event only from that Worker's run (the run's root execution is that Worker), so one Worker's YAML cannot report another Worker's outcome. Report steps use `on-failure: continue`, so the counts are lower bounds.

The step reports only for a managed AlertZero Worker run. It skips a test run, a workflow AlertZero does not manage, and any chain whose persisted ancestors are not all non-test AlertZero executions in the same space up to a catalog Worker root. Its input is a closed union of enums, bounded counts and flags, and its output is `{ reported }` alone. The caller check is best-effort. See the [step README](../step_types/report_worker_outcome/README.md).

Semantics to keep in mind:
- Review events can arrive before `run_completed`.
- A missing `run_completed` means that the runner was cancelled, failed or timed out. Read the root's engine event.
- Skipped reviews send nothing, so `attacks_persisted` ≥ the number of `review_started` events.

### `alertzero_ad_worker_run_completed`

Emitted by the runner once every review has been dispatched.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See above |
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
| envelope | | | See above |
| `investigation_id` | keyword | yes | The Investigation the review opened or reused. It joins Investigation events to the run |
| `is_rereview` | boolean | yes | Whether the attack already had an Investigation |

### `alertzero_ad_worker_analysis_completed`

Emitted by a review after the FP/TP verdict is recorded.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See above |
| `verdict` | keyword | yes | `true_positive`, `false_positive`, `inconclusive` or `failed`. Timeouts are `failed`, never `inconclusive` |
| `analysis_error` | boolean | yes | Whether the analysis failed or timed out. Liquid cannot tell a timeout apart from other failures |

### `alertzero_ad_worker_handoff_resolved`

Emitted by a review after a **completed** escalation gate. For a gate that failed or was cancelled, use the proposals events, which join to this run through the gate run's `workflow_execution_id` and the first hop of the Workflows engine's `executionChain`.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See above |
| `outcome` | keyword | yes | `approved`, `dismissed`, `expired` or `approved_action_failed` |
| `verdict` | keyword | yes | The verdict that led to the escalation (`true_positive` or `inconclusive`) |
| `auto_approve_requested` | boolean | yes | Whether the review asked the gate to auto-approve |

### `alertzero_worker_investigation_closed`

Emitted by a Worker after it closes an Investigation, usually its own. Any catalogued Worker can report its closes this way.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See above. `worker_id` says which Worker closed the Investigation |
| `investigation_id` | keyword | yes | The Investigation the Worker closed. For the Attack Discovery Worker it joins to `alertzero_ad_worker_review_started` |
| `close_reason` | keyword | yes | The Investigation template's close reason the Worker wrote, or the class its close maps to: `false_positive`, `benign`, `resolved`, `duplicate` or `other` |

A Worker reports each close right after it, and only when the close left no error and changed `status`:
- Without the first condition, a close that failed (closes continue on failure) would still count.
- Without the second, a Worker that found its Investigation already closed by a person would count that close again.

The reason is the one the close writes, and `other` when it writes none. A run that never reaches its close (a gate that expires and leaves the Investigation open, or a failed run) sends nothing.

Only a Worker's own closes are measured, and only for a Worker whose YAML calls the step. A close by an Agent Builder agent (`set_conversation_metadata`), a custom workflow or a direct Agent Builder API call sends nothing here. A human close through Agentic Investigations reports its own `agentic_investigations_investigation_closed`.

Agent Builder's `agent_builder_conversation_fields_changed` counts every close, whoever made it, with the same close reason, so a Worker's close sends both events, joined on `investigation_id` = `conversation_id`. This event stays because Agent Builder's carries no run or execution id, so it can't tell a Worker's close from anyone else's. This one says which Worker and which run closed the Investigation.

### `alertzero_worker_investigation_reopened`

Emitted when the Hunt Worker reopens an Investigation a previous run closed, so a new run on the same threat report records into active work.

- Hunt's find-or-create route (`routes/hunt/find_or_create_investigation.ts`) reopens it in TypeScript, not YAML, so the route reports it once the reopen succeeds. Reporting never fails the find-or-create.
- It has no run envelope and no `run_id`, because the route doesn't verify which run called it. Only the Hunt Worker's find-or-create step calls the route, so the event is attributed to that Worker.

| Field | Type | Required | Description |
|---|---|---|---|
| `worker_id` | keyword | yes | Catalog id of the Worker that reopened the Investigation (the Hunt Worker) |
| `watch_tag` | keyword | yes | The Worker's catalog watch tag |
| `is_default_space` | boolean | yes | Whether the Investigation is in the default space |
| `investigation_id` | keyword | yes | The Investigation the Worker reopened. A Hunt Investigation id is a UUID v5 of the threat report id |

The reopen keeps the Investigation's last `close_reason`, since the template has no value meaning "not closed", so read the reason only from close events. Agent Builder's `agent_builder_conversation_fields_changed` also reports the reopen (`status` to `open`, with `source: server_api`); this event is what says the Hunt Worker made it.

### `alertzero_worker_run_completed`

Emitted once by a Worker run, at its end, in one vocabulary for every Worker, so a quiet Worker can be told from a broken one without reading each Worker's own events. The epic's investigation and proposal counts come from joins on `run_id` (for proposals, through the gate run's `workflow_execution_id` and the first hop of the Workflows engine's `executionChain`), not from this event.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See above. `worker_id` says which Worker ran |
| `run_outcome` | keyword | yes | `produced` (did the work it found), `empty_nothing_pending` (no work was queued), `empty_nothing_found` (searched and found nothing), `empty_at_capacity` (work existed but a limit held all of it back), `degraded_partial` (some items produced results, others failed or were held back), `failed_source_unavailable` (the source of work could not be read), `failed_all_items` (every item failed) or `blocked_precondition` (a precondition such as a readable data scope was not met) |
| `degraded` | boolean | yes | Whether the run did less than the work it found: some items failed, a lookup failed and the run carried on without it, reading its source failed, or a limit held work back. Derived on the server: true when `degraded_reason` isn't `none`, `lookup_failed` or `source_read_failed` is true, or `items_failed` is above 0 |
| `degraded_reason` | keyword | yes | The main reason, `none` when `degraded` is false: `missing_data` (an input or intermediate result was missing), `dependency_unavailable` (a service, model or child workflow failed or could not be read), `partial_timeout` (some items ran out of time), `capacity` (a limit held work back) or `other` |
| `candidates_found` | long | yes | Work items the run found, in the Worker's own unit |
| `items_dispatched` | long | yes | Work items the run started or handed on |
| `items_failed` | long | yes | Work items that failed or could not be started |
| `items_in_flight` | long | yes | Work items still in progress when the run reported that it did not wait for: reviews or analyses it handed off, or that earlier runs started |
| `source_read_failed` | boolean | yes | Whether reading the source of work failed. Zero candidates after a failed read does not mean there was no work |
| `lookup_failed` | boolean | yes | Whether a secondary lookup (for example the list of reviews already in progress) failed and the run carried on without it |

Counts a Worker cannot observe stay `0`. A run that fails or is cancelled before its end sends nothing; read the root's engine event.

Each Worker that reports its runs says what each count means for it, and how it derives `run_outcome`, in its `workers/<worker>.md`.

### `alertzero_alert_triage_batch_classified`

Emitted by the Alert Triage Worker once a batch of alerts is classified, before the closure review starts.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See above |
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
| envelope | | | See above |
| `alerts_with_strict_key` | long | yes | Classified alerts with a strict pattern key, whatever their verdict. An alert with no identifying field (path) has none |
| `strict_keys` | long | yes | Distinct strict keys among those alerts |
| `strict_keys_single_alert` | long | yes | Strict keys that only one alert of the batch has |
| `wide_keys` | long | yes | Distinct wide keys among the classified alerts. Every alert has one |
| `wide_keys_single_alert` | long | yes | Wide keys that only one alert of the batch has |
| `fp_candidates_on_fallback` | long | yes | False positives at or above the confidence floor that have no strict key, so they group by rule and detection only |
| `alerts_joined` | long | yes | Alerts that joined a proposal an earlier batch opened. `0` when grouping is off |
| `proposals_created` | long | yes | New closure proposals the batch raised. `0` when grouping is off |
| `alerts_pooled` | long | yes | Alerts pooled into one shared proposal. `0` when grouping is off |
| `conversation_created` | boolean | yes | Whether the batch created a conversation: one for each new proposal, and one for a failure that does not end the run (no verdicts, or some alerts without one). A batch that only joins proposals or has no false positive to propose creates none |

### `alertzero_alert_triage_closure_resolved`

Emitted by the Alert Triage closure review once its proposal has settled and the outcome has been applied.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See above |
| `outcome` | keyword | yes | `approved`, `dismissed`, `expired` or `unknown` (any other gate state, which leaves the Investigation open) |
| `alerts_proposed` | long | yes | Alerts the closure proposal covered |
| `alerts_retag_failed` | long | yes | Alerts a dismissal could not re-tag from `az:false_positive`, `0` on any other outcome |
| `revisions` | long | yes | Revisions the proposal reached when it settled, counting the first as `1`. More than `1` means alerts joined it |
| `auto_approve_requested` | boolean | yes | Whether the review asked the gate to auto-approve (supervised autonomy) |
| `proposal_read_failed` | boolean | yes | Whether the decided proposal could not be read back. A dismissal then leaves the tags and the Investigation untouched |
| `investigation_id` | keyword | yes | The Investigation of the proposal the review settled. Each new proposal has its own, and it joins to the close. It does not join to `alertzero_alert_triage_batch_classified`, which carries none |

### `alertzero_rule_tuning_review_completed`

Emitted by a Rule Tuning review for one rule, when it ends: after the manual entry gate is declined, or after the tuning proposal is decided.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See above |
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

### `alertzero_rule_coverage_review_completed`

Emitted by a Rule Coverage review for one detection gap (a knowledge indicator), when it ends.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See above |
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

### `alertzero_hunt_report_completed`

Emitted by Hunt packaging for one threat report, once packaging has run.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See above |
| `hunt_status` | keyword | yes | The hunt child's result status: `success`, `partial`, `failed` or `unknown` |
| `has_confirmed_hit` | boolean | yes | Whether the hunt cleared the confirmed-hit bar |
| `tier2_invoked` | boolean | no | Whether the hunt ran Tier 2 (behavioral queries). Absent when the Worker did not pass it |
| `package_status` | keyword | yes | Packaging's own status: `success` or `run_incomplete` |
| `closed_clean` | boolean | yes | Whether a clean run closed the Investigation as benign |
| `proposals_prepared` | long | yes | Proposals packaging prepared and launched a gate for |
| `proposals_dispatch_failed` | long | yes | Proposal gates that failed to launch |
| `mint_suppression` | keyword | yes | Why packaging held back its Proposals: `none`, `existing_proposals` or `check_failed` |
| `coverage_kis_written` | long | yes | Coverage knowledge items written for Detection Watch |
| `coverage_kis_skipped` | long | yes | Coverage knowledge items not written |
| `investigation_id` | keyword | no | The report's Investigation. It joins to the close and the reopen. Absent only when `package_status` is `run_incomplete`, because the Worker could not find or create the Investigation |

The epic's sweep counts (reports swept, Tier 2 invoked, findings reviewable or clean, coverage written) are sums of these events by `run_id`.

### `alertzero_endpoint_analysis_completed`

Emitted by one Endpoint Analysis run for one indicator, once it has reached its verdict and before it writes it to the indicator. The run works on the Attack Discovery Investigation named by the indicator and never opens one of its own. The Worker's proposal gate closes that Investigation once every containment Proposal is decided.

| Field | Type | Required | Description |
|---|---|---|---|
| envelope | | | See above |
| `analysis_outcome` | keyword | yes | How the run settled the indicator: `processed`, `no_host` (the discovery named no host), `failed` (no findings landed), `proposals_lost` (findings landed but a containment proposal did not reach the queue), `unreachable` (the Investigation could not be read), `invalid` (a malformed indicator) or `not_pending` (the indicator was no longer pending) |
| `reused_prior_assessment` | boolean | yes | Whether an earlier run's findings were already attached, so the agent did not run again |
| `host_resolved` | boolean | yes | Whether a host was found to analyze |
| `agent_failed` | boolean | yes | Whether the forensic agent failed |
| `timeline_found` | boolean | yes | Whether the analysis reconstructed any timeline event |
| `iocs_found` | boolean | yes | Whether the analysis extracted any indicator of compromise |
| `findings_attached` | boolean | yes | Whether both findings are on the Investigation |
| `actions_recommended` | long | yes | Containment actions the analysis recommended |
| `proposals_dispatched` | long | yes | Containment proposals dispatched to the queue |
| `proposals_dispatch_failed` | long | yes | Containment proposals that did not reach the queue |
| `auto_approve_requested` | boolean | yes | Whether the proposals ask the gate to auto-approve (supervised autonomy) |
