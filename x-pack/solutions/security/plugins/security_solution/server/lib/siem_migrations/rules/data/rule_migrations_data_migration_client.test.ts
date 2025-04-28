/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { SiemRuleMigrationsClientDependencies } from '../types';
import { RuleMigrationsDataMigrationClient } from './rule_migrations_data_migration_client';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type IndexApi from '@elastic/elasticsearch/lib/api/api';
import type GetApi from '@elastic/elasticsearch/lib/api/api/get';

describe('RuleMigrationsDataMigrationClient', () => {
  let ruleMigrationsDataMigrationClient: RuleMigrationsDataMigrationClient;
  const esClient =
    elasticsearchServiceMock.createCustomClusterClient() as unknown as IScopedClusterClient;

  const logger = loggingSystemMock.createLogger();
  const indexNameProvider = jest.fn().mockReturnValue('.kibana-siem-rule-migrations');
  const currentUser = {
    userName: 'testUser',
    profile_uid: 'testProfileUid',
  } as unknown as AuthenticatedUser;
  const dependencies = {} as unknown as SiemRuleMigrationsClientDependencies;

  beforeEach(() => {
    ruleMigrationsDataMigrationClient = new RuleMigrationsDataMigrationClient(
      indexNameProvider,
      currentUser,
      esClient,
      logger,
      dependencies
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('should create a new migration', async () => {
      const index = '.kibana-siem-rule-migrations';

      const result = await ruleMigrationsDataMigrationClient.create();

      expect(result).not.toBeFalsy();
      expect(esClient.asInternalUser.create).toHaveBeenCalledWith({
        refresh: 'wait_for',
        id: result,
        index,
        document: {
          created_by: currentUser.profile_uid,
          created_at: expect.any(String),
        },
      });
    });

    test('should throw an error if an error occurs', async () => {
      (
        esClient.asInternalUser.create as unknown as jest.MockedFn<typeof IndexApi>
      ).mockRejectedValueOnce(new Error('Test error'));

      await expect(ruleMigrationsDataMigrationClient.create()).rejects.toThrow('Test error');

      expect(esClient.asInternalUser.create).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    test('should get a migration', async () => {
      const index = '.kibana-siem-rule-migrations';
      const id = 'testId';
      const response = {
        _index: index,
        found: true,
        _source: {
          created_by: currentUser.profile_uid,
          created_at: new Date().toISOString(),
        },
        _id: id,
      };

      (
        esClient.asInternalUser.get as unknown as jest.MockedFn<typeof GetApi>
      ).mockResolvedValueOnce(response);

      const result = await ruleMigrationsDataMigrationClient.get({ id });

      expect(result).toEqual({
        ...response._source,
        id: response._id,
      });
    });
    test('should throw an error if an error occurs', async () => {
      const id = 'testId';
      (
        esClient.asInternalUser.get as unknown as jest.MockedFn<typeof GetApi>
      ).mockRejectedValueOnce(new Error('Test error'));

      await expect(ruleMigrationsDataMigrationClient.get({ id })).rejects.toThrow('Test error');

      expect(esClient.asInternalUser.get).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(`Error getting migration ${id}: Error: Test error`);
    });
  });
});
