/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { listAutomationRunsRoute } from './list_automation_runs';

const { handler } = listAutomationRunsRoute['GET /internal/nightshift/automations/{id}/runs'];

const mockRequest = httpServerMock.createKibanaRequest();

const mockGet = jest.fn();
const mockBudgetGet = jest.fn();
const getAutomationsSoClient = jest.fn().mockReturnValue({
  get: (type: string, id: string) =>
    (type === 'nightshift-automation-budget' ? mockBudgetGet : mockGet)(type, id),
});

const mockGetWorkflowExecutions = jest.fn();
const mockSearchStepExecutions = jest.fn();
const getWorkflowsManagement = jest.fn().mockReturnValue({
  management: {
    getWorkflowExecutions: mockGetWorkflowExecutions,
    searchStepExecutions: mockSearchStepExecutions,
  },
});

const mockContext = {
  core: Promise.resolve({
    savedObjects: {
      client: { getCurrentNamespace: jest.fn().mockReturnValue('default') },
    },
  }),
  resolve: jest.fn(),
};

const call = (
  id: string,
  query: { page?: number; size?: number; startedAfter?: string; startedBefore?: string } = {}
) =>
  handler({
    request: mockRequest,
    params: {
      path: { id },
      query: {
        page: query.page ?? 1,
        size: query.size ?? 20,
        startedAfter: query.startedAfter,
        startedBefore: query.startedBefore,
      },
    },
    getAutomationsSoClient,
    getWorkflowsManagement,
    context: mockContext,
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
  mockBudgetGet.mockRejectedValue(
    SavedObjectsErrorHelpers.createGenericNotFoundError('nightshift-automation-budget', 'auto-1')
  );
  mockSearchStepExecutions.mockResolvedValue({ results: [] });
});

it('returns mapped runs when the automation has a workflowId', async () => {
  mockGet.mockResolvedValue({ attributes: { workflowId: 'wf-1', runtime: {} } });
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
  mockSearchStepExecutions.mockResolvedValue({
    results: [
      {
        workflowRunId: 'exec-1',
        input: { title: 'Alert triage', message: 'Investigate the alert' },
        output: { investigation_id: 'investigation-1' },
      },
    ],
  });

  const result = await call('auto-1');

  expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
    {
      workflowId: 'wf-1',
      omitStepRuns: true,
      page: 1,
      size: 20,
      startedAfter: undefined,
      startedBefore: undefined,
      request: mockRequest,
    },
    'default'
  );
  expect(mockSearchStepExecutions).toHaveBeenCalledWith(
    {
      workflowId: 'wf-1',
      stepId: 'trigger_investigation',
      workflowExecutionIds: ['exec-1'],
      includeInput: true,
      includeOutput: true,
      startedAfter: undefined,
      startedBefore: undefined,
      page: 1,
      size: 1,
      sourceIncludes: ['workflowRunId', 'input', 'output'],
      request: mockRequest,
    },
    'default'
  );
  expect(result).toEqual({
    runs: [
      {
        id: 'exec-1',
        status: 'succeeded',
        startedAt: '2026-09-01T00:00:00.000Z',
        finishedAt: '2026-09-01T00:01:00.000Z',
        duration: 60000,
        triggeredBy: 'schedule',
        title: 'Alert triage',
        message: 'Investigate the alert',
        investigationId: 'investigation-1',
        skipReason: null,
        dailyLimit: undefined,
      },
    ],
    total: 1,
    usedToday: 0,
    page: 1,
    size: 20,
  });
});

it.each([
  ['completed', 'succeeded'],
  ['running', 'running'],
  ['waiting_for_input', 'running'],
  ['queued', 'running'],
  ['failed', 'failed'],
  ['cancelled', 'failed'],
  ['timed_out', 'failed'],
  ['skipped', 'skipped'],
] as const)('maps workflow status %s to %s', async (status, expectedStatus) => {
  mockGet.mockResolvedValue({ attributes: { workflowId: 'wf-1', runtime: {} } });
  mockGetWorkflowExecutions.mockResolvedValue({
    results: [{ id: 'exec-1', status, startedAt: '2026-09-01T00:00:00.000Z' }],
    total: 1,
    page: 1,
    size: 20,
  });

  const result = await call('auto-1');

  expect(result.runs[0].status).toBe(expectedStatus);
});

