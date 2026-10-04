/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { createKbnClient } from '../../lib/clients';
import type { WorkflowExecutionSummary, WorkflowStepExecutionSummary } from './kibana_api';
import {
  listChildExecutions,
  listExecutionsByIds,
  listExecutionsStartedAfter,
  listStepExecutions,
} from './kibana_api';
import type { ProgressSnapshot } from './progress';
import {
  REPORTED_STEP_IDS,
  WORK_DONE_STEP_ID,
  classifyDispatches,
  fetchProgress,
  isSettled,
} from './progress';
import type { DispatchRecord } from './types';

jest.mock('./kibana_api', () => ({
  listChildExecutions: jest.fn(),
  listExecutionsByIds: jest.fn(),
  listExecutionsStartedAfter: jest.fn(),
  listStepExecutions: jest.fn(),
}));

const buildDispatch = (overrides: Partial<DispatchRecord> = {}): DispatchRecord => ({
  batchId: 'batch-0001',
  ruleIndex: 0,
  ruleUuid: 'rule-0',
  plannedOffsetMs: 0,
  dispatchedAt: '2026-09-30T12:00:00.000Z',
  alerts: [{ id: 'alert-1', label: 'true_positive' }],
  indexMs: 20,
  runApiMs: 100,
  executionId: 'execution-1',
  ...overrides,
});

const buildExecution = (
  overrides: Partial<WorkflowExecutionSummary> = {}
): WorkflowExecutionSummary => ({
  id: 'execution-1',
  status: 'running',
  startedAt: '2026-09-30T12:00:05.000Z',
  ...overrides,
});

const buildStep = (
  overrides: Partial<WorkflowStepExecutionSummary> = {}
): WorkflowStepExecutionSummary => ({
  id: 'step-1',
  stepId: WORK_DONE_STEP_ID,
  workflowRunId: 'execution-1',
  status: 'completed',
  startedAt: '2026-09-30T12:05:00.000Z',
  finishedAt: '2026-09-30T12:05:01.000Z',
  ...overrides,
});

