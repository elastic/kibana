/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PhaseCatalogEntry,
  PhaseLiveness,
  PndPhaseStepProjection,
  PndPhaseStepStatus,
} from '@kbn/pnd-common';
import type { LifecycleRow } from '../../../lifecycle_view';

import { LIFECYCLE_PASSED_STATUSES, summarizeLifecycle } from '.';

const entry = (id: string, liveness: PhaseLiveness): PhaseCatalogEntry => ({
  description: `${id} description`,
  id,
  label: `${id} label`,
  liveness,
  phase: 'signal_triage',
});

const row = ({
  id,
  liveness = 'live',
  workflowRunId,
  status,
}: {
  id: string;
  liveness?: PhaseLiveness;
  status: PndPhaseStepStatus;
  workflowRunId?: string;
}): LifecycleRow => {
  const projection: PndPhaseStepProjection | undefined =
    workflowRunId != null ? { phaseStepId: id, status, workflowRunId } : undefined;

  return { entry: entry(id, liveness), projection, status, subordinates: [] };
};

describe('LIFECYCLE_PASSED_STATUSES', () => {
  it('counts a completed live step as passed, and nothing else', () => {
    expect(LIFECYCLE_PASSED_STATUSES).toEqual(['completed']);
  });
});

describe('summarizeLifecycle', () => {
  it('counts every live row', () => {
    const rows = [
      row({ id: 'a', status: 'completed' }),
      row({ id: 'b', liveness: 'upstream', status: 'upstream' }),
      row({ id: 'c', status: 'not_started' }),
    ];

    expect(summarizeLifecycle(rows).totalLiveSteps).toBe(2);
  });

  it('counts the live rows that completed', () => {
    const rows = [row({ id: 'a', status: 'completed' }), row({ id: 'b', status: 'not_started' })];

    expect(summarizeLifecycle(rows).passedLiveSteps).toBe(1);
  });

  it('never counts an upstream row as passed, whatever its liveness claims', () => {
    const rows = [row({ id: 'a', liveness: 'live', status: 'upstream' })];

    expect(summarizeLifecycle(rows).passedLiveSteps).toBe(0);
  });

  it('reports the gate the loop is parked on as the current step', () => {
    const rows = [
      row({ id: 'a', status: 'completed' }),
      row({ id: 'b', status: 'waiting_for_input' }),
      row({ id: 'c', status: 'not_started' }),
    ];

    expect(summarizeLifecycle(rows).currentStep?.entry.id).toBe('b');
  });

  it('prefers a parked gate over a running step, because the parked gate is what needs a human', () => {
    const rows = [
      row({ id: 'a', status: 'running' }),
      row({ id: 'b', status: 'waiting_for_input' }),
    ];

    expect(summarizeLifecycle(rows).currentStep?.entry.id).toBe('b');
  });

  it('falls back to the running step when nothing is parked', () => {
    const rows = [row({ id: 'a', status: 'completed' }), row({ id: 'b', status: 'running' })];

    expect(summarizeLifecycle(rows).currentStep?.entry.id).toBe('b');
  });

  it('reports no current step when the loop is neither parked nor running', () => {
    expect(summarizeLifecycle([row({ id: 'a', status: 'completed' })]).currentStep).toBeUndefined();
  });

  it('counts the statuses the rows carry', () => {
    const rows = [
      row({ id: 'a', status: 'completed' }),
      row({ id: 'b', status: 'completed' }),
      row({ id: 'c', status: 'upstream' }),
    ];

    expect(summarizeLifecycle(rows).statusCounts).toEqual([
      { count: 2, status: 'completed' },
      { count: 1, status: 'upstream' },
    ]);
  });

  it('orders equally-common statuses by name, so the summary never reshuffles between renders', () => {
    const rows = [row({ id: 'a', status: 'upstream' }), row({ id: 'b', status: 'completed' })];

    expect(summarizeLifecycle(rows).statusCounts.map(({ status }) => status)).toEqual([
      'completed',
      'upstream',
    ]);
  });

  it('reports the runs the projection named, deduplicated', () => {
    const rows = [
      row({ id: 'a', status: 'completed', workflowRunId: 'run-1' }),
      row({ id: 'b', status: 'completed', workflowRunId: 'run-1' }),
      row({ id: 'c', status: 'completed', workflowRunId: 'run-2' }),
    ];

    expect(summarizeLifecycle(rows).workflowRunIds).toEqual(['run-1', 'run-2']);
  });

  it('reports no runs when nothing correlated', () => {
    expect(summarizeLifecycle([row({ id: 'a', status: 'not_started' })]).workflowRunIds).toEqual(
      []
    );
  });

  it('summarizes an empty lifecycle without throwing', () => {
    expect(summarizeLifecycle([])).toEqual({
      currentStep: undefined,
      passedLiveSteps: 0,
      statusCounts: [],
      totalLiveSteps: 0,
      workflowRunIds: [],
    });
  });
});
