/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { WorkflowsManagementApiActions } from '@kbn/workflows';

import { WatchWorkflowsManagementClientImpl } from './watch_workflows_management_client';
import { WorkflowsManagedReadForbiddenError } from './workflows_read_authz';

type Management = NonNullable<WorkflowsServerPluginSetup['management']>;

const createManagementMock = () =>
  ({
    createWorkflow: jest.fn(),
    deleteWorkflows: jest.fn(),
    getWorkflow: jest.fn(),
    getWorkflowExecution: jest.fn(),
    getWorkflowExecutions: jest.fn(),
    getWorkflows: jest.fn(),
    listWaitingForInputSteps: jest.fn(),
    resumeWorkflowExecution: jest.fn(),
  } as unknown as jest.Mocked<Management>);

const requestWith = (authzResult: Record<string, boolean>): KibanaRequest =>
  ({ authzResult } as unknown as KibanaRequest);

const managedReader = requestWith({
  [WorkflowsManagementApiActions.read]: true,
  [WorkflowsManagementApiActions.readManaged]: true,
});

const managedReaderWithExecutions = requestWith({
  [WorkflowsManagementApiActions.read]: true,
  [WorkflowsManagementApiActions.readManaged]: true,
  [WorkflowsManagementApiActions.readExecution]: true,
  [WorkflowsManagementApiActions.readManagedExecution]: true,
});

