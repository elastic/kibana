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
    const setup = (
      execution: { workflowId: string; stepExecutions: unknown[] } | null,
      stepsById: Record<string, unknown> = {}
    ) => {
      const getWorkflowExecution = jest.fn().mockResolvedValue(execution);
      const getStepExecution = jest.fn(async ({ id }: { id: string }) => stepsById[id]);
      const searchStepExecutions = jest.fn();
      const client = new WatchWorkflowsManagementClientImpl({
        getWorkflowExecution,
        getStepExecution,
        searchStepExecutions,
      } as unknown as NonNullable<WorkflowsServerPluginSetup['management']>);
      return { client, getWorkflowExecution, getStepExecution, searchStepExecutions };
    };
    const params = { workflowId: 'wf', workflowExecutionId: 'exec', stepId: 'step' };

    it('gets the execution and the documents of the one step by id, never by search', async () => {
      const { client, getWorkflowExecution, getStepExecution, searchStepExecutions } = setup(
        {
          workflowId: 'wf',
          stepExecutions: [
            { id: 'se-other', stepId: 'other', startedAt: '2026-01-01T00:00:02.000Z' },
            { id: 'se-step', stepId: 'step', startedAt: '2026-01-01T00:00:01.000Z' },
          ],
        },
        { 'se-step': { stepId: 'step', output: { a: 1 } } }
      );
      const request = httpServerMock.createKibanaRequest();
      await expect(client.getStepExecution(params, 'space', request)).resolves.toEqual({
        stepId: 'step',
        output: { a: 1 },
      });
      expect(getWorkflowExecution).toHaveBeenCalledWith('exec', 'space', { request });
      expect(getStepExecution).toHaveBeenCalledTimes(1);
      expect(getStepExecution).toHaveBeenCalledWith(
        { executionId: 'exec', id: 'se-step' },
        'space',
        request
      );
      expect(searchStepExecutions).not.toHaveBeenCalled();
    });

    it('prefers the document that carries a non-null output when the step id is shared', async () => {
      const { client } = setup(
        {
          workflowId: 'wf',
          stepExecutions: [
            { id: 'se-result', stepId: 'step', startedAt: '2026-01-01T00:00:01.000Z' },
            { id: 'se-wrapper', stepId: 'step', startedAt: '2026-01-01T00:00:02.000Z' },
          ],
        },
        {
          'se-result': { id: 'se-result', stepId: 'step', output: { a: 1 } },
          'se-wrapper': { id: 'se-wrapper', stepId: 'step', output: null },
        }
      );
      await expect(
        client.getStepExecution(params, 'space', httpServerMock.createKibanaRequest())
      ).resolves.toEqual({ id: 'se-result', stepId: 'step', output: { a: 1 } });
    });

    it('returns the newest document when none carries an output', async () => {
      const { client } = setup(
        {
          workflowId: 'wf',
          stepExecutions: [
            { id: 'se-old', stepId: 'step', startedAt: '2026-01-01T00:00:01.000Z' },
            { id: 'se-new', stepId: 'step', startedAt: '2026-01-01T00:00:02.000Z' },
          ],
        },
        { 'se-old': { id: 'se-old', stepId: 'step' }, 'se-new': { id: 'se-new', stepId: 'step' } }
      );
      await expect(
        client.getStepExecution(params, 'space', httpServerMock.createKibanaRequest())
      ).resolves.toEqual({ id: 'se-new', stepId: 'step' });
    });

    it('is undefined when the execution has no document for the step', async () => {
      const { client, getStepExecution } = setup({
        workflowId: 'wf',
        stepExecutions: [{ id: 'se-other', stepId: 'other', startedAt: 's' }],
      });
      await expect(
        client.getStepExecution(params, 'space', httpServerMock.createKibanaRequest())
      ).resolves.toBeUndefined();
      expect(getStepExecution).not.toHaveBeenCalled();
    });

    it('is undefined when the execution is missing or belongs to another workflow', async () => {
      const missing = setup(null);
      await expect(
        missing.client.getStepExecution(params, 'space', httpServerMock.createKibanaRequest())
      ).resolves.toBeUndefined();
      const other = setup({
        workflowId: 'other-wf',
        stepExecutions: [{ id: 'se-step', stepId: 'step', startedAt: 's' }],
      });
      await expect(
        other.client.getStepExecution(params, 'space', httpServerMock.createKibanaRequest())
      ).resolves.toBeUndefined();
      expect(other.getStepExecution).not.toHaveBeenCalled();
    });
  });
});
