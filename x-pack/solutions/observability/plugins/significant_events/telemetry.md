# Significant Events workflow telemetry

## Workflow execution identity

`workflow_execution_id` is the canonical run field on Significant Events EBT events. It is the
Workflow Engine execution ID of the workflow whose stage emitted the event. The value is read from
the request's event-chain context (`getEventChainContext` in `@kbn/workflows-extensions`): the engine
stamps it on the in-process request that an `ai.agent` step hands to tool handlers, and a
`kibana.request` step carries it in the `x-kibana-event-chain-*` headers; route bodies and tool
parameters cannot set it. The headers are trusted only on internal-origin requests, and
`x-elastic-internal-origin` is not an authenticated boundary: an authorized caller of these routes
who sets the headers by hand can choose the value. Treat the field as provenance for analytics, not
as an audit trail.

Events carry the field when a managed workflow produced them and omit it for interactive or direct
invocations. One workflow path also omits it: an agent bound to a service account other than the
workflow's runs on Task Manager under a new request, which carries no execution context, so the
tools it calls report no `workflow_execution_id`. Standalone operations continue to emit telemetry.
`execution_id` on `onboarding-scheduled` and `discovery-triggered` is a deprecated alias. `run_id`
remains the feature-identification operation ID and equals `workflow_execution_id` when a workflow
invokes the operation.

## How the pipeline connects

The pipeline is not one execution tree. Its stages run as independent root workflows and hand work
to each other through stored data, so a run does not flow end to end:

- KI onboarding (started by the onboarding API or by continuous onboarding) writes KIs and rules
  that every later detection run uses.
- Scheduled detection is its own root. It stores detections stamped with its execution ID.
- Scheduled review runs discovery as another root. One discovery run processes the unprocessed
  detections of any number of earlier detection runs.
- Discovery triggers investigations, which run as their own workflow executions.

The manual orchestrator runs detection and discovery as children of one execution, but it is not
the scheduled path. Reconstruct lineage backwards from an artifact, not forwards from a run.

## What threading the pipeline means

Asynchronous execution does not prevent correlation. An ID crosses an asynchronous boundary by
being stored with the work before the producer finishes: in a request header, workflow input, task
payload, or persisted artifact. The consumer reads that value and emits it as a lineage field.

The scheduled pipeline cannot truthfully have one `workflow_execution_id`: each stage is a separate
Workflow Engine execution, and one discovery run can consume detections from several detection
runs. Reusing one execution ID would conflate distinct runs. Thread the pipeline as a graph instead:

1. Join each EBT row to its producing run with `workflow_execution_id`.
2. Join a composed child workflow to its parent through terminal telemetry's `executionChain`;
   KI child events also expose `parent_workflow_execution_id`.
3. Join a discovery write to every detection run it consumed through
   `detection_workflow_execution_ids`.
4. Join an investigation to the run that wrote the alert version it was triggered for through
   `source_workflow_execution_id`, and to the significant event through `event_id`. The discovery
   run that created the event is the earliest `events-write` row with that `event_id`.

An alert automation resolves the alert it was triggered for, and when the alert is a significant
event the Nightshift trigger step reads `workflow_execution_id` from the alert event `data` and
forwards it as `source_workflow_execution_id`. That is the writer of the resolved version: the
discovery run for a new event, a later workflow after it appended a version, and absent after a
standalone write. `event_id` is read from the same alert `data` and does not change. The
`alerting.alertStatusChanged` trigger payload carries no producer field: provenance stays in the
data Significant Events stores, and alerts from rules or other writers send none.

`event_id` is the durable business identity of a significant event; workflow execution IDs describe
the processing runs that created or changed it. Do not substitute one for the other. Onboarding
produces shared KIs and rules that many later runs may consume, so the scheduled architecture has
no unique onboarding-run-to-detection-run edge. `source_id` can identify the shared source, but it
cannot prove which onboarding execution supplied a later detection. A single end-to-end
`pipeline_run_id` would require a different orchestrated design that starts and constrains all
stages to one cycle.

## Joins

Significant Events event types below drop their `significant-events-` prefix.

| From | To | Join |
| --- | --- | --- |
| Any Significant Events row | Workflow Engine terminal event | `workflow_execution_id = workflowExecutionId` |
| Child workflow | Its ancestors | Terminal event `executionChain`, root first and direct parent last |
| `features-identified`, `queries-generated` | Onboarding run | `parent_workflow_execution_id` (absent when the child runs on its own) |
| `events-write` (discovery) | Detection runs it consumed | `detection_workflow_execution_ids` contains the detection run's `workflow_execution_id` |
| `nightshift-investigation-started` | Run that wrote the triggering alert version | `source_workflow_execution_id` = that run's `workflow_execution_id` |
| `nightshift-investigation-started` | Significant event | `event_id` |
| `nightshift-investigation-started` | Discovery run that created the event | `event_id` = earliest `events-write.event_id`, then its `workflow_execution_id` |
| Detection or discovery | Onboarding | `source_id` / `source_ids` only; KIs are shared across onboarding runs |

`parent_workflow_execution_id` joins to `onboarding-scheduled.workflow_execution_id` only for
onboarding started through the API. Continuous onboarding starts onboarding with
`workflow.executeAsync` and emits no `onboarding-scheduled` event, so join those children to the
onboarding run's terminal event instead.

`detection-scan` belongs to the detection workflow, not to discovery. In the scheduled path the two
share no ancestor, and `detection_workflow_execution_ids` is the only link between them.

A manual investigation trigger sends no `source_workflow_execution_id`. The investigation lifecycle
workflow triggers (`nightshift-investigations.started`, `.completed`, `.failed`) carry the
`event_id` and `source_workflow_execution_id` of the start context for workflow subscribers. The
EBT event also derives `event_id` from a significant event subject or the triggering alert, which
the triggers do not. Trigger payloads are not exported as EBT; use
`nightshift-investigation-started` in the warehouse.

## Alert versions

Each `.rule-events` version stores, in `workflow_execution_id`, the execution of the workflow that
wrote it. A standalone write (UI, interactive agent) clears the prior producer ID; a
workflow-driven write, including stale-event cleanup, replaces it.

## Tracing an investigation back to its detections

```sql
WITH investigation AS (
  SELECT investigation_id, event_id
  FROM nightshift_ebt_events
  WHERE event_type = 'nightshift-investigation-started'
    AND investigation_id = :investigation_id
),
discovery_writes AS (
  SELECT w.workflow_execution_id, w.event_id, w.detection_workflow_execution_ids
  FROM nightshift_ebt_events AS w
  JOIN investigation AS i
    ON w.event_id = i.event_id
  WHERE w.event_type = 'significant-events-agent-tool-event-write'
)
SELECT d.workflow_execution_id AS discovery_run,
       detection_run,
       t.workflowId,
       t.executionChain
FROM discovery_writes AS d,
     UNNEST(d.detection_workflow_execution_ids) AS detection_run
JOIN workflow_terminal_events AS t
  ON t.workflowExecutionId = detection_run;
```

The join is on `event_id` alone because `source_workflow_execution_id` names the discovery run only
while the triggering alert version is the one discovery wrote. It returns every discovery write of
the event, the creating one first by timestamp.

Use the warehouse's concrete terminal-event and Nightshift silver table names. Preserve the legacy
`execution_id` and `run_id` columns while consumers migrate.
