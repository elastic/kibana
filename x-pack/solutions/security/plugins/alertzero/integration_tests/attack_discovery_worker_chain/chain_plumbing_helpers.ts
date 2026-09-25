/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus, TerminalExecutionStatuses } from '@kbn/workflows';
import { getManagedWorkflowDefinition } from '@kbn/workflows/managed';

/**
 * The managed workflow ids the Attack Discovery worker chain references, so the
 * fake workflow-repository lookup can resolve each `workflow.execute` target to
 * the definition that actually ships.
 */
export const CHAIN_WORKFLOW_IDS = {
  review: 'system-security-attack-discovery-review',
  fpTpAnalysis: 'system-security-attack-discovery-fp-tp-analysis',
  journalNote: 'system-alertzero-journal-note',
  gate: 'system-create-proposal',
  handoffAction: 'system-alertzero-action-handoff-to-forensics',
} as const;

export const CHAIN_WORKFLOW_ID_LIST: string[] = Object.values(CHAIN_WORKFLOW_IDS);

/**
 * The real YAML of a shipped managed workflow, looked up by id.
 *
 * The suite drives the definitions that install rather than a copy: a change to
 * the shipped YAML has to move this suite's assertions, or the plumbing it claims
 * to prove is not the plumbing that runs.
 */
export const managedWorkflowYaml = (workflowId: string): string => {
  const definition = getManagedWorkflowDefinition(workflowId);
  if (!definition || typeof definition.yaml !== 'string') {
    throw new Error(`Managed definition ${workflowId} has no yaml`);
  }
  return definition.yaml;
};

/**
 * The Elasticsearch `_source` a managed workflow document carries, as
 * `WorkflowRepository.getWorkflow` reads it back.
 *
 * Built from the shipped definition so the fake repository lookup and a real one
 * cannot disagree about which YAML a workflow id names.
 */
export const managedWorkflowDocumentSource = (workflowId: string) => ({
  name: workflowId,
  description: '',
  enabled: true,
  valid: true,
  managed: true,
  managedBy: 'alertzero',
  billable: false,
  yaml: managedWorkflowYaml(workflowId),
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
  createdBy: 'system',
  lastUpdatedBy: 'system',
});

/**
 * Extracts the requested workflow id from the query `WorkflowRepository`
 * builds — a single `ids` clause under `bool.must`.
 */
export const requestedWorkflowId = (query: unknown): string | undefined => {
  const must = (query as { bool?: { must?: Array<Record<string, any>> } })?.bool?.must ?? [];
  for (const clause of must) {
    const values = clause?.ids?.values;
    if (Array.isArray(values) && typeof values[0] === 'string') {
      return values[0];
    }
  }
  return undefined;
};

export const TERMINAL_STATUSES = new Set<string>(TerminalExecutionStatuses);

/**
 * Drives every execution in the shared repository to a terminal status.
 *
 * A `workflow.execute` chain has no single entry point: the parent parks in
 * WAITING_FOR_CHILD while its child runs, and each child parks in turn. The
 * production engine wakes a parked parent from the child's own completion
 * handler; in this harness nothing schedules that wake, so the driver does it —
 * running every PENDING execution, then resuming every execution parked on a
 * child that has since finished, until the set stops moving.
 *
 * `childToParent` is the harness's OWN record of the chain's shape, keyed by
 * child execution id. It cannot be derived from `execution.context` alone: the
 * engine's terminal-state persistence (`buildWorkflowContext`) overwrites a
 * child's `context` with its own render shape, which nests the parent link
 * under `context.parent.executionId` only on the FIRST such write — a second
 * terminal write (e.g. a poll-driven resume) reads that already-nested shape
 * back as `workflowExecution.context`, finds no top-level `parentWorkflowId`,
 * and drops the link entirely. Tracking it out of band survives that either way.
 *
 * `answerGate` is consulted for each execution parked in WAITING_FOR_INPUT; it
 * returns the `resumeInput` to inject, or `undefined` to leave that gate parked
 * (the escalation suite answers the gate by hand rather than here).
 */
export const driveChain = async ({
  repository,
  run,
  resume,
  childToParent,
  answerGate,
  maxTicks = 40,
}: {
  repository: { workflowExecutions: Map<string, any> };
  run: (executionId: string) => Promise<unknown>;
  resume: (executionId: string) => Promise<unknown>;
  childToParent: Map<string, string>;
  answerGate?: (execution: any) => Record<string, unknown> | undefined;
  maxTicks?: number;
}): Promise<void> => {
  // `childToParent` insertion order is creation order (a JS Map), so the LAST
  // entry recorded for a given parent is the child it is CURRENTLY parked on.
  // A parent can run several `workflow.execute` children over its lifetime
  // (this review runs journal notes, the fp/tp analysis, and the escalation
  // gate in sequence); checking "any terminal child" instead of the current
  // one fires on a long-finished sibling and resumes the parent while it is
  // still genuinely waiting on a later, non-terminal child — which re-enters
  // WAITING_FOR_CHILD with no state change and spins forever.
  const currentChildOf = (parentId: string): string | undefined => {
    let current: string | undefined;
    for (const [child, parent] of childToParent) {
      if (parent === parentId) {
        current = child;
      }
    }
    return current;
  };

  for (let tick = 0; tick < maxTicks; tick++) {
    const executions = [...repository.workflowExecutions.values()];

    const pending = executions.filter((e) => e.status === ExecutionStatus.PENDING);
    if (pending.length > 0) {
      for (const execution of pending) {
        await run(execution.id);
      }
      continue;
    }

    // A parent parked on a child that has finished now reads that child back and
    // continues. Run after the pending pass so a child is always terminal first.
    const parkedOnChild = executions.filter((e) => {
      if (e.status !== ExecutionStatus.WAITING_FOR_CHILD) {
        return false;
      }
      const currentChildId = currentChildOf(e.id);
      const currentChild = currentChildId
        ? repository.workflowExecutions.get(currentChildId)
        : undefined;
      return !!currentChild && TERMINAL_STATUSES.has(currentChild.status);
    });
    if (parkedOnChild.length > 0) {
      for (const execution of parkedOnChild) {
        await resume(execution.id);
      }
      continue;
    }

    const parkedOnGate = executions.filter((e) => e.status === ExecutionStatus.WAITING_FOR_INPUT);
    if (parkedOnGate.length > 0 && answerGate) {
      let answered = false;
      for (const execution of parkedOnGate) {
        const resumeInput = answerGate(execution);
        if (resumeInput === undefined) {
          continue;
        }
        execution.context = { ...execution.context, resumeInput };
        repository.workflowExecutions.set(execution.id, execution);
        await resume(execution.id);
        answered = true;
      }
      if (answered) {
        continue;
      }
    }

    return;
  }

  throw new Error('driveChain: chain did not settle within maxTicks');
};
