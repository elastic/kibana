/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { WorkflowMigrationsDataClient } from './workflow_migrations_data_client';
import { WorkflowMigrationsDataWorkflowsClient } from './workflow_migrations_data_workflows_client';

jest.mock('./workflow_migrations_data_workflows_client');

const mockedWorkflowsClient = {
  prepareDelete: jest
    .fn()
    .mockResolvedValue([{ delete: { _id: 'workflow1', _index: '.mocked-workflows-index' } }]),
} as unknown as jest.Mocked<WorkflowMigrationsDataWorkflowsClient>;

const mockIndexNameProviders = {
  migrations: jest.fn().mockResolvedValue('.mocked-migration-index'),
  workflows: jest.fn().mockResolvedValue('.mocked-workflows-index'),
};

const mockCurrentUser = {
  username: 'testUser',
  profile_uid: 'testProfileUid',
} as unknown as AuthenticatedUser;

const mockEsClient = {
  asInternalUser: {
    bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
  },
} as unknown as jest.Mocked<IScopedClusterClient>;

const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
} as unknown as jest.Mocked<Logger>;

const mockDependencies = {} as unknown as jest.Mocked<SiemMigrationsClientDependencies>;

describe('WorkflowMigrationsDataClient', () => {
  beforeEach(() => {
    (WorkflowMigrationsDataWorkflowsClient as unknown as jest.Mock).mockImplementation(
      () => mockedWorkflowsClient
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteMigration', () => {
    const migrationId = 'testId';

    const createDataClient = () =>
      new WorkflowMigrationsDataClient(
        mockIndexNameProviders,
        mockCurrentUser,
        mockEsClient,
        mockLogger,
        mockDependencies
      );

    it('deletes the migration and its stored workflows', async () => {
      const dataClient = createDataClient();

      await dataClient.deleteMigration(migrationId);

      expect(mockEsClient.asInternalUser.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        operations: [
          { delete: { _id: migrationId, _index: '.mocked-migration-index' } },
          { delete: { _id: 'workflow1', _index: '.mocked-workflows-index' } },
        ],
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('rejects when the bulk response reports item errors', async () => {
      (mockEsClient.asInternalUser.bulk as jest.Mock).mockResolvedValueOnce({
        errors: true,
        items: [{ delete: { error: { reason: 'index write blocked' } } }],
      });
      const dataClient = createDataClient();

      await expect(dataClient.deleteMigration(migrationId)).rejects.toThrow('index write blocked');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting migration testId: Error: index write blocked'
      );
    });
  });
});