const buildSnapshot = (overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot => ({
  takenAt: '2026-09-30T12:10:00.000Z',
  workerExecutions: [buildExecution()],
  workDoneSteps: [],
  childExecutions: {},
  childExecutionErrors: {},
  ...overrides,
});

describe('WORK_DONE_STEP_ID', () => {
  it('is not a per-alert step, whose first completion would mark the batch triaged early', () => {
    expect(WORK_DONE_STEP_ID).not.toBe('add_verdict_notes');
    expect(WORK_DONE_STEP_ID).not.toBe('set_az_tags');
  });

  it('keeps the per-alert note durations in the report breakdown', () => {
    expect(REPORTED_STEP_IDS).toContain('add_verdict_notes');
  });
});

describe('classifyDispatches', () => {
  const classify = (snapshot: ProgressSnapshot, dispatch = buildDispatch()) =>
    classifyDispatches({ dispatches: [dispatch], snapshot })[0];

  it('marks a batch without an execution id as failed to dispatch', () => {
    const { phase } = classify(buildSnapshot(), buildDispatch({ executionId: undefined }));

    expect(phase).toBe('dispatch_failed');
  });

  it('marks a batch whose execution is not listed yet as not visible', () => {
    const { phase } = classify(buildSnapshot({ workerExecutions: [] }));

    expect(phase).toBe('not_visible');
  });

  it('keeps a batch running until the work-done step has finished', () => {
    const { phase } = classify(buildSnapshot());

    expect(phase).toBe('running');
  });

  it('ignores a work-done step that is still in progress', () => {
    const { phase } = classify(
      buildSnapshot({ workDoneSteps: [buildStep({ status: 'running', finishedAt: undefined })] })
    );

    expect(phase).toBe('running');
  });

  it('parks a batch once the work-done step finished while the run waits on a decision', () => {
    const progress = classify(buildSnapshot({ workDoneSteps: [buildStep()] }));

    expect(progress.phase).toBe('parked');
    expect(progress.workDoneStep?.finishedAt).toBe('2026-09-30T12:05:01.000Z');
  });

  it('finishes a batch whose execution reached a terminal status', () => {
    const { phase } = classify(
      buildSnapshot({
        workerExecutions: [buildExecution({ status: 'completed' })],
        workDoneSteps: [buildStep()],
      })
    );

    expect(phase).toBe('finished');
  });

  it('still parks a batch whose work-done step failed, because the run continues past it', () => {
    const { phase } = classify(buildSnapshot({ workDoneSteps: [buildStep({ status: 'failed' })] }));

    expect(phase).toBe('parked');
  });

  it.each(['cancelled', 'skipped', 'timed_out'])(
    'does not treat a %s work-done step as proof the alerts were triaged',
    (status) => {
      const progress = classify(buildSnapshot({ workDoneSteps: [buildStep({ status })] }));

      expect(progress.phase).toBe('running');
      expect(progress.workDoneStep).toBeUndefined();
    }
  );

  it('only counts the work-done step of the batch own run', () => {
    const { phase } = classify(
      buildSnapshot({ workDoneSteps: [buildStep({ workflowRunId: 'execution-2' })] })
    );

    expect(phase).toBe('running');
  });
});

describe('isSettled', () => {
  it.each(['dispatch_failed', 'parked', 'finished'] as const)('settles %s', (phase) => {
    expect(isSettled(phase)).toBe(true);
  });

  it.each(['not_visible', 'running'] as const)('does not settle %s', (phase) => {
    expect(isSettled(phase)).toBe(false);
  });
});

describe('fetchProgress', () => {
  const kbnClient = createKbnClient({
    kibanaUrl: 'http://localhost:5601',
    elasticsearchUrl: 'http://localhost:9200',
    auth: { type: 'basic', username: 'elastic', password: 'changeme' },
    log: new ToolingLog(),
  });
  const listChildExecutionsMock = jest.mocked(listChildExecutions);
  const listExecutionsByIdsMock = jest.mocked(listExecutionsByIds);
  const listExecutionsStartedAfterMock = jest.mocked(listExecutionsStartedAfter);
  const listStepExecutionsMock = jest.mocked(listStepExecutions);

  const fetch = () =>
    fetchProgress({
      kbnClient,
      workerWorkflowId: 'worker',
      childWorkflowIds: ['analysis', 'proposal'],
      dispatches: [buildDispatch()],
      runStartedAt: '2026-09-30T12:00:00.000Z',
    });

  beforeEach(() => {
    listExecutionsByIdsMock.mockReset().mockResolvedValue([buildExecution()]);
    listStepExecutionsMock.mockReset().mockResolvedValue([]);
    listExecutionsStartedAfterMock.mockReset();
    listChildExecutionsMock.mockReset();
  });

  it('lists the executions of every child workflow', async () => {
    listExecutionsStartedAfterMock.mockResolvedValue([buildExecution({ id: 'child-1' })]);

    const snapshot = await fetch();

    expect(Object.keys(snapshot.childExecutions)).toEqual(['analysis', 'proposal']);
    expect(snapshot.childExecutions.analysis).toEqual([buildExecution({ id: 'child-1' })]);
    expect(snapshot.childExecutionErrors).toEqual({});
  });

  it('reports a child workflow that could not be listed instead of treating it as empty', async () => {
    listExecutionsStartedAfterMock
      .mockResolvedValueOnce([buildExecution({ id: 'child-1' })])
      .mockRejectedValueOnce(new Error('403 Forbidden'));

    const snapshot = await fetch();

    expect(snapshot.childExecutions.analysis).toHaveLength(1);
    expect(snapshot.childExecutions.proposal).toEqual([]);
    expect(snapshot.childExecutionErrors).toEqual({ proposal: expect.stringContaining('403') });
  });

  describe('scoped to the run', () => {
    const dispatches = [
      buildDispatch({ batchId: 'batch-0', executionId: 'execution-1' }),
      buildDispatch({ batchId: 'batch-1', executionId: 'execution-2' }),
    ];

    const fetchScoped = () =>
      fetchProgress({
        kbnClient,
        workerWorkflowId: 'worker',
        childWorkflowIds: ['analysis', 'proposal'],
        dispatches,
        runStartedAt: '2026-09-30T12:00:00.000Z',
        scopeChildrenToRun: true,
      });

    it('counts only the children of the dispatched Worker runs, grouped by workflow', async () => {
      listChildExecutionsMock.mockImplementation(async ({ executionId }) =>
        executionId === 'execution-1'
          ? [
              { executionId: 'a-1', workflowId: 'analysis', status: 'completed' },
              { executionId: 'p-1', workflowId: 'proposal', status: 'waiting_for_input' },
            ]
          : [
              { executionId: 'a-2', workflowId: 'analysis', status: 'running' },
              { executionId: 'other-1', workflowId: 'unrelated-workflow', status: 'completed' },
            ]
      );

      listExecutionsByIdsMock.mockImplementation(async ({ workflowId }) =>
        workflowId === 'analysis'
          ? [
              buildExecution({ id: 'a-1', status: 'completed' }),
              buildExecution({ id: 'a-2', status: 'running' }),
            ]
          : [buildExecution({ id: 'p-1', status: 'waiting_for_input' })]
      );

      const snapshot = await fetchScoped();

      expect(listChildExecutionsMock).toHaveBeenCalledTimes(2);
      expect(snapshot.childExecutions).toEqual({
        analysis: [
          { id: 'a-1', status: 'completed' },
          { id: 'a-2', status: 'running' },
        ],
        proposal: [{ id: 'p-1', status: 'waiting_for_input' }],
      });
      expect(snapshot.childExecutionErrors).toEqual({});
    });

    it('keeps the token usage of the scoped children, which the children listing does not carry', async () => {
      listChildExecutionsMock.mockImplementation(async ({ executionId }) =>
        executionId === 'execution-1'
          ? [{ executionId: 'a-1', workflowId: 'analysis', status: 'completed' }]
          : []
      );
      listExecutionsByIdsMock.mockImplementation(async ({ workflowId }) =>
        workflowId === 'analysis'
          ? [buildExecution({ id: 'a-1', status: 'completed', usage: { totalTokens: 1200 } })]
          : [buildExecution()]
      );

      const snapshot = await fetchScoped();

      expect(snapshot.childExecutions.analysis).toEqual([
        { id: 'a-1', status: 'completed', usage: { totalTokens: 1200 } },
      ]);
    });

    it('reports a child workflow whose summaries could not be read instead of dropping its usage silently', async () => {
      listChildExecutionsMock.mockImplementation(async ({ executionId }) =>
        executionId === 'execution-1'
          ? [{ executionId: 'a-1', workflowId: 'analysis', status: 'completed' }]
          : []
      );
      listExecutionsByIdsMock.mockImplementation(async ({ workflowId }) => {
        if (workflowId === 'analysis') throw new Error('503 Unavailable');
        return [buildExecution()];
      });

      const snapshot = await fetchScoped();

      expect(snapshot.childExecutions.analysis).toEqual([{ id: 'a-1', status: 'completed' }]);
      expect(snapshot.childExecutionErrors).toEqual({
        analysis: expect.stringContaining('503'),
      });
    });

    it('does not list every execution since the run started', async () => {
      listChildExecutionsMock.mockResolvedValue([]);

      await fetchScoped();

      expect(listExecutionsStartedAfterMock).not.toHaveBeenCalled();
    });

    it('treats a Worker run the API does not know as having no children', async () => {
      listChildExecutionsMock.mockRejectedValue(
        Object.assign(new Error('Not Found'), { response: { status: 404 } })
      );

      const snapshot = await fetchScoped();

      expect(snapshot.childExecutions).toEqual({ analysis: [], proposal: [] });
      expect(snapshot.childExecutionErrors).toEqual({});
    });

    it('reports a failed lookup for every child workflow instead of undercounting silently', async () => {
      listChildExecutionsMock
        .mockResolvedValueOnce([
          { executionId: 'a-1', workflowId: 'analysis', status: 'completed' },
        ])
        .mockRejectedValueOnce(new Error('500 Internal Server Error'));

      const snapshot = await fetchScoped();

      expect(snapshot.childExecutionErrors).toEqual({
        analysis: expect.stringContaining('1 of 2 child lookups failed'),
        proposal: expect.stringContaining('500 Internal Server Error'),
      });
    });

    it('does not look anything up when no batch was dispatched', async () => {
      const snapshot = await fetchProgress({
        kbnClient,
        workerWorkflowId: 'worker',
        childWorkflowIds: ['analysis'],
        dispatches: [buildDispatch({ executionId: undefined })],
        runStartedAt: '2026-09-30T12:00:00.000Z',
        scopeChildrenToRun: true,
      });

      expect(listChildExecutionsMock).not.toHaveBeenCalled();
      expect(snapshot.childExecutions).toEqual({ analysis: [] });
    });
  });

  it('does not look up children per Worker run when polling', async () => {
    listExecutionsStartedAfterMock.mockResolvedValue([]);

    await fetch();

    expect(listChildExecutionsMock).not.toHaveBeenCalled();
  });
});
