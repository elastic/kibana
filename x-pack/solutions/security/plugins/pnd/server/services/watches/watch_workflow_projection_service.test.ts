/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import { WatchWorkflowProjectionService } from './watch_workflow_projection_service';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';

const workflowDefinition = {
  version: '1',
  name: 'Watch Officer',
  description: 'Description',
  enabled: true,
  tags: ['watch'],
  triggers: [{ type: 'scheduled', with: { every: '1h' } }],
  consts: { watch_policy: { autonomyLevel: 'manual', mode: 'always' } },
  steps: [],
};

const workflowListItem = {
  id: 'watch-officer',
  name: 'Watch Officer',
  description: 'Description',
  enabled: true,
  managed: false,
  createdAt: '2026-08-07T00:00:00.000Z',
  valid: true,
  definition: workflowDefinition,
};

const workflowDetail = {
  ...workflowListItem,
  createdBy: 'user',
  lastUpdatedAt: '2026-08-07T00:00:00.000Z',
  lastUpdatedBy: 'user',
  yaml: 'yaml',
};

const createService = () => {
  const management = {
    getWorkflows: jest.fn().mockResolvedValue({
      page: 1,
      size: 100,
      total: 1,
      results: [workflowListItem],
    }),
    getWorkflow: jest.fn().mockResolvedValue(workflowDetail),
    getWorkflowExecutions: jest.fn().mockResolvedValue({
      page: 1,
      size: 10,
      total: 0,
      results: [],
    }),
    getWorkflowExecution: jest.fn(),
  } as unknown as jest.Mocked<WatchWorkflowsManagementClient>;
  return {
    management,
    service: new WatchWorkflowProjectionService(management, loggerMock.create()),
  };
};

const createRequest = (authzResult: Record<string, boolean>) => {
  const request = httpServerMock.createKibanaRequest();
  Object.defineProperty(request, 'authzResult', { value: authzResult });
  return request;
};

describe('WatchWorkflowProjectionService', () => {
  it('passes only authorized execution-history options to the list query', async () => {
    const { management, service } = createService();
    const request = createRequest({
      [WorkflowsManagementApiActions.readExecution]: true,
      [WorkflowsManagementApiActions.readManagedExecution]: false,
    });

    await service.list(request, 'default');

    expect(management.getWorkflows).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['watch'], managedFilter: 'all' }),
      'default',
      { includeExecutionHistory: true, includeManagedExecutionHistory: false }
    );
  });

  it('does not fetch execution details without the optional privilege', async () => {
    const { management, service } = createService();

    const result = await service.get('watch-officer', 'default', createRequest({}));

    expect(result?.watch.id).toBe('watch-officer');
    expect(management.getWorkflowExecutions).not.toHaveBeenCalled();
    expect(management.getWorkflowExecution).not.toHaveBeenCalled();
  });
});
