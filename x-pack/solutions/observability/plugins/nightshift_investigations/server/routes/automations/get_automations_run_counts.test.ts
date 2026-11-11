/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { getAutomationsRunCountsRoute } from './get_automations_run_counts';

const { handler } =
  getAutomationsRunCountsRoute['POST /internal/nightshift/automations/run_counts'];

const mockRequest = httpServerMock.createKibanaRequest();
const mockBulkGet = jest.fn();
const mockGetStatusCounts = jest.fn();
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
  getWorkflowsManagement.mockReturnValue({
    management: { getWorkflowExecutionStatusCounts: mockGetStatusCounts },
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

  it('throws 503 when workflows management is unavailable', async () => {
    getWorkflowsManagement.mockReturnValue(undefined);

    await expect(call({ ids: ['a1'] })).rejects.toMatchObject({
      output: { statusCode: 503 },
    });
  });
});
