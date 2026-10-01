/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import { formatError } from '../../lib/type_guards';
import type { WorkflowExecutionSummary, WorkflowStepExecutionSummary } from './kibana_api';
import { listExecutionsByIds, listExecutionsStartedAfter, listStepExecutions } from './kibana_api';
import type { DispatchRecord } from './types';

export const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'completed',
  'failed',
  'cancelled',
  'skipped',
  'timed_out',
]);

/**
 * The single step that runs once, after the Worker has tagged and noted every alert, and before it
 * can park on a human decision. Once it is done the batch is triaged; whatever follows is the
 * proposal gate. It must not be a per-alert step such as `add_verdict_notes`: a foreach records one
 * step execution per alert, so the first one finishing would mark the batch triaged while the rest
 * of the notes are still being written.
 */
export const WORK_DONE_STEP_ID = 'post_comment_alert_updates';

/**
 * Statuses of the work-done step that prove the alerts were triaged. The step only posts a chat
 * message and is declared `on-failure: continue`, so a `failed` one still means the tagging and
 * notes before it finished and the run goes on to the proposal gate. `cancelled`, `skipped` and
 * `timed_out` say nothing about that work, so they must not count.
 */
const WORK_DONE_STATUSES: ReadonlySet<string> = new Set(['completed', 'failed']);

/** Steps whose durations the report breaks out. `classify_alerts` is the LLM-bound one. */
export const REPORTED_STEP_IDS = [
  'create_investigation',
  'attach_alerts',
  'classify_alerts',
  'attach_impact',
  'set_az_tags',
  'add_verdict_notes',
  'gate_fp_close',
] as const;

export type DispatchPhase = 'dispatch_failed' | 'not_visible' | 'running' | 'parked' | 'finished';

export interface ProgressSnapshot {
  takenAt: string;
  workerExecutions: WorkflowExecutionSummary[];
  workDoneSteps: WorkflowStepExecutionSummary[];
  childExecutions: Record<string, WorkflowExecutionSummary[]>;
  /**
   * Child workflows whose executions could not be listed, by workflow id. Their entry in
   * `childExecutions` is empty, which must not be read as "nothing ran".
   */
  childExecutionErrors: Record<string, string>;
}

export interface DispatchProgress {
  dispatch: DispatchRecord;
  phase: DispatchPhase;
  execution?: WorkflowExecutionSummary;
  workDoneStep?: WorkflowStepExecutionSummary;
}

export const countBy = <T>(items: T[], key: (item: T) => string): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const name = key(item);
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
};

/**
 * Places every dispatched batch in a phase. `parked` means the batch is fully triaged and its Worker
 * run is waiting on a human, which is the expected resting state at Manual autonomy.
 */
export const classifyDispatches = ({
  dispatches,
  snapshot,
}: {
  dispatches: DispatchRecord[];
  snapshot: ProgressSnapshot;
}): DispatchProgress[] => {
  const executionsById = new Map(
    snapshot.workerExecutions.map((execution) => [execution.id, execution])
  );
  const workDoneByRun = new Map(
    snapshot.workDoneSteps
      .filter(({ status }) => WORK_DONE_STATUSES.has(status))
      .map((step) => [step.workflowRunId, step])
  );

  return dispatches.map((dispatch): DispatchProgress => {
    if (!dispatch.executionId) return { dispatch, phase: 'dispatch_failed' };

    const execution = executionsById.get(dispatch.executionId);
    if (!execution) return { dispatch, phase: 'not_visible' };

    const workDoneStep = workDoneByRun.get(dispatch.executionId);
    if (TERMINAL_STATUSES.has(execution.status)) {
      return { dispatch, phase: 'finished', execution, workDoneStep };
    }
    return { dispatch, phase: workDoneStep ? 'parked' : 'running', execution, workDoneStep };
  });
};

export const isSettled = (phase: DispatchPhase): boolean =>
  phase === 'dispatch_failed' || phase === 'parked' || phase === 'finished';

interface ChildListing {
  executions: WorkflowExecutionSummary[];
  error?: string;
}

export const fetchProgress = async ({
  kbnClient,
  workerWorkflowId,
  childWorkflowIds,
  dispatches,
  runStartedAt,
}: {
  kbnClient: KbnClient;
  workerWorkflowId: string;
  childWorkflowIds: string[];
  dispatches: DispatchRecord[];
  runStartedAt: string;
}): Promise<ProgressSnapshot> => {
  const wantedIds = new Set(
    dispatches.flatMap(({ executionId }) => (executionId ? [executionId] : []))
  );

  const [workerExecutions, workDoneSteps, ...children] = await Promise.all([
    wantedIds.size > 0
      ? listExecutionsByIds({ kbnClient, workflowId: workerWorkflowId, wantedIds })
      : Promise.resolve([]),
    listStepExecutions({
      kbnClient,
      workflowId: workerWorkflowId,
      stepId: WORK_DONE_STEP_ID,
      startedAfter: runStartedAt,
    }),
    ...childWorkflowIds.map((workflowId) =>
      listExecutionsStartedAfter({ kbnClient, workflowId, startedAfter: runStartedAt }).then(
        (executions): ChildListing => ({ executions }),
        (error): ChildListing => ({ executions: [], error: formatError(error) })
      )
    ),
  ]);

  return {
    takenAt: new Date().toISOString(),
    workerExecutions,
    workDoneSteps,
    childExecutions: Object.fromEntries(
      childWorkflowIds.map((workflowId, index) => [workflowId, children[index].executions])
    ),
    childExecutionErrors: Object.fromEntries(
      childWorkflowIds.flatMap((workflowId, index) => {
        const { error } = children[index];
        return error ? [[workflowId, error]] : [];
      })
    ),
  };
};
