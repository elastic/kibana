/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { createEsClient, createKbnClient } from '../../lib/clients';
import type { WorkflowExecutionSummary } from './kibana_api';
import { listExecutionsStartedAfter } from './kibana_api';
import type { ProgressSnapshot, ScheduledProgressOptions } from './progress';
import { REPORTED_STEP_IDS, classifyDispatches, fetchProgress, isSettled } from './progress';
import type { DispatchRecord } from './types';
import { fetchVerdicts } from './verdicts';

jest.mock('./kibana_api', () => ({
  listExecutionsStartedAfter: jest.fn(),
}));
jest.mock('./verdicts', () => ({ fetchVerdicts: jest.fn() }));

const buildDispatch = (overrides: Partial<DispatchRecord> = {}): DispatchRecord => ({
  batchId: 'batch-0001',
  ruleIndex: 0,
  ruleUuid: 'rule-0',
  plannedOffsetMs: 0,
  dispatchedAt: '2026-09-30T12:00:00.000Z',
  alerts: [{ id: 'alert-1', label: 'true_positive' }],
  indexMs: 20,
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

const buildSnapshot = (overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot => ({
  takenAt: '2026-09-30T12:10:00.000Z',
  workerExecutions: [],
  triagedBatches: {},
  childExecutions: {},
  childExecutionErrors: {},
  ...overrides,
});

describe('REPORTED_STEP_IDS', () => {
  it('keeps the per-alert note durations in the report breakdown', () => {
    expect(REPORTED_STEP_IDS).toContain('add_verdict_notes');
  });
});

describe('classifyDispatches', () => {
  const classify = (snapshot: ProgressSnapshot, dispatch = buildDispatch()) =>
    classifyDispatches({ dispatches: [dispatch], snapshot })[0];

  it('marks a batch whose alerts could not be indexed as failed to dispatch', () => {
    const { phase } = classify(buildSnapshot(), buildDispatch({ error: 'Bulk indexing errors' }));

    expect(phase).toBe('dispatch_failed');
  });

  it('keeps a batch running until every alert carries a verdict', () => {
    const progress = classify(buildSnapshot());

    expect(progress).toMatchObject({ phase: 'running', triagedAt: undefined });
  });

  it('marks a batch triaged once it was seen triaged, and dates it by when it was seen', () => {
    const progress = classify(
      buildSnapshot({ triagedBatches: { 'batch-0001': '2026-09-30T12:07:00.000Z' } })
    );

    expect(progress).toMatchObject({ phase: 'triaged', triagedAt: '2026-09-30T12:07:00.000Z' });
  });
});

describe('isSettled', () => {
  it.each(['dispatch_failed', 'triaged'] as const)('settles %s', (phase) => {
    expect(isSettled(phase)).toBe(true);
  });

  it('does not settle running', () => {
    expect(isSettled('running')).toBe(false);
  });
});

describe('fetchProgress', () => {
  const stack = {
    kibanaUrl: 'http://localhost:5601',
    elasticsearchUrl: 'http://localhost:9200',
    auth: { type: 'basic' as const, username: 'elastic', password: 'changeme' },
  };
  const kbnClient = createKbnClient({ ...stack, log: new ToolingLog() });
  const esClient = createEsClient(stack);
  const listExecutionsStartedAfterMock = jest.mocked(listExecutionsStartedAfter);
  const fetchVerdictsMock = jest.mocked(fetchVerdicts);

  const buildScheduled = (
    overrides: Partial<ScheduledProgressOptions> = {}
  ): ScheduledProgressOptions => ({
    esClient,
    alertsIndex: '.alerts-security.alerts-default',
    batchWorkflowId: 'batch',
    triagedBatches: {},
    lookForNewlyTriaged: false,
    ...overrides,
  });

  const fetch = (scheduled = buildScheduled(), dispatches: DispatchRecord[] = [buildDispatch()]) =>
    fetchProgress({
      kbnClient,
      childWorkflowIds: ['analysis', 'proposal'],
      dispatches,
      runStartedAt: '2026-09-30T12:00:00.000Z',
      scheduled,
    });

  beforeEach(() => {
    listExecutionsStartedAfterMock.mockReset().mockResolvedValue([]);
    fetchVerdictsMock.mockReset().mockResolvedValue({});
  });

  it("takes the batch workflow's runs since the start of the test as the Worker's runs", async () => {
    listExecutionsStartedAfterMock.mockImplementation(async ({ workflowId }) =>
      workflowId === 'batch' ? [buildExecution({ id: 'batch-run-1' })] : []
    );

    const snapshot = await fetch();

    expect(snapshot.workerExecutions).toEqual([buildExecution({ id: 'batch-run-1' })]);
  });

  it('lists the executions of every child workflow', async () => {
    listExecutionsStartedAfterMock.mockImplementation(async ({ workflowId }) =>
      workflowId === 'batch' ? [] : [buildExecution({ id: 'child-1' })]
    );

    const snapshot = await fetch();

    expect(Object.keys(snapshot.childExecutions)).toEqual(['analysis', 'proposal']);
    expect(snapshot.childExecutions.analysis).toEqual([buildExecution({ id: 'child-1' })]);
    expect(snapshot.childExecutionErrors).toEqual({});
  });

  it('reports a child workflow that could not be listed instead of treating it as empty', async () => {
    listExecutionsStartedAfterMock.mockImplementation(async ({ workflowId }) => {
      if (workflowId === 'proposal') throw new Error('403 Forbidden');
      return workflowId === 'analysis' ? [buildExecution({ id: 'child-1' })] : [];
    });

    const snapshot = await fetch();

    expect(snapshot.childExecutions.analysis).toHaveLength(1);
    expect(snapshot.childExecutions.proposal).toEqual([]);
    expect(snapshot.childExecutionErrors).toEqual({ proposal: expect.stringContaining('403') });
  });

  describe('triaged batches', () => {
    const dispatches = [
      buildDispatch({ batchId: 'batch-0', alerts: [{ id: 'a-1', label: 'true_positive' }] }),
      buildDispatch({
        batchId: 'batch-1',
        alerts: [
          { id: 'b-1', label: 'false_positive' },
          { id: 'b-2', label: 'false_positive' },
        ],
      }),
    ];

    it('marks a batch triaged once every one of its alerts carries a verdict', async () => {
      fetchVerdictsMock.mockResolvedValue({
        'a-1': 'true_positive',
        'b-1': 'false_positive',
        'b-2': undefined,
      });

      const snapshot = await fetch(buildScheduled({ lookForNewlyTriaged: true }), dispatches);

      expect(Object.keys(snapshot.triagedBatches)).toEqual(['batch-0']);
      expect(snapshot.triagedBatches['batch-0']).toBe(snapshot.takenAt);
    });

    it('keeps the time of a batch that was already seen triaged, and does not look it up again', async () => {
      fetchVerdictsMock.mockResolvedValue({ 'b-1': 'false_positive', 'b-2': 'inconclusive' });

      const snapshot = await fetch(
        buildScheduled({
          lookForNewlyTriaged: true,
          triagedBatches: { 'batch-0': '2026-09-30T12:03:00.000Z' },
        }),
        dispatches
      );

      expect(fetchVerdictsMock).toHaveBeenCalledWith(
        expect.objectContaining({ alertIds: ['b-1', 'b-2'] })
      );
      expect(snapshot.triagedBatches['batch-0']).toBe('2026-09-30T12:03:00.000Z');
      expect(snapshot.triagedBatches['batch-1']).toBe(snapshot.takenAt);
    });

    it('does not look at a batch whose alerts could not be indexed', async () => {
      await fetch(buildScheduled({ lookForNewlyTriaged: true }), [
        buildDispatch({ error: 'Bulk indexing errors' }),
      ]);

      expect(fetchVerdictsMock).not.toHaveBeenCalled();
    });

    it('only reports the known batches when rebuilding a report after the run', async () => {
      const snapshot = await fetch(
        buildScheduled({ triagedBatches: { 'batch-0': '2026-09-30T12:03:00.000Z' } }),
        dispatches
      );

      expect(fetchVerdictsMock).not.toHaveBeenCalled();
      expect(snapshot.triagedBatches).toEqual({ 'batch-0': '2026-09-30T12:03:00.000Z' });
    });
  });
});
