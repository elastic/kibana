/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';

import type { WatchWorkflowsManagementClient } from '../../../../../services/watches/watch_workflows_management_client';
import { fetchStepExecutions } from '.';

const createManagementClient = () =>
  ({
    getWorkflowExecution: jest.fn(),
  } as unknown as jest.Mocked<Pick<WatchWorkflowsManagementClient, 'getWorkflowExecution'>>);

describe('fetchStepExecutions', () => {
  it('returns an empty list when there are no run ids', async () => {
    const managementClient = createManagementClient();

    const result = await fetchStepExecutions({
      logger: loggerMock.create(),
      managementClient: managementClient as unknown as WatchWorkflowsManagementClient,
      runIds: [],
      spaceId: 'agent-3',
    });

    expect(result).toEqual([]);
    expect(managementClient.getWorkflowExecution).not.toHaveBeenCalled();
  });

  it('reads each run in the resolved space and flattens the step executions', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution
      .mockResolvedValueOnce({ stepExecutions: [{ id: 'se-1' }] } as never)
      .mockResolvedValueOnce({ stepExecutions: [{ id: 'se-2' }, { id: 'se-3' }] } as never);

    const result = await fetchStepExecutions({
      logger: loggerMock.create(),
      managementClient: managementClient as unknown as WatchWorkflowsManagementClient,
      runIds: ['run-deep', 'run-detection'],
      spaceId: 'agent-3',
    });

    expect(result.map((se) => se.id)).toEqual(['se-1', 'se-2', 'se-3']);
    expect(managementClient.getWorkflowExecution).toHaveBeenCalledWith('run-deep', 'agent-3', {
      includeOutput: true,
    });
    expect(managementClient.getWorkflowExecution).toHaveBeenCalledWith('run-detection', 'agent-3', {
      includeOutput: true,
    });
  });

  it('treats a missing execution as an empty contribution', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue(null as never);

    const result = await fetchStepExecutions({
      logger: loggerMock.create(),
      managementClient: managementClient as unknown as WatchWorkflowsManagementClient,
      runIds: ['run-deep'],
      spaceId: 'agent-3',
    });

    expect(result).toEqual([]);
  });

  it('degrades a per-run failure to an empty contribution without failing the rest', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ stepExecutions: [{ id: 'se-ok' }] } as never);

    const result = await fetchStepExecutions({
      logger: loggerMock.create(),
      managementClient: managementClient as unknown as WatchWorkflowsManagementClient,
      runIds: ['run-bad', 'run-ok'],
      spaceId: 'agent-3',
    });

    expect(result.map((se) => se.id)).toEqual(['se-ok']);
  });

  it('forwards the request on each execution read when one is supplied', async () => {
    const managementClient = createManagementClient();
    managementClient.getWorkflowExecution.mockResolvedValue({ stepExecutions: [] } as never);
    const request = { authzResult: {} } as never;

    await fetchStepExecutions({
      logger: loggerMock.create(),
      managementClient: managementClient as unknown as WatchWorkflowsManagementClient,
      request,
      runIds: ['run-deep'],
      spaceId: 'agent-3',
    });

    expect(managementClient.getWorkflowExecution).toHaveBeenCalledWith('run-deep', 'agent-3', {
      includeOutput: true,
      request,
    });
  });
});
