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
- this README and `workers/*.md` together document exactly the registered events.

## Module

| File | Contents |
|---|---|
| `constants.ts` | The `ALERTZERO_TELEMETRY_EVENTS` name map, with one entry per Worker, and the envelope's closed vocabularies |
| `worker_event_fields.ts` | `ALERTZERO_TELEMETRY_PREFIX`, the envelope, and the field helpers every event type uses |
| `../../common/telemetry/report_step_input_fields.ts` | The input field helpers every report step input schema uses, and `defineReportableEvents` |
| `event_types.ts` | The events any Worker reports, plus the payload map and `ALERTZERO_TELEMETRY_EVENT_TYPES`, each with one entry per Worker |
| `workers/<worker>.ts` | A Worker's own event names, payload types and `EventTypeOpts`; `workers/<worker>.md` documents them |
| `register_telemetry_events.ts` | `registerAlertZeroTelemetryEvents(analytics)`, called once in `setup()` |
| `safe_report_event.ts` | `safeReportEvent` and `createAlertZeroTelemetryReporter`, the never-throw reporters; both return whether the event was reported |
| `envelope/` | `buildAlertZeroEnvelope` and its resolvers |
| `../../common/telemetry/constants.ts` | The vocabularies more than one Worker reads (the shared run outcome, the Investigation close reasons, the review decisions and entry gates, the detection rule type and source), which the report step's input schema shares |
| `../../common/telemetry/workers/<worker>.ts` | A Worker's own vocabularies and report step input schemas, keyed by its catalog id |
| `worker_investigation/` | `buildWorkerInvestigationReopenedPayload`, used by Hunt's find-or-create route |

### Adding an event

A new event for an existing Worker touches only that Worker's files: its vocabulary and input schema in `common/telemetry/workers/<worker>.ts` (with a fixture in `<worker>.fixture.ts`), its name, payload and `EventTypeOpts` in `workers/<worker>.ts` (with a fixture in `<worker>.fixture.ts`), its section in `workers/<worker>.md`, and its `../step_types/report_worker_outcome/shipped_yaml_contract.<worker>.*` contract test. A new Worker adds one line to each list that spreads the Workers: `ALERTZERO_TELEMETRY_EVENTS`, `AlertZeroTelemetryEventPayloads`, `ALERTZERO_TELEMETRY_EVENT_TYPES`, `REPORTABLE_WORKER_EVENTS`, the fixtures in `event_types.test.ts` and `report_worker_outcome_step.test.ts`, and the table under [Worker run events](#worker-run-events).

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

The `alertzero.reportWorkerOutcome` workflow step emits these events from Worker YAML. Two are shared by every catalogued Worker, and the envelope's `worker_id` says which Worker sent them: `alertzero_worker_run_completed` (how one run ended) and `alertzero_worker_investigation_closed` (a Worker closing an Investigation). Every other event belongs to one Worker. Each Worker documents its own events, its report steps, where they sit and the close reasons it maps, in `workers/<worker>.md`, added with that Worker's YAML:

| Doc | Worker |
|---|---|
| [`workers/attack_discovery.md`](workers/attack_discovery.md) | Attack Discovery |
| [`workers/alert_triage.md`](workers/alert_triage.md) | Alert Triage |
| [`workers/rule_tuning.md`](workers/rule_tuning.md) | Rule Tuning |
| [`workers/rule_coverage.md`](workers/rule_coverage.md) | Rule Coverage |
| [`workers/continuous_threat_hunt.md`](workers/continuous_threat_hunt.md) | Continuous Threat Hunt |
| [`workers/endpoint_analysis.md`](workers/endpoint_analysis.md) | Endpoint Analysis |

The step reports a Worker's own event only from that Worker's run (the run's root execution is that Worker), so one Worker's YAML cannot report another Worker's outcome. Report steps use `on-failure: continue`, so the counts are lower bounds.

The step reports only for a managed AlertZero Worker run. It skips a test run, a workflow AlertZero does not manage, and any chain whose persisted ancestors are not all non-test AlertZero executions in the same space up to a catalog Worker root. Its input is a closed union of enums, bounded counts and flags, and its output is `{ reported }` alone. The caller check is best-effort. See the [step README](../step_types/report_worker_outcome/README.md).

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

