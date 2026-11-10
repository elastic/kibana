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
invocations. Standalone operations continue to emit telemetry. `execution_id` on
`onboarding-scheduled` and `discovery-triggered` is a deprecated alias. `run_id` remains the
feature-identification operation ID and equals `workflow_execution_id` when a workflow invokes the
operation.

On `agent-tool-event-investigation-attach`, `workflow_execution_id` identifies the workflow that
invoked the tool and `investigation_id` identifies the attached investigation (its Agent Builder
conversation). Before this release, `workflow_execution_id` on that event held the attached
investigation ID. The meaning changed rather than gaining an alias, so split historical rows on the
release that shipped `investigation_id`.

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
4. Join an investigation to the discovery run that triggered it through
   `source_workflow_execution_id`, and to the significant event through `event_id`.
5. Use `investigation_id` to join attachment events to
   `nightshift-investigation-started.investigation_id`. This identifies the investigation, not one
   of its Workflow Engine runs.

An alert automation resolves the alert it was triggered for, and when the alert is a significant
event the Nightshift trigger step reads `workflow_execution_id` from the alert event `data` and
forwards it as `source_workflow_execution_id`. The `alerting.alertStatusChanged` trigger payload
carries no producer field: provenance stays in the data Significant Events stores, and alerts from
rules or other writers send none.

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
| `nightshift-investigation-started` | Discovery run that triggered it | `source_workflow_execution_id` = discovery `workflow_execution_id` |
| `nightshift-investigation-started` | Significant event | `event_id` |
| `agent-tool-event-investigation-attach` | Investigation | `investigation_id` = `nightshift-investigation-started.investigation_id` |
| Detection or discovery | Onboarding | `source_id` / `source_ids` only; KIs are shared across onboarding runs |

`parent_workflow_execution_id` joins to `onboarding-scheduled.workflow_execution_id` only for
onboarding started through the API. Continuous onboarding starts onboarding with
`workflow.executeAsync` and emits no `onboarding-scheduled` event, so join those children to the
onboarding run's terminal event instead.

`detection-scan` belongs to the detection workflow, not to discovery. In the scheduled path the two
share no ancestor, and `detection_workflow_execution_ids` is the only link between them.

A manual investigation trigger sends no `source_workflow_execution_id`. The investigation lifecycle
workflow triggers (`nightshift-investigations.started`, `.completed`, `.failed`) carry the same
`event_id` and `source_workflow_execution_id` for workflow subscribers, but trigger payloads are not
exported as EBT; use `nightshift-investigation-started` in the warehouse.

## Alert versions

Each `.rule-events` version stores, in `workflow_execution_id`, the execution of the workflow that
wrote it. A standalone write (UI, interactive agent) clears the prior producer ID; a
workflow-driven write, including stale-event cleanup, replaces it. Attaching an investigation
stamps the attaching workflow's execution; the investigation's own ID lives only in
`investigations[]`.

## Tracing an investigation back to its detections

```sql
WITH investigation AS (
  SELECT investigation_id, event_id, source_workflow_execution_id
  FROM nightshift_ebt_events
  WHERE event_type = 'nightshift-investigation-started'
    AND investigation_id = :investigation_id
),
discovery_writes AS (
  SELECT w.workflow_execution_id, w.event_id, w.detection_workflow_execution_ids
  FROM nightshift_ebt_events AS w
  JOIN investigation AS i
    ON w.workflow_execution_id = i.source_workflow_execution_id
   AND w.event_id = i.event_id
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

Use the warehouse's concrete terminal-event and Nightshift silver table names. Preserve the legacy
`execution_id` and `run_id` columns while consumers migrate.
