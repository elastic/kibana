/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import { formatError, getStatusCode } from '../../lib/type_guards';
import type { WorkflowExecutionSummary, WorkflowStepExecutionSummary } from './kibana_api';
import {
  listChildExecutions,
  listExecutionsByIds,
  listExecutionsStartedAfter,
  listStepExecutions,
} from './kibana_api';
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

/** What the report needs of a child execution; a listing by parent cannot return more. */
export type ChildExecution = Pick<WorkflowExecutionSummary, 'id' | 'status' | 'usage'>;

export interface ProgressSnapshot {
  takenAt: string;
  workerExecutions: WorkflowExecutionSummary[];
  workDoneSteps: WorkflowStepExecutionSummary[];
  childExecutions: Record<string, ChildExecution[]>;
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

interface ChildListings {
  executions: Record<string, ChildExecution[]>;
  errors: Record<string, string>;
}

/** Runs `task` over `items`, at most `limit` at a time, keeping the order of `items`. */
const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

const CHILD_LOOKUP_CONCURRENCY = 10;

/**
 * Every execution of the child workflows started since `startedAfter`, whoever started it. Cheap, so
 * the collector uses it on every poll, but it also counts executions of other Workers and runs.
 */
const listChildExecutionsInWindow = async ({
  kbnClient,
  childWorkflowIds,
  startedAfter,
}: {
  kbnClient: KbnClient;
  childWorkflowIds: string[];
  startedAfter: string;
}): Promise<ChildListings> => {
  const listings = await Promise.all(
    childWorkflowIds.map((workflowId) =>
      listExecutionsStartedAfter({ kbnClient, workflowId, startedAfter }).then(
        (executions) => ({ workflowId, executions, error: undefined }),
        (error) => ({ workflowId, executions: [], error: formatError(error) })
      )
    )
  );
  return {
    executions: Object.fromEntries(
      listings.map(({ workflowId, executions }) => [workflowId, executions])
    ),
    errors: Object.fromEntries(
      listings.flatMap(({ workflowId, error }) => (error ? [[workflowId, error]] : []))
    ),
  };
};

/**
 * The child executions the dispatched Worker runs started themselves. One request per Worker run,
 * so this is meant for the final report, not for every poll. A run the API does not know (404) has
 * no children; any other failure is reported for every child workflow, because a failed lookup
 * cannot say which workflow's executions are missing.
 */
const listChildExecutionsOfRuns = async ({
  kbnClient,
  childWorkflowIds,
  executionIds,
}: {
  kbnClient: KbnClient;
  childWorkflowIds: string[];
  executionIds: string[];
}): Promise<ChildListings> => {
  const lookups = await mapWithConcurrency(executionIds, CHILD_LOOKUP_CONCURRENCY, (executionId) =>
    listChildExecutions({ kbnClient, executionId }).then(
      (children) => ({ children, error: undefined }),
      (error) =>
        getStatusCode(error) === 404
          ? { children: [], error: undefined }
          : { children: [], error: formatError(error) }
    )
  );

  const failures = lookups.flatMap(({ error }) => (error ? [error] : []));
  const message =
    failures.length > 0
      ? `${failures.length} of ${executionIds.length} child lookups failed: ${failures[0]}`
      : undefined;
  const children = lookups.flatMap((lookup) => lookup.children);

  // The children listing carries no `usage`, so read the summaries of the discovered ids.
  const summaries = await Promise.all(
    childWorkflowIds.map(async (workflowId) => {
      const listed = children
        .filter((child) => child.workflowId === workflowId)
        .map(({ executionId, status }): ChildExecution => ({ id: executionId, status }));
      if (listed.length === 0) return { workflowId, executions: listed, error: undefined };
      try {
        const found = await listExecutionsByIds({
          kbnClient,
          workflowId,
          wantedIds: new Set(listed.map(({ id }) => id)),
        });
        const foundById = new Map(found.map((execution) => [execution.id, execution]));
        const executions = listed.map(({ id, status }): ChildExecution => {
          const execution = foundById.get(id);
          return execution
            ? { id, status: execution.status, usage: execution.usage }
            : { id, status };
        });
        return { workflowId, executions, error: undefined };
      } catch (error) {
        return { workflowId, executions: listed, error: formatError(error) };
      }
    })
  );

  return {
    executions: Object.fromEntries(
      summaries.map(({ workflowId, executions }) => [workflowId, executions])
    ),
    errors: Object.fromEntries(
      summaries.flatMap(({ workflowId, error }) => {
        const reason = message ?? error;
        return reason ? [[workflowId, reason]] : [];
      })
    ),
  };
};

export const fetchProgress = async ({
  kbnClient,
  workerWorkflowId,
  childWorkflowIds,
  dispatches,
  runStartedAt,
  scopeChildrenToRun = false,
}: {
  kbnClient: KbnClient;
  workerWorkflowId: string;
  childWorkflowIds: string[];
  dispatches: DispatchRecord[];
  runStartedAt: string;
  /**
   * Count only the child executions the dispatched Worker runs started, instead of every one since
   * `runStartedAt`. Costs a request per Worker run, so leave it off for polling.
   */
  scopeChildrenToRun?: boolean;
}): Promise<ProgressSnapshot> => {
  const wantedIds = new Set(
    dispatches.flatMap(({ executionId }) => (executionId ? [executionId] : []))
  );

  const [workerExecutions, workDoneSteps, children] = await Promise.all([
    wantedIds.size > 0
      ? listExecutionsByIds({ kbnClient, workflowId: workerWorkflowId, wantedIds })
      : Promise.resolve([]),
    listStepExecutions({
      kbnClient,
      workflowId: workerWorkflowId,
      stepId: WORK_DONE_STEP_ID,
      startedAfter: runStartedAt,
    }),
    scopeChildrenToRun
      ? listChildExecutionsOfRuns({ kbnClient, childWorkflowIds, executionIds: [...wantedIds] })
      : listChildExecutionsInWindow({ kbnClient, childWorkflowIds, startedAfter: runStartedAt }),
  ]);

  return {
    takenAt: new Date().toISOString(),
    workerExecutions,
    workDoneSteps,
    childExecutions: children.executions,
    childExecutionErrors: children.errors,
  };
};
