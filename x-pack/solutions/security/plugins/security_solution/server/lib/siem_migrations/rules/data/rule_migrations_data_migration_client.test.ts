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
import type { RuleMigrationsDataRulesClient } from './rule_migrations_data_rules_client';
import type { RuleMigrationsDataResourcesClient } from './rule_migrations_data_resources_client';

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

    test('should retrurn undefined if the migration is not found', async () => {
      const id = 'testId';
      const response = {
        _index: '.kibana-siem-rule-migrations',
        found: false,
      };

      (
        esClient.asInternalUser.get as unknown as jest.MockedFn<typeof GetApi>
      ).mockRejectedValueOnce({
        message: JSON.stringify(response),
      });

      const result = await ruleMigrationsDataMigrationClient.get({ id });

      expect(result).toBeUndefined();
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

  describe('delete', () => {
    const mockedRulesClient = {
      getIndexName: jest.fn().mockReturnValue('.mocked-rule-index'),
      get: jest.fn().mockReturnValue({ total: 2, data: [{ id: 'rule1' }, { id: 'rule2' }] }),
    } as unknown as jest.Mocked<RuleMigrationsDataRulesClient>;

    const mockedResourcesClient = {
      getIndexName: jest.fn().mockReturnValue('.mocked-resource-index'),
      get: jest.fn().mockReturnValue([{ id: 'resource1' }, { id: 'resource2' }]),
    } as unknown as jest.Mocked<RuleMigrationsDataResourcesClient>;

    beforeEach(() => jest.clearAllMocks());

    it('should delete the migration and associated rules and resources', async () => {
      const migrationId = 'testId';
      const index = '.kibana-siem-rule-migrations';

      await ruleMigrationsDataMigrationClient.delete({
        id: migrationId,
        rulesClient: mockedRulesClient,
        resourcesClient: mockedResourcesClient,
      });

      expect(mockedResourcesClient.getIndexName).toHaveBeenCalled();
      expect(mockedResourcesClient.get).toHaveBeenCalledWith(migrationId);

      expect(mockedRulesClient.getIndexName).toHaveBeenCalled();
      expect(mockedRulesClient.get).toHaveBeenCalledWith(migrationId);

      expect(esClient.asInternalUser.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        operations: [
          { delete: { _id: migrationId, _index: index } },
          { delete: { _id: 'rule1', _index: '.mocked-rule-index' } },
          { delete: { _id: 'rule2', _index: '.mocked-rule-index' } },
          { delete: { _id: 'resource1', _index: '.mocked-resource-index' } },
          { delete: { _id: 'resource2', _index: '.mocked-resource-index' } },
        ],
      });
    });
  });
});