it('returns an empty list when the automation has no workflowId yet', async () => {
  mockGet.mockResolvedValue({ attributes: {} });

  const result = await call('auto-1');

  expect(mockGetWorkflowExecutions).not.toHaveBeenCalled();
  expect(result).toEqual({ runs: [], total: 0, usedToday: 0, page: 1, size: 20 });
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

it('passes the selected time range to the workflow execution query', async () => {
  mockGet.mockResolvedValue({ attributes: { workflowId: 'wf-1' } });
  mockGetWorkflowExecutions.mockResolvedValue({ results: [], total: 0, page: 1, size: 100 });

  await call('auto-1', {
    startedAfter: '2026-09-01T00:00:00.000Z',
    startedBefore: '2026-09-03T00:00:00.000Z',
  });

  expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
    expect.objectContaining({
      startedAfter: '2026-09-01T00:00:00.000Z',
      startedBefore: '2026-09-03T00:00:00.000Z',
    }),
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

it('links the executed alert branch of a mixed workflow', async () => {
  mockGet.mockResolvedValue({ attributes: { workflowId: 'wf-1', runtime: {} } });
  mockGetWorkflowExecutions.mockResolvedValue({
    results: [{ id: 'exec-1', status: 'completed', triggeredBy: 'alerting.v1.alertStatusChanged' }],
    total: 1,
  });
  mockSearchStepExecutions
    .mockResolvedValueOnce({ results: [{ workflowRunId: 'exec-1' }] })
    .mockResolvedValueOnce({
      results: [
        {
          workflowRunId: 'exec-1',
          input: { title: 'Alert' },
          output: { investigation_id: 'inv-alert' },
        },
      ],
    });
  const result = await call('auto-1');
  expect(result.runs[0]).toMatchObject({ title: 'Alert', investigationId: 'inv-alert' });
});

it.each([
  ['alerting.v1.alertStatusChanged', 'trigger_investigation_alert'],
  ['slack2.message', 'trigger_investigation_slack'],
  ['scheduled', 'trigger_investigation'],
])('links the %s branch of a workflow with all trigger kinds', async (triggeredBy, stepId) => {
  mockGet.mockResolvedValue({ attributes: { workflowId: 'wf-1', runtime: {} } });
  mockGetWorkflowExecutions.mockResolvedValue({
    results: [{ id: 'exec-1', status: 'completed', triggeredBy }],
    total: 1,
  });
  mockSearchStepExecutions.mockImplementation(async ({ stepId: requestedStepId }) => ({
    results: [
      {
        workflowRunId: 'exec-1',
        ...(requestedStepId === stepId
          ? {
              input: { title: triggeredBy },
              output: { investigation_id: `inv-${stepId}` },
            }
          : {}),
      },
    ],
  }));
  const result = await call('auto-1');
  expect(result.runs[0]).toMatchObject({ title: triggeredBy, investigationId: `inv-${stepId}` });
});

it.each([
  [
    { investigation_id: 'inv-1' },
    { status: 'succeeded', investigationId: 'inv-1', skipReason: null },
  ],
  [
    { skip_reason: 'no_open_investigation' },
    { status: 'skipped', investigationId: undefined, skipReason: 'no_open_investigation' },
  ],
])('reports a recovery follow-up with output %j', async (output, expected) => {
  mockGet.mockResolvedValue({ attributes: { workflowId: 'wf-1', runtime: {} } });
  mockGetWorkflowExecutions.mockResolvedValue({
    results: [{ id: 'exec-1', status: 'completed', triggeredBy: 'alerting.v1.alertStatusChanged' }],
    total: 1,
  });
  mockSearchStepExecutions.mockImplementation(async ({ stepId }) => ({
    results: stepId === 'follow_up_recovered_alert' ? [{ workflowRunId: 'exec-1', output }] : [],
  }));

  const result = await call('auto-1');
  expect(result.runs[0]).toMatchObject(expected);
});

it('links activation and recovery runs of an alert-only workflow to their own steps', async () => {
  mockGet.mockResolvedValue({ attributes: { workflowId: 'wf-1', runtime: {} } });
  mockGetWorkflowExecutions.mockResolvedValue({
    results: [
      { id: 'exec-active', status: 'completed', triggeredBy: 'alerting.v1.alertStatusChanged' },
      { id: 'exec-recovered', status: 'completed', triggeredBy: 'alerting.v1.alertStatusChanged' },
    ],
    total: 2,
  });
  mockSearchStepExecutions.mockImplementation(async ({ stepId }) => ({
    results:
      stepId === 'trigger_investigation'
        ? [
            {
              workflowRunId: 'exec-active',
              input: { title: 'Latency is too high' },
              output: { investigation_id: 'inv-1' },
            },
          ]
        : stepId === 'follow_up_recovered_alert'
        ? [
            {
              workflowRunId: 'exec-recovered',
              output: { investigation_id: 'inv-1', execution_id: 'exec-round' },
            },
          ]
        : [],
  }));

  const result = await call('auto-1');
  expect(result.runs).toEqual([
    expect.objectContaining({
      id: 'exec-active',
      status: 'succeeded',
      title: 'Latency is too high',
      investigationId: 'inv-1',
    }),
    expect.objectContaining({
      id: 'exec-recovered',
      status: 'succeeded',
      title: undefined,
      investigationId: 'inv-1',
      skipReason: null,
    }),
  ]);
});

it('reports a recovery follow-up that failed as failed, not skipped', async () => {
  mockGet.mockResolvedValue({ attributes: { workflowId: 'wf-1', runtime: {} } });
  mockGetWorkflowExecutions.mockResolvedValue({
    results: [{ id: 'exec-1', status: 'failed', triggeredBy: 'alerting.v1.alertStatusChanged' }],
    total: 1,
  });
  mockSearchStepExecutions.mockImplementation(async ({ stepId }) => ({
    results: stepId === 'follow_up_recovered_alert' ? [{ workflowRunId: 'exec-1' }] : [],
  }));

  const result = await call('auto-1');
  expect(result.runs[0]).toMatchObject({
    status: 'failed',
    investigationId: undefined,
    skipReason: null,
  });
});

it('reports budget denials as skipped, preserving the limit at dispatch and excluding them from usage', async () => {
  mockGet.mockResolvedValueOnce({
    attributes: { workflowId: 'wf-1', runtime: { dailyDispatchLimit: 10 } },
  });
  mockBudgetGet.mockResolvedValueOnce({
    attributes: { date: new Date().toISOString().slice(0, 10), used: 2 },
  });
  mockGetWorkflowExecutions.mockResolvedValue({
    results: [{ id: 'exec-1', status: 'completed', triggeredBy: 'scheduled' }],
    total: 3,
    page: 1,
    size: 20,
  });
  mockSearchStepExecutions.mockResolvedValue({
    results: [{ workflowRunId: 'exec-1', output: { skip_reason: 'daily_limit', daily_limit: 2 } }],
  });

  const result = await call('auto-1');
  expect(result).toMatchObject({
    total: 3,
    usedToday: 2,
    runs: [{ status: 'skipped', skipReason: 'daily_limit', dailyLimit: 2 }],
  });
  expect(result.runs[0].investigationId).toBeUndefined();
});

it('reports global investigation-limit denials as skipped with their own reason', async () => {
  mockGet.mockResolvedValueOnce({
    attributes: { workflowId: 'wf-1', runtime: { dailyDispatchLimit: 10 } },
  });
  mockGetWorkflowExecutions.mockResolvedValue({
    results: [{ id: 'exec-1', status: 'completed', triggeredBy: 'scheduled' }],
    total: 1,
    page: 1,
    size: 20,
  });
  mockSearchStepExecutions.mockResolvedValue({
    results: [{ workflowRunId: 'exec-1', output: { skip_reason: 'investigation_limit' } }],
  });

  const result = await call('auto-1');
  expect(result.runs[0]).toMatchObject({ status: 'skipped', skipReason: 'investigation_limit' });
  expect(result.runs[0].dailyLimit).toBeUndefined();
});
