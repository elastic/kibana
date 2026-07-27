/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, securityServiceMock } from '@kbn/core/server/mocks';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import { WorkflowMigrationsTaskClient } from './workflow_migrations_task_client';
import type { WorkflowMigrationsDataClient } from '../data/workflow_migrations_data_client';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { httpServerMock } from '@kbn/core/server/mocks';

jest.mock('./workflow_migrations_task_runner', () => ({
  WorkflowMigrationTaskRunner: jest.fn().mockImplementation(() => ({
    setup: jest.fn().mockResolvedValue(undefined),
    run: jest.fn().mockResolvedValue(undefined),
    abortController: new AbortController(),
  })),
}));

describe('WorkflowMigrationsTaskClient', () => {
  const logger = loggingSystemMock.createLogger();
  const currentUser = securityServiceMock.createMockAuthenticatedUser();
  const request = httpServerMock.createKibanaRequest();
  const migrationsRunning = new Map();

  const dataClient = {
    items: {
      updateStatus: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockResolvedValue({
        items: { total: 2, pending: 2, processing: 0, completed: 0, failed: 0 },
        vendor: 'tines',
      }),
    },
    migrations: {
      saveAsStarted: jest.fn().mockResolvedValue(undefined),
      saveAsFinished: jest.fn().mockResolvedValue(undefined),
      saveAsFailed: jest.fn().mockResolvedValue(undefined),
      setIsStopped: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      getAll: jest.fn(),
    },
  } as unknown as WorkflowMigrationsDataClient;

  const dependencies = {} as SiemMigrationsClientDependencies;

  let client: WorkflowMigrationsTaskClient;

  beforeEach(() => {
    jest.clearAllMocks();
    migrationsRunning.clear();
    client = new WorkflowMigrationsTaskClient(
      migrationsRunning,
      logger,
      dataClient,
      request,
      currentUser,
      dependencies
    );
  });

  it('starts a migration when pending items exist', async () => {
    const result = await client.start({
      migrationId: 'mig-1',
      connectorId: 'connector-1',
      invocationConfig: {},
    });

    expect(result).toEqual({ exists: true, started: true });
    expect(dataClient.items.updateStatus).toHaveBeenCalledWith(
      'mig-1',
      { status: SiemMigrationStatus.PROCESSING },
      SiemMigrationStatus.PENDING,
      { refresh: true }
    );
    expect(dataClient.migrations.saveAsStarted).toHaveBeenCalled();
    expect(migrationsRunning.has('mig-1')).toBe(true);
  });

  it('does not start when already running', async () => {
    migrationsRunning.set('mig-1', {} as never);

    const result = await client.start({
      migrationId: 'mig-1',
      connectorId: 'connector-1',
      invocationConfig: {},
    });

    expect(result).toEqual({ exists: true, started: false });
  });

  it('does not start when there are no items', async () => {
    (dataClient.items.getStats as jest.Mock).mockResolvedValueOnce({
      items: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 },
    });

    const result = await client.start({
      migrationId: 'mig-1',
      connectorId: 'connector-1',
      invocationConfig: {},
    });

    expect(result).toEqual({ exists: false, started: false });
  });

  it('stops a running migration', async () => {
    const abortController = new AbortController();
    migrationsRunning.set('mig-1', { abortController } as never);

    const result = await client.stop('mig-1');

    expect(result).toEqual({ exists: true, stopped: true });
    expect(abortController.signal.aborted).toBe(true);
    expect(dataClient.migrations.setIsStopped).toHaveBeenCalledWith({ id: 'mig-1' });
  });
});
