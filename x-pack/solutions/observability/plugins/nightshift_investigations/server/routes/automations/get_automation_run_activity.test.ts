/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { getBoundInvestigationWorkflowId } from '../../lib/service_account/constants';
import { getAutomationRunActivityRoute } from './get_automation_run_activity';
import { createRouteContext } from './test_helpers';

const { handler, params } =
  getAutomationRunActivityRoute['GET /internal/nightshift/automations/{id}/run_activity'];
const get = jest.fn();
const getWorkflowExecutions = jest.fn();
const getWorkflowExecutionStatuses = jest.fn();
const getWorkflowExecution = jest.fn();
const getWorkflowsManagement = jest.fn();
const call = (executionId?: string) =>
  handler({
    request: httpServerMock.createKibanaRequest(),
    params: params.parse({
      path: { id: 'a1' },
      ...(executionId ? { query: { executionId } } : {}),
    }),
    context: createRouteContext(),
    getAutomationsSoClient: () => ({ get }),
    getWorkflowsManagement,
  } as never);

beforeEach(() => {
  jest.resetAllMocks();
  get.mockResolvedValue({ attributes: { workflowId: 'wf-1' } });
  getWorkflowExecutions.mockResolvedValue({ total: 0, results: [] });
  getWorkflowExecutionStatuses.mockResolvedValue([]);
  getWorkflowExecution.mockResolvedValue(null);
  getWorkflowsManagement.mockReturnValue({
    management: { getWorkflowExecutions, getWorkflowExecutionStatuses, getWorkflowExecution },
  });
});

it('finds an active execution independently of history dates and pagination', async () => {
  getWorkflowExecutions.mockResolvedValue({ total: 1, results: [{ id: 'scheduled-run' }] });
  expect(await call()).toEqual({ isRunning: true, executionId: undefined });
  const [query] = getWorkflowExecutions.mock.calls[0];
  expect(query).toEqual(expect.objectContaining({ workflowId: 'wf-1', size: 1 }));
  expect(query).not.toHaveProperty('startedAfter');
  expect(query).not.toHaveProperty('startedBefore');
  expect(query.statuses).toEqual(
    expect.arrayContaining([
      'pending',
      'queued',
      'running',
      'waiting',
      'waiting_for_input',
      'waiting_for_child',
    ])
  );
  expect(query.statuses).not.toEqual(expect.arrayContaining(['completed']));
});

it.each([
  [ExecutionStatus.PENDING, 'wf-1', true],
  [ExecutionStatus.COMPLETED, 'wf-1', false],
  [ExecutionStatus.FAILED, 'wf-1', false],
  [ExecutionStatus.RUNNING, 'another-workflow', false],
])(
  'checks an accepted execution before search refresh: %s / %s',
  async (status, workflowId, isRunning) => {
    getWorkflowExecutionStatuses.mockResolvedValue([{ id: 'exec-1', workflowId, status }]);
    expect(await call('exec-1')).toEqual({
      isRunning,
      executionId: isRunning ? 'exec-1' : undefined,
    });
  }
);

it('does not read executions for an automation outside the current space', async () => {
  get.mockRejectedValue(notFound('Automation not found'));
  await expect(call()).rejects.toThrow('Automation not found');
  expect(getWorkflowExecutions).not.toHaveBeenCalled();
  expect(getWorkflowExecutionStatuses).not.toHaveBeenCalled();
});

it('reports unavailable Workflows without returning an idle state', async () => {
  getWorkflowsManagement.mockReturnValue(undefined);
  await expect(call()).rejects.toThrow('Workflows management is not available');
});

it('stays busy after dispatch completes until the linked investigation execution ends', async () => {
  getWorkflowExecution.mockResolvedValue({
    stepExecutions: [
      { stepId: 'trigger_investigation', output: { execution_id: 'investigation-run' } },
    ],
  });
  const parent = { id: 'exec-1', workflowId: 'wf-1', status: ExecutionStatus.COMPLETED };
  const investigation = {
    id: 'investigation-run',
    workflowId: getBoundInvestigationWorkflowId('default'),
    status: ExecutionStatus.RUNNING,
  };
  getWorkflowExecutionStatuses.mockImplementation(async ([id]) => [
    id === 'exec-1' ? parent : investigation,
  ]);
  expect(await call('exec-1')).toEqual({ isRunning: true, executionId: 'exec-1' });
  investigation.status = ExecutionStatus.COMPLETED;
  expect(await call('exec-1')).toEqual({ isRunning: false, executionId: undefined });
});

it('finds an investigation started elsewhere, beyond the first active page, without matching another automation', async () => {
  getWorkflowExecutions.mockImplementation(async ({ workflowId, searchAfter }) => {
    if (workflowId === 'wf-1') return { total: 0, results: [] };
    return searchAfter
      ? { results: [{ id: 'own-run' }] }
      : { results: [{ id: 'other-run' }], searchAfter: ['cursor'] };
  });
  getWorkflowExecution.mockImplementation(async (id) => ({
    status: ExecutionStatus.RUNNING,
    context: {
      inputs: {
        context: { nightshift_automation_id: id === 'own-run' ? 'a1' : 'another-automation' },
      },
    },
  }));
  expect(await call()).toEqual({ isRunning: true, executionId: undefined });
});
