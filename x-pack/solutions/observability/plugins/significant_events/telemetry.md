# Significant Events workflow telemetry

## Workflow execution identity

`workflow_execution_id` is the canonical run field on Significant Events EBT events. It is the
Workflow Engine execution ID of the workflow whose stage emitted the event. The value comes from
Workflow Engine request headers or Agent Builder execution context; route and tool input cannot set
it.

Events carry the field when a managed workflow produced them and omit it for interactive or direct
invocations. Standalone operations continue to emit telemetry. `execution_id` on
`onboarding-scheduled` and `discovery-triggered` is a deprecated alias. `run_id` remains the
feature-identification operation ID and equals `workflow_execution_id` when a workflow invokes the
operation.

On `agent-tool-event-investigation-attach`, `workflow_execution_id` identifies the workflow that
invoked the tool and `investigation_workflow_execution_id` identifies the attached investigation.

## Joining a pipeline

`features-identified` and `queries-generated` also carry `parent_workflow_execution_id`: the
onboarding execution that started their child workflow, taken from the engine-provided
`parent.executionId` template context. An onboarding run and its children join on
`onboarding-scheduled.workflow_execution_id = parent_workflow_execution_id` with Nightshift events
alone. The field is absent when a child workflow runs on its own.

For the orchestrator tree, join a Significant Events row's `workflow_execution_id` to the Workflow
Engine terminal event's `workflowExecutionId`. For child workflows, the terminal event's
`executionChain` contains every ancestor execution ID, root first and direct parent last. This
reconstructs an orchestrator run and its detection/discovery children without a
stream-and-time-window join.

Onboarding and the orchestrator are independent root runs, not one execution tree. Link the exact
artifacts between them by `source_id`/`source_ids`: onboarding produces source-scoped KIs and
detection/discovery consume those source-scoped KIs. Link discovery to a triggered investigation by
the event's stable `event_id`. An automatic trigger from discovery also puts the discovery
execution ID in the investigation context as `source_workflow_execution_id`. A manual trigger
sends none. Attaching an investigation stamps the new alert version with the attaching workflow's
execution ID; the investigation's own ID lives only in `investigations[]`.

`detection-scan` belongs to the detection workflow. Detection and discovery can share an
orchestrator ancestor through `executionChain`, but their immediate execution IDs remain distinct.
Each alert version stores the execution ID of the workflow that wrote that version. A standalone
status update clears the prior producer ID; a workflow-driven status update replaces it with the
current workflow execution ID.

In the warehouse, validate a run after exposing both fields in the Nightshift silver model:

```sql
WITH workflow_runs AS (
  SELECT workflowExecutionId, workflowId, executionChain
  FROM workflow_terminal_events
),
nightshift_events AS (
  SELECT event_type, workflow_execution_id
  FROM nightshift_ebt_events
  WHERE workflow_execution_id IS NOT NULL
)
SELECT n.event_type, n.workflow_execution_id, w.workflowId, w.executionChain
FROM nightshift_events AS n
JOIN workflow_runs AS w
  ON w.workflowExecutionId = n.workflow_execution_id
WHERE w.workflowExecutionId = :run_id
   OR EXISTS (
     SELECT 1
     FROM UNNEST(w.executionChain) AS ancestor
     WHERE ancestor.executionId = :run_id
   );
```

Use the warehouse's concrete terminal-event and Nightshift silver table names. Preserve the legacy
`execution_id` and `run_id` columns while consumers migrate.

An alert-triggered investigation joins to its originating pipeline through
`source_workflow_execution_id` and to its alert through `event_id` on the investigation lifecycle
trigger payloads. Their `workflow_execution_id` is the investigation workflow's own execution ID;
`execution_id` remains its deprecated alias. The correlation fields are copied from the
investigation's persisted context rather than supplied by lifecycle route input.
