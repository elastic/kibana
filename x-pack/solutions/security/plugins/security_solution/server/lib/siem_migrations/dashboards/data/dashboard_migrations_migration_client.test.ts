/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { DashboardMigrationsDataMigrationClient } from './dashboard_migrations_migration_client';
import type { AuthenticatedUser, IScopedClusterClient } from '@kbn/core/server';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import type IndexApi from '@elastic/elasticsearch/lib/api/api';
import expect from 'expect';
import type GetApi from '@elastic/elasticsearch/lib/api/api/get';
import type { GetGetResult } from '@elastic/elasticsearch/lib/api/types';
import type { DashboardMigration } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';

const INDEX_NAME = '.kibana-siem-dashboard-migrations';

describe('Dashboard Migrations Client', () => {
  let dashboardMigrationsDataMigrationClient: DashboardMigrationsDataMigrationClient;

  const esClientMock =
    elasticsearchServiceMock.createCustomClusterClient() as unknown as IScopedClusterClient;
  const logger = loggingSystemMock.createLogger();
  const indexNameProvider = jest.fn().mockResolvedValue(INDEX_NAME);
  const currentUser = {
    userName: 'testUser',
    profile_uid: 'testProfileUid',
  } as unknown as AuthenticatedUser;

  const dependencies = {} as unknown as SiemMigrationsClientDependencies;

  beforeEach(() => {
    dashboardMigrationsDataMigrationClient = new DashboardMigrationsDataMigrationClient(
      indexNameProvider,
      currentUser,
      esClientMock,
      logger,
      dependencies
    );
  });

  describe('create', () => {
    it('should be able to create a migration doc', async () => {
      const name = 'test name';

      const result = await dashboardMigrationsDataMigrationClient.create(name);

      expect(result).not.toBeFalsy();
      expect(esClientMock.asInternalUser.create).toHaveBeenCalledWith({
        refresh: 'wait_for',
        id: result,
        index: INDEX_NAME,
        document: {
          created_by: currentUser.profile_uid,
          created_at: expect.any(String),
          name,
        },
      });
    });

    it('should throw an error if create fails', async () => {
      (
        esClientMock.asInternalUser.create as unknown as jest.MockedFn<typeof IndexApi>
      ).mockRejectedValue(new Error('Create failed'));

      await expect(dashboardMigrationsDataMigrationClient.create('test name')).rejects.toThrow(
        'Create failed'
      );
    });
  });

  describe('get', () => {
    it('should be able to get a migration', async () => {
      const id = 'test-id';
      const mockResponse = {
        _id: id,
        _index: INDEX_NAME,
        _source: {
          created_by: currentUser.profile_uid,
          created_at: '2023-10-01T00:00:00Z',
          name: 'Test Migration',
        },
      } as GetGetResult<DashboardMigration>;

      (
        esClientMock.asInternalUser.get as unknown as jest.MockedFn<typeof GetApi>
      ).mockResolvedValue(mockResponse);

      const result = await dashboardMigrationsDataMigrationClient.get(id);
      expect(result).toEqual({
        id,
        created_by: currentUser.profile_uid,
        created_at: '2023-10-01T00:00:00Z',
        name: 'Test Migration',
      });

      expect(esClientMock.asInternalUser.get).toHaveBeenCalledWith({
        index: INDEX_NAME,
        id,
      });
    });

    it('should return undefined if the migration does not exist', async () => {
      const mockResponse = {
        _index: INDEX_NAME,
        found: false,
      };

      (
        esClientMock.asInternalUser.get as unknown as jest.MockedFn<typeof GetApi>
      ).mockRejectedValue({
        message: JSON.stringify(mockResponse),
      });

      const result = await dashboardMigrationsDataMigrationClient.get('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should throw an error if get fails', async () => {
      (
        esClientMock.asInternalUser.get as unknown as jest.MockedFn<typeof IndexApi>
      ).mockRejectedValue(new Error('Get failed'));

      await expect(dashboardMigrationsDataMigrationClient.get('test-id')).rejects.toThrow(
        'Get failed'
      );
    });
  });
});
