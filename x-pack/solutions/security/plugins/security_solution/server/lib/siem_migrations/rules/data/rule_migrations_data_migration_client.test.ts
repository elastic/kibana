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
import type SearchApi from '@elastic/elasticsearch/lib/api/api/search';

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

    test('should return undefined if the migration is not found', async () => {
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

  describe('prepareDelete', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should delete the migration and associated rules and resources', async () => {
      const migrationId = 'testId';
      const index = '.kibana-siem-rule-migrations';

      const operations = await ruleMigrationsDataMigrationClient.prepareDelete({
        id: migrationId,
      });

      expect(operations).toMatchObject([
        {
          delete: {
            _index: index,
            _id: migrationId,
          },
        },
      ]);
    });
  });

  describe('getAll', () => {
    it('should return all migrations', async () => {
      const response = {
        hits: {
          hits: [
            {
              _index: '.kibana-siem-rule-migrations',
              _id: '1',
              _source: {
                created_by: currentUser.profile_uid,
                created_at: new Date().toISOString(),
              },
            },
            {
              _index: '.kibana-siem-rule-migrations',
              _id: '2',
              _source: {
                created_by: currentUser.profile_uid,
                created_at: new Date().toISOString(),
              },
            },
          ],
        },
      } as unknown as ReturnType<typeof esClient.asInternalUser.search>;

      (
        esClient.asInternalUser.search as unknown as jest.MockedFn<typeof SearchApi>
      ).mockResolvedValueOnce(response);

      await ruleMigrationsDataMigrationClient.getAll();
      expect(esClient.asInternalUser.search).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        size: 10000,
        query: {
          match_all: {},
        },
        _source: true,
      });
    });
  });

  describe('updateLastExecution', () => {
    const connectorId = 'testConnector';
    it('should update `started_at` & `connector_id` when called saveAsStarted', async () => {
      const migrationId = 'testId';

      await ruleMigrationsDataMigrationClient.saveAsStarted({ id: migrationId, connectorId });

      expect(esClient.asInternalUser.update).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        id: migrationId,
        refresh: 'wait_for',
        doc: {
          last_execution: {
            started_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
            is_stopped: false,
            error: null,
            finished_at: null,
            connector_id: connectorId,
            skip_prebuilt_rules_matching: false,
          },
        },
        retry_on_conflict: 1,
      });
    });

    it('should update `finished_at` when called saveAsEnded', async () => {
      const migrationId = 'testId';

      await ruleMigrationsDataMigrationClient.saveAsFinished({ id: migrationId });

      expect(esClient.asInternalUser.update).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        id: migrationId,
        refresh: 'wait_for',
        doc: {
          last_execution: {
            finished_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          },
        },
        retry_on_conflict: 1,
      });
    });

    it('should update `is_stopped` correctly when called setIsStopped', async () => {
      const migrationId = 'testId';

      await ruleMigrationsDataMigrationClient.setIsStopped({ id: migrationId });

      expect(esClient.asInternalUser.update).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        id: migrationId,
        refresh: 'wait_for',
        doc: {
          last_execution: {
            is_stopped: true,
          },
        },
        retry_on_conflict: 1,
      });
    });

    it('should update `error` params correctly when called saveAsFailed', async () => {
      const migrationId = 'testId';

      await ruleMigrationsDataMigrationClient.saveAsFailed({
        id: migrationId,
        error: 'Test error',
      });

      expect(esClient.asInternalUser.update).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        id: migrationId,
        refresh: 'wait_for',
        doc: {
          last_execution: {
            error: 'Test error',
            finished_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          },
        },
        retry_on_conflict: 1,
      });
    });
  });
});
