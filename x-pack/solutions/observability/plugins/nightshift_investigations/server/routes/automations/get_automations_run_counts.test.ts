/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { getAutomationsRunCountsRoute } from './get_automations_run_counts';
import { TRIGGER_STEP_IDS } from './count_skipped_runs';

const { handler } =
  getAutomationsRunCountsRoute['POST /internal/nightshift/automations/run_counts'];

const mockRequest = httpServerMock.createKibanaRequest();
const mockBulkGet = jest.fn();
const mockGetStatusCounts = jest.fn();
const mockSearchSteps = jest.fn();
const getAutomationsSoClient = jest.fn().mockReturnValue({ bulkGet: mockBulkGet });
const getWorkflowsManagement = jest.fn();

const mockContext = {
  core: Promise.resolve({
    savedObjects: { client: { getCurrentNamespace: jest.fn().mockReturnValue('default') } },
  }),
};

const call = (body: { ids: string[]; startedAfter?: string; startedBefore?: string }) =>
  handler({
    request: mockRequest,
    params: { body },
    getAutomationsSoClient,
    getWorkflowsManagement,
    context: mockContext,
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchSteps.mockResolvedValue({ results: [], total: 0 });
  getWorkflowsManagement.mockReturnValue({
    management: {
      getWorkflowExecutionStatusCounts: mockGetStatusCounts,
      searchStepExecutions: mockSearchSteps,
    },
  });
});

describe('POST /internal/nightshift/automations/run_counts', () => {
  it('folds execution statuses into run statuses and passes the time range through', async () => {
    mockBulkGet.mockResolvedValue({
      saved_objects: [{ id: 'a1', attributes: { workflowId: 'wf-1' } }],
    });
    mockGetStatusCounts.mockResolvedValue({
      'wf-1': {
        completed: 120,
        skipped: 2,
        pending: 1,
        waiting_for_input: 2,
        queued: 3,
        running: 4,
        failed: 5,
        cancelled: 6,
        timed_out: 7,
      },
    });

    const result = await call({ ids: ['a1'], startedAfter: 'now-7d', startedBefore: 'now' });

    expect(result).toEqual({
      counts: { a1: { succeeded: 120, skipped: 2, running: 10, failed: 18 } },
    });
    expect(mockGetStatusCounts).toHaveBeenCalledWith(
      { workflowIds: ['wf-1'], startedAfter: 'now-7d', startedBefore: 'now', request: mockRequest },
      'default'
    );
  });

  it('moves distinct skip_reason runs from succeeded to skipped across pages', async () => {
    mockBulkGet.mockResolvedValue({
      saved_objects: [{ id: 'a1', attributes: { workflowId: 'wf-1' } }],
    });
    mockGetStatusCounts.mockResolvedValue({ 'wf-1': { completed: 150, skipped: 1 } });
    const skipped = (workflowRunId: string) => ({
      workflowRunId,
      output: { skip_reason: 'daily_limit' },
    });
    mockSearchSteps.mockImplementation(async ({ page }) => ({
      results:
        page === 1
          ? Array.from({ length: 100 }, (_, i) => skipped(`r${i}`))
          : [
              skipped('r1'),
              skipped('r100'),
              skipped('r101'),
              skipped('r100'),
              { workflowRunId: 'ok', output: { investigation_id: 'x' } },
            ],
      total: 105,
    }));

    const result = await call({ ids: ['a1'] });

    expect(result).toEqual({
      counts: { a1: { succeeded: 48, skipped: 103, running: 0, failed: 0 } },
    });
    expect(mockSearchSteps).toHaveBeenCalledTimes(2);
    expect(mockSearchSteps.mock.calls[0][0].stepId).toEqual(TRIGGER_STEP_IDS);
  });

  it('never lets succeeded go below zero', async () => {
    mockBulkGet.mockResolvedValue({
      saved_objects: [{ id: 'a1', attributes: { workflowId: 'wf-1' } }],
    });
    mockGetStatusCounts.mockResolvedValue({ 'wf-1': { completed: 1 } });
    mockSearchSteps.mockResolvedValue({
      results: [
        { workflowRunId: 'r1', output: { skip_reason: 'daily_limit' } },
        { workflowRunId: 'r2', output: { skip_reason: 'daily_limit' } },
      ],
      total: 2,
    });

    const result = await call({ ids: ['a1'] });

    expect(result).toEqual({ counts: { a1: { succeeded: 0, skipped: 1, running: 0, failed: 0 } } });
  });

  it('returns zeros for automations without a workflow or without runs', async () => {
    mockBulkGet.mockResolvedValue({
      saved_objects: [
        { id: 'no-wf', attributes: {} },
        { id: 'no-runs', attributes: { workflowId: 'wf-2' } },
        { id: 'missing', error: { statusCode: 404 } },
      ],
    });
    mockGetStatusCounts.mockResolvedValue({});

    const result = await call({ ids: ['no-wf', 'no-runs', 'missing'] });

    const zeros = { succeeded: 0, running: 0, failed: 0, skipped: 0 };
    expect(result).toEqual({ counts: { 'no-wf': zeros, 'no-runs': zeros, missing: zeros } });
    expect(mockGetStatusCounts).toHaveBeenCalledWith(
      expect.objectContaining({ workflowIds: ['wf-2'] }),
      'default'
    );
  });

  it('does not scan skipped runs for a workflow missing from the access-filtered counts', async () => {
    mockBulkGet.mockResolvedValue({
      saved_objects: [
        { id: 'readable', attributes: { workflowId: 'wf-ok' } },
        { id: 'private', attributes: { workflowId: 'wf-private' } },
      ],
    });
    mockGetStatusCounts.mockResolvedValue({ 'wf-ok': { completed: 3 } });
    mockSearchSteps.mockImplementation(async ({ workflowId }) => {
      if (workflowId === 'wf-private') throw new Error('forbidden');
      return { results: [], total: 0 };
    });

    const result = await call({ ids: ['readable', 'private'] });

    expect(result).toEqual({
      counts: {
        readable: { succeeded: 3, skipped: 0, running: 0, failed: 0 },
        private: { succeeded: 0, skipped: 0, running: 0, failed: 0 },
      },
    });
    expect(mockSearchSteps).not.toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: 'wf-private' }),
      expect.anything()
    );
  });

  it('throws 503 when workflows management is unavailable', async () => {
    getWorkflowsManagement.mockReturnValue(undefined);

    await expect(call({ ids: ['a1'] })).rejects.toMatchObject({
      output: { statusCode: 503 },
    });
  });
});