describe('WatchWorkflowsManagementClientImpl', () => {
  describe('getWorkflows', () => {
    it('rejects a managed-catalog read when the caller lacks managed read', async () => {
      const management = createManagementMock();
      const client = new WatchWorkflowsManagementClientImpl(management);

      await expect(
        client.getWorkflows(
          { managedFilter: 'all' },
          'space-1',
          requestWith({ [WorkflowsManagementApiActions.read]: true })
        )
      ).rejects.toBeInstanceOf(WorkflowsManagedReadForbiddenError);
    });

    it('does not call the underlying API when the managed read is rejected', async () => {
      const management = createManagementMock();
      const client = new WatchWorkflowsManagementClientImpl(management);

      await client
        .getWorkflows({ managedFilter: 'all' }, 'space-1', requestWith({}))
        .catch(() => undefined);

      expect(management.getWorkflows).not.toHaveBeenCalled();
    });

    it('strips managed execution history when the caller lacks managed execution read', async () => {
      const management = createManagementMock();
      const client = new WatchWorkflowsManagementClientImpl(management);

      await client.getWorkflows({ managedFilter: 'all' }, 'space-1', managedReader, {
        includeExecutionHistory: true,
        includeManagedExecutionHistory: true,
      });

      expect(management.getWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({ managedFilter: 'all' }),
        'space-1',
        expect.objectContaining({ includeManagedExecutionHistory: false })
      );
    });

    it('keeps managed execution history when the caller may read managed executions', async () => {
      const management = createManagementMock();
      const client = new WatchWorkflowsManagementClientImpl(management);

      await client.getWorkflows({ managedFilter: 'all' }, 'space-1', managedReaderWithExecutions, {
        includeExecutionHistory: true,
        includeManagedExecutionHistory: true,
      });

      expect(management.getWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({ managedFilter: 'all' }),
        'space-1',
        expect.objectContaining({ includeManagedExecutionHistory: true })
      );
    });
  });

  describe('getWorkflow', () => {
    it('returns an unmanaged workflow without requiring managed read', async () => {
      const management = createManagementMock();
      const workflow = { id: 'w-1', managed: false };
      (management.getWorkflow as jest.Mock).mockResolvedValue(workflow);
      const client = new WatchWorkflowsManagementClientImpl(management);

      const result = await client.getWorkflow(
        'w-1',
        'space-1',
        requestWith({ [WorkflowsManagementApiActions.read]: true })
      );

      expect(result).toBe(workflow);
    });

    it('rejects a managed workflow when the caller lacks managed read', async () => {
      const management = createManagementMock();
      (management.getWorkflow as jest.Mock).mockResolvedValue({ id: 'w-1', managed: true });
      const client = new WatchWorkflowsManagementClientImpl(management);

      await expect(
        client.getWorkflow(
          'w-1',
          'space-1',
          requestWith({ [WorkflowsManagementApiActions.read]: true })
        )
      ).rejects.toBeInstanceOf(WorkflowsManagedReadForbiddenError);
    });

    it('returns a managed workflow when the caller has managed read', async () => {
      const management = createManagementMock();
      const workflow = { id: 'w-1', managed: true };
      (management.getWorkflow as jest.Mock).mockResolvedValue(workflow);
      const client = new WatchWorkflowsManagementClientImpl(management);

      const result = await client.getWorkflow('w-1', 'space-1', managedReader);

      expect(result).toBe(workflow);
    });
  });

  describe('getWorkflowExecution', () => {
    it('forwards the options argument to management.getWorkflowExecution', async () => {
      const management = createManagementMock();
      const client = new WatchWorkflowsManagementClientImpl(management);

      await client.getWorkflowExecution('execution-1', 'space-1', {
        includeInput: true,
        includeOutput: true,
      });

      expect(management.getWorkflowExecution).toHaveBeenCalledWith('execution-1', 'space-1', {
        includeInput: true,
        includeOutput: true,
      });
    });

    it('returns the value from management.getWorkflowExecution', async () => {
      const management = createManagementMock();
      const execution = { id: 'execution-1' };
      (management.getWorkflowExecution as jest.Mock).mockResolvedValue(execution);
      const client = new WatchWorkflowsManagementClientImpl(management);

      const result = await client.getWorkflowExecution('execution-1', 'space-1');

      expect(result).toBe(execution);
    });

    it('throws 403 when the request lacks managed-execution read', () => {
      const management = createManagementMock();
      const client = new WatchWorkflowsManagementClientImpl(management);

      expect(() =>
        client.getWorkflowExecution('execution-1', 'space-1', { request: managedReader })
      ).toThrow(WorkflowsManagedReadForbiddenError);
    });

    it('does not forward the request object to management.getWorkflowExecution', async () => {
      const management = createManagementMock();
      const client = new WatchWorkflowsManagementClientImpl(management);

      await client.getWorkflowExecution('execution-1', 'space-1', {
        includeInput: true,
        includeOutput: true,
        request: managedReaderWithExecutions,
      });

      expect(management.getWorkflowExecution).toHaveBeenCalledWith('execution-1', 'space-1', {
        includeInput: true,
        includeOutput: true,
      });
    });
  });

  describe('getWorkflowExecutions', () => {
    it('forwards the listing to management.getWorkflowExecutions', async () => {
      const management = createManagementMock();
      const client = new WatchWorkflowsManagementClientImpl(management);

      await client.getWorkflowExecutions({ page: 1, size: 10, workflowId: 'watch-1' }, 'space-1');

      expect(management.getWorkflowExecutions).toHaveBeenCalledWith(
        { page: 1, size: 10, workflowId: 'watch-1' },
        'space-1'
      );
    });

    it('throws 403 when the request lacks managed-execution read', () => {
      const management = createManagementMock();
      const client = new WatchWorkflowsManagementClientImpl(management);

      expect(() =>
        client.getWorkflowExecutions(
          { page: 1, size: 10, workflowId: 'watch-1' },
          'space-1',
          managedReader
        )
      ).toThrow(WorkflowsManagedReadForbiddenError);
    });
  });

  describe('listWaitingForInputSteps', () => {
    it('forwards the spaceId and params to management.listWaitingForInputSteps', async () => {
      const management = createManagementMock();
      const client = new WatchWorkflowsManagementClientImpl(management);

      await client.listWaitingForInputSteps('space-1', {
        includeReasoning: true,
        page: 2,
        perPage: 25,
      });

      expect(management.listWaitingForInputSteps).toHaveBeenCalledWith('space-1', {
        includeReasoning: true,
        page: 2,
        perPage: 25,
      });
    });

    it('returns the value from management.listWaitingForInputSteps', async () => {
      const management = createManagementMock();
      const listResult = {
        deletedWorkflowIds: new Set<string>(),
        reasoningByStepId: new Map<string, Record<string, unknown>>(),
        results: [],
        total: 0,
      };
      (management.listWaitingForInputSteps as jest.Mock).mockResolvedValue(listResult);
      const client = new WatchWorkflowsManagementClientImpl(management);

      const result = await client.listWaitingForInputSteps('space-1');

      expect(result).toBe(listResult);
    });
  });

  describe('resumeWorkflowExecution', () => {
    it('forwards all arguments to management.resumeWorkflowExecution', async () => {
      const management = createManagementMock();
      const request = {} as KibanaRequest;
      const input = { rationale: 'confirmed' };
      const options = { channel: 'inbox', stepExecutionId: 'step-1' };
      const client = new WatchWorkflowsManagementClientImpl(management);

      await client.resumeWorkflowExecution('execution-1', 'space-1', input, request, options);

      expect(management.resumeWorkflowExecution).toHaveBeenCalledWith(
        'execution-1',
        'space-1',
        input,
        request,
        options
      );
    });

    it('returns the value from management.resumeWorkflowExecution', async () => {
      const management = createManagementMock();
      const response = { status: 'resumed' };
      (management.resumeWorkflowExecution as jest.Mock).mockResolvedValue(response);
      const client = new WatchWorkflowsManagementClientImpl(management);

      const result = await client.resumeWorkflowExecution(
        'execution-1',
        'space-1',
        {},
        {} as KibanaRequest
      );

      expect(result).toBe(response);
    });
  });
});
