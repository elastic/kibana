/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { listAutomationRunsRoute } from './list_automation_runs';

const { handler } = listAutomationRunsRoute['GET /internal/nightshift/automations/{id}/runs'];

const mockRequest = httpServerMock.createKibanaRequest();

const mockGet = jest.fn();
const getAutomationsSoClient = jest.fn().mockReturnValue({ get: mockGet });

const mockGetWorkflowExecutions = jest.fn();
const getWorkflowsManagement = jest.fn().mockReturnValue({
  management: { getWorkflowExecutions: mockGetWorkflowExecutions },
});

const mockContext = {
  core: Promise.resolve({
    savedObjects: {
      client: { getCurrentNamespace: jest.fn().mockReturnValue('default') },
    },
  }),
  resolve: jest.fn(),
};

const call = (id: string, query: { page?: number; size?: number } = {}) =>
  handler({
    request: mockRequest,
    params: { path: { id }, query: { page: query.page ?? 1, size: query.size ?? 20 } },
    getAutomationsSoClient,
    getWorkflowsManagement,
    context: mockContext,
  } as never);

beforeEach(() => jest.clearAllMocks());

it('returns mapped runs when the automation has a workflowId', async () => {
  mockGet.mockResolvedValue({ attributes: { workflowId: 'wf-1' } });
  mockGetWorkflowExecutions.mockResolvedValue({
    results: [
      {
        id: 'exec-1',
        status: 'completed',
        startedAt: '2026-09-01T00:00:00.000Z',
        finishedAt: '2026-09-01T00:01:00.000Z',
        duration: 60000,
        triggeredBy: 'schedule',
      },
    ],
    total: 1,
    page: 1,
    size: 20,
  });

  const result = await call('auto-1');

  expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
    { workflowId: 'wf-1', omitStepRuns: true, page: 1, size: 20, request: mockRequest },
    'default'
  );
  expect(result).toEqual({
    runs: [
      {
        id: 'exec-1',
        status: 'completed',
        startedAt: '2026-09-01T00:00:00.000Z',
        finishedAt: '2026-09-01T00:01:00.000Z',
        duration: 60000,
        triggeredBy: 'schedule',
      },
    ],
    total: 1,
    page: 1,
    size: 20,
  });
});

it('returns an empty list when the automation has no workflowId yet', async () => {
  mockGet.mockResolvedValue({ attributes: {} });

  const result = await call('auto-1');

  expect(mockGetWorkflowExecutions).not.toHaveBeenCalled();
  expect(result).toEqual({ runs: [], total: 0, page: 1, size: 20 });
});

it('passes custom pagination to getWorkflowExecutions', async () => {
  mockGet.mockResolvedValue({ attributes: { workflowId: 'wf-1' } });
  mockGetWorkflowExecutions.mockResolvedValue({ results: [], total: 0, page: 2, size: 10 });

  await call('auto-1', { page: 2, size: 10 });

  expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
    expect.objectContaining({ page: 2, size: 10 }),
    'default'
  );
});

it('throws 503 when workflows management is not available', async () => {
  getWorkflowsManagement.mockReturnValueOnce(undefined);

  await expect(call('auto-1')).rejects.toMatchObject({ output: { statusCode: 503 } });
});

it('propagates saved-object 404 when the automation does not exist', async () => {
  const notFoundError = Object.assign(new Error('Not Found'), {
    output: { statusCode: 404 },
    isBoom: true,
  });
  mockGet.mockRejectedValue(notFoundError);

  await expect(call('missing-id')).rejects.toMatchObject({ output: { statusCode: 404 } });
});
