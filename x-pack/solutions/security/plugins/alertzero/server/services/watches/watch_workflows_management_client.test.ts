/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { ALERTZERO_ACTION_WORKFLOW_IDS } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { WatchWorkflowsManagementClientImpl } from './watch_workflows_management_client';

describe('WatchWorkflowsManagementClientImpl', () => {
  it('searches failed AlertZero managed executions from the last 24 hours', async () => {
    const searchExecutionsView = jest.fn().mockResolvedValue({ results: [], total: 0 });
    const client = new WatchWorkflowsManagementClientImpl({
      searchExecutionsView,
    } as unknown as NonNullable<WorkflowsServerPluginSetup['management']>);
    const request = httpServerMock.createKibanaRequest();

    await client.searchFailedManagedExecutions({ page: 2, size: 100 }, 'other-space', request);

    expect(searchExecutionsView).toHaveBeenCalledWith(
      {
        request,
        statuses: [ExecutionStatus.FAILED],
        finishedAfter: 'now-24h',
        includeManagedExecutions: true,
        query: {
          bool: {
            filter: [{ term: { managedBy: 'alertzero' } }],
            must_not: [{ terms: { originManagedWorkflowId: [...ALERTZERO_ACTION_WORKFLOW_IDS] } }],
          },
        },
        sortField: 'finishedAt',
        sortOrder: 'desc',
        page: 2,
        size: 100,
      },
      'other-space'
    );
  });

  it('reads the newest execution of a workflow in any status', async () => {
    const newest = { id: 'run-2', status: ExecutionStatus.COMPLETED };
    const searchExecutionsView = jest.fn().mockResolvedValue({ results: [newest], total: 2 });
    const client = new WatchWorkflowsManagementClientImpl({
      searchExecutionsView,
    } as unknown as NonNullable<WorkflowsServerPluginSetup['management']>);
    const request = httpServerMock.createKibanaRequest();

    await expect(
      client.getLatestWorkflowExecution('worker-default', 'space', request)
    ).resolves.toBe(newest);

    expect(searchExecutionsView).toHaveBeenCalledWith(
      {
        request,
        includeManagedExecutions: true,
        query: { bool: { filter: [{ term: { workflowId: 'worker-default' } }] } },
        sortField: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        size: 1,
      },
      'space'
    );
  });

  it('reads the newest finished execution, never a skipped or in-progress one', async () => {
    const newest = { id: 'run-1', status: ExecutionStatus.FAILED };
    const searchExecutionsView = jest.fn().mockResolvedValue({ results: [newest], total: 1 });
    const client = new WatchWorkflowsManagementClientImpl({
      searchExecutionsView,
    } as unknown as NonNullable<WorkflowsServerPluginSetup['management']>);
    const request = httpServerMock.createKibanaRequest();

    await expect(
      client.getLatestFinishedWorkflowExecution('worker-default', 'space', request)
    ).resolves.toBe(newest);

    expect(searchExecutionsView).toHaveBeenCalledWith(
      {
        request,
        includeManagedExecutions: true,
        statuses: [
          ExecutionStatus.COMPLETED,
          ExecutionStatus.FAILED,
          ExecutionStatus.CANCELLED,
          ExecutionStatus.TIMED_OUT,
        ],
        query: { bool: { filter: [{ term: { workflowId: 'worker-default' } }] } },
        sortField: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        size: 1,
      },
      'space'
    );
  });

  it('returns undefined when no execution has finished', async () => {
    const searchExecutionsView = jest.fn().mockResolvedValue({ results: [], total: 0 });
    const client = new WatchWorkflowsManagementClientImpl({
      searchExecutionsView,
    } as unknown as NonNullable<WorkflowsServerPluginSetup['management']>);

    await expect(
      client.getLatestFinishedWorkflowExecution(
        'worker-default',
        'space',
        httpServerMock.createKibanaRequest()
      )
    ).resolves.toBeUndefined();
  });

  describe('getStepExecution', () => {
    const setup = (step: unknown) => {
      const getStepExecutionByStepId = jest.fn().mockResolvedValue(step);
      const searchStepExecutions = jest.fn();
      const client = new WatchWorkflowsManagementClientImpl({
        getStepExecutionByStepId,
        searchStepExecutions,
      } as unknown as NonNullable<WorkflowsServerPluginSetup['management']>);
      return { client, getStepExecutionByStepId, searchStepExecutions };
    };
    const params = { workflowId: 'wf', workflowExecutionId: 'exec', stepId: 'step' };

    it('reads the one step in real time, never by search', async () => {
      const { client, getStepExecutionByStepId, searchStepExecutions } = setup({
        workflowId: 'wf',
        stepId: 'step',
        output: { a: 1 },
      });
      const request = httpServerMock.createKibanaRequest();
      await expect(client.getStepExecution(params, 'space', request)).resolves.toEqual({
        workflowId: 'wf',
        stepId: 'step',
        output: { a: 1 },
      });
      expect(getStepExecutionByStepId).toHaveBeenCalledWith(
        { executionId: 'exec', stepId: 'step' },
        'space',
        request
      );
      expect(searchStepExecutions).not.toHaveBeenCalled();
    });

    it('is undefined when the step has no document', async () => {
      const { client } = setup(null);
      await expect(
        client.getStepExecution(params, 'space', httpServerMock.createKibanaRequest())
      ).resolves.toBeUndefined();
    });

    it('is undefined when the document belongs to another workflow', async () => {
      const { client } = setup({ workflowId: 'other-wf', stepId: 'step', output: { a: 1 } });
      await expect(
        client.getStepExecution(params, 'space', httpServerMock.createKibanaRequest())
      ).resolves.toBeUndefined();
    });
  });
});
