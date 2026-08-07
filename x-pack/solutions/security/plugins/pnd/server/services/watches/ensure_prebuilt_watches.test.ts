/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { PREBUILT_WATCH_IDS } from '@kbn/pnd-common';
import { ensurePrebuiltWatches } from './ensure_prebuilt_watches';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';

describe('ensurePrebuiltWatches', () => {
  it('creates each missing watch as a user-owned workflow', async () => {
    const management = {
      getWorkflow: jest.fn().mockResolvedValue(null),
      createWorkflow: jest.fn().mockResolvedValue({ enabled: false }),
      updateWorkflow: jest.fn().mockResolvedValue({ valid: true, validationErrors: [] }),
    } as unknown as jest.Mocked<WatchWorkflowsManagementClient>;

    const result = await ensurePrebuiltWatches({
      management,
      spaceId: 'default',
      request: httpServerMock.createKibanaRequest(),
      logger: loggerMock.create(),
    });

    expect(management.createWorkflow.mock.calls.map(([workflow]) => workflow.id)).toEqual(
      PREBUILT_WATCH_IDS
    );
    expect(management.updateWorkflow.mock.calls.map(([id, update]) => [id, update])).toEqual(
      PREBUILT_WATCH_IDS.map((id) => [id, { enabled: true }])
    );
    expect(result.created).toEqual(PREBUILT_WATCH_IDS);
  });

  it('reports occupied ids and continues so another space gets an empty list', async () => {
    const logger = loggerMock.create();
    const management = {
      getWorkflow: jest.fn().mockResolvedValue(null),
      createWorkflow: jest.fn().mockRejectedValue(new Error('Workflow already exists')),
      updateWorkflow: jest.fn(),
    } as unknown as jest.Mocked<WatchWorkflowsManagementClient>;

    const result = await ensurePrebuiltWatches({
      management,
      spaceId: 'another-space',
      request: httpServerMock.createKibanaRequest(),
      logger,
    });

    expect(result.failed).toEqual(PREBUILT_WATCH_IDS);
    expect(logger.error).toHaveBeenCalledTimes(PREBUILT_WATCH_IDS.length);
  });

  it('treats a concurrent create in the same space as an existing starting point', async () => {
    const management = {
      getWorkflow: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: PREBUILT_WATCH_IDS[0] })
        .mockResolvedValue({ id: 'existing' }),
      createWorkflow: jest.fn().mockRejectedValue(new Error('Workflow already exists')),
      updateWorkflow: jest.fn(),
    } as unknown as jest.Mocked<WatchWorkflowsManagementClient>;

    const result = await ensurePrebuiltWatches({
      management,
      spaceId: 'default',
      request: httpServerMock.createKibanaRequest(),
      logger: loggerMock.create(),
    });

    expect(result.failed).toEqual([]);
    expect(result.existing).toEqual(PREBUILT_WATCH_IDS);
  });

  it('surfaces a starting point that was created but could not be enabled', async () => {
    const management = {
      getWorkflow: jest.fn().mockResolvedValue(null),
      createWorkflow: jest.fn().mockResolvedValue({ enabled: false }),
      updateWorkflow: jest.fn().mockResolvedValue({
        valid: false,
        validationErrors: ['Invalid trigger'],
      }),
    } as unknown as jest.Mocked<WatchWorkflowsManagementClient>;

    const result = await ensurePrebuiltWatches({
      management,
      spaceId: 'default',
      request: httpServerMock.createKibanaRequest(),
      logger: loggerMock.create(),
    });

    expect(result.created).toEqual([]);
    expect(result.failed).toEqual(PREBUILT_WATCH_IDS);
  });
});
