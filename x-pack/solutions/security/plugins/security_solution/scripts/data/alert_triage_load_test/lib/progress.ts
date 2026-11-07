/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import { formatError } from '../../lib/type_guards';
import type { WorkflowExecutionSummary } from './kibana_api';
import { listExecutionsStartedAfter } from './kibana_api';
import type { DispatchRecord } from './types';
import { fetchVerdicts } from './verdicts';

export const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'completed',
  'failed',
  'cancelled',
  'skipped',
  'timed_out',
]);

/** Steps whose durations the report breaks out. `classify_alerts` is the LLM-bound one. */
export const REPORTED_STEP_IDS = [
  'create_investigation',
  'attach_alerts',
  'classify_alerts',
  'attach_impact',
  'set_az_true_positive_tags',
  'set_az_false_positive_tags',
  'set_az_inconclusive_tags',
  'add_verdict_notes',
  'gate_fp_close',
] as const;

export type DispatchPhase = 'dispatch_failed' | 'running' | 'triaged';

/** What the report needs of a child execution; a listing by parent cannot return more. */
export type ChildExecution = Pick<WorkflowExecutionSummary, 'id' | 'status' | 'usage'>;

export interface ProgressSnapshot {
  takenAt: string;
  /** The batch workflow's runs since the start of the test, started by the Worker's sweeps. */
  workerExecutions: WorkflowExecutionSummary[];
  /**
   * When each batch was first seen with a verdict tag on every alert, by batch id. A sweep can pick up alerts of several dispatched batches into one run, so a
   * dispatched batch is triaged when its alerts are, not when a run it owns ends.
   */
  triagedBatches: Record<string, string>;
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
  /** When every alert of the batch was first seen carrying a verdict. */
  triagedAt?: string;
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
 * Places every dispatched batch in a phase. `triaged` means every alert of the batch carries a
 * verdict; the batch's own run may still be waiting on a human, which is the resting state at
 * Manual autonomy.
 */
export const classifyDispatches = ({
  dispatches,
  snapshot,
}: {
  dispatches: DispatchRecord[];
  snapshot: ProgressSnapshot;
}): DispatchProgress[] =>
  dispatches.map((dispatch): DispatchProgress => {
    if (dispatch.error) return { dispatch, phase: 'dispatch_failed' };
    const triagedAt = snapshot.triagedBatches[dispatch.batchId];
    return { dispatch, phase: triagedAt ? 'triaged' : 'running', triagedAt };
  });

export const isSettled = (phase: DispatchPhase): boolean =>
  phase === 'dispatch_failed' || phase === 'triaged';

interface ChildListings {
  executions: Record<string, ChildExecution[]>;
  errors: Record<string, string>;
}

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

export interface ScheduledProgressOptions {
  esClient: Client;
  alertsIndex: string;
  /** The workflow the Worker's sweeps start per rule. */
  batchWorkflowId: string;
  /** Batches already seen as triaged, with the time they were first seen. */
  triagedBatches: Record<string, string>;
  /** Look for batches that became triaged since; false when rebuilding a report after the run. */
  lookForNewlyTriaged: boolean;
}

/**
 * The dispatched batches whose alerts all carry a verdict tag, with the time of this look. Batches
 * already known keep their time. A batch whose alerts the Worker tagged as failed is never triaged.
 */
const findTriagedBatches = async ({
  esClient,
  alertsIndex,
  dispatches,
  known,
  lookedAt,
}: {
  esClient: Client;
  alertsIndex: string;
  dispatches: DispatchRecord[];
  known: Record<string, string>;
  lookedAt: string;
}): Promise<Record<string, string>> => {
  const open = dispatches.filter(({ error, batchId }) => !error && !known[batchId]);
  if (open.length === 0) return known;

  const verdicts = await fetchVerdicts({
    esClient,
    alertsIndex,
    alertIds: open.flatMap(({ alerts }) => alerts.map(({ id }) => id)),
  });
  const newlyTriaged = open
    .filter(
      ({ alerts }) => alerts.length > 0 && alerts.every(({ id }) => verdicts[id] !== undefined)
    )
    .map(({ batchId }) => [batchId, lookedAt] as const);
  return { ...known, ...Object.fromEntries(newlyTriaged) };
};

export const fetchProgress = async ({
  kbnClient,
  childWorkflowIds,
  dispatches,
  runStartedAt,
  scheduled,
}: {
  kbnClient: KbnClient;
  childWorkflowIds: string[];
  dispatches: DispatchRecord[];
  runStartedAt: string;
  scheduled: ScheduledProgressOptions;
}): Promise<ProgressSnapshot> => {
  const takenAt = new Date().toISOString();

  const [workerExecutions, children, triagedBatches] = await Promise.all([
    listExecutionsStartedAfter({
      kbnClient,
      workflowId: scheduled.batchWorkflowId,
      startedAfter: runStartedAt,
    }),
    listChildExecutionsInWindow({ kbnClient, childWorkflowIds, startedAfter: runStartedAt }),
    scheduled.lookForNewlyTriaged
      ? findTriagedBatches({
          esClient: scheduled.esClient,
          alertsIndex: scheduled.alertsIndex,
          dispatches,
          known: scheduled.triagedBatches,
          lookedAt: takenAt,
        })
      : Promise.resolve(scheduled.triagedBatches),
  ]);

  return {
    takenAt,
    workerExecutions,
    triagedBatches,
    childExecutions: children.executions,
    childExecutionErrors: children.errors,
  };
};
