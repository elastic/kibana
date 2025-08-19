/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { RuleMigrationsDataRulesClient } from './rule_migrations_data_rules_client';
import {
  SiemMigrationStatus,
  RuleTranslationResult,
} from '../../../../../common/siem_migrations/constants';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import type { AddRuleMigrationRulesInput } from './rule_migrations_data_rules_client';
import type { StoredRuleMigration } from '../types';
import { SIEM_RULE_MIGRATION_INDEX_PATTERN_PLACEHOLDER } from '../constants';
import { conditions } from './search';

describe('RuleMigrationsDataRulesClient', () => {
  let ruleMigrationsDataRulesClient: RuleMigrationsDataRulesClient;
  const esClient =
    elasticsearchServiceMock.createCustomClusterClient() as unknown as IScopedClusterClient;
  const logger = loggingSystemMock.createLogger();
  const indexNameProvider = jest.fn().mockReturnValue('.kibana-siem-rule-migrations');
  const currentUser = {
    userName: 'testUser',
    profile_uid: 'testProfileUid',
  } as unknown as AuthenticatedUser;
  const dependencies = {} as unknown as SiemMigrationsClientDependencies;

  beforeEach(() => {
    ruleMigrationsDataRulesClient = new RuleMigrationsDataRulesClient(
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
    test('should create rule migrations in bulk', async () => {
      const ruleMigrations: AddRuleMigrationRulesInput[] = [
        {
          migration_id: 'migration1',
          original_rule: {
            id: 'rule1',
            vendor: 'splunk',
            title: 'Test Rule 1',
            description: 'Test description 1',
            query: 'test query 1',
            query_language: 'spl',
          },
          elastic_rule: {
            id: 'elastic_rule1',
            title: 'Elastic Rule 1',
            query: 'elastic query 1',
          },
        },
        {
          migration_id: 'migration1',
          original_rule: {
            id: 'rule2',
            vendor: 'splunk',
            title: 'Test Rule 2',
            description: 'Test description 2',
            query: 'test query 2',
            query_language: 'spl',
          },
          elastic_rule: {
            id: 'elastic_rule2',
            title: 'Elastic Rule 2',
            query: 'elastic query 2',
          },
        },
      ];

      await ruleMigrationsDataRulesClient.create(ruleMigrations);

      expect(esClient.asInternalUser.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        operations: [
          { create: { _index: '.kibana-siem-rule-migrations' } },
          {
            migration_id: 'migration1',
            original_rule: {
              id: 'rule1',
              vendor: 'splunk',
              title: 'Test Rule 1',
              description: 'Test description 1',
              query: 'test query 1',
              query_language: 'spl',
            },
            elastic_rule: {
              id: 'elastic_rule1',
              title: 'Elastic Rule 1',
              query: 'elastic query 1',
            },
            '@timestamp': expect.any(String),
            status: SiemMigrationStatus.PENDING,
            created_by: 'testProfileUid',
            updated_by: 'testProfileUid',
            updated_at: expect.any(String),
          },
          { create: { _index: '.kibana-siem-rule-migrations' } },
          {
            migration_id: 'migration1',
            original_rule: {
              id: 'rule2',
              vendor: 'splunk',
              title: 'Test Rule 2',
              description: 'Test description 2',
              query: 'test query 2',
              query_language: 'spl',
            },
            elastic_rule: {
              id: 'elastic_rule2',
              title: 'Elastic Rule 2',
              query: 'elastic query 2',
            },
            '@timestamp': expect.any(String),
            status: SiemMigrationStatus.PENDING,
            created_by: 'testProfileUid',
            updated_by: 'testProfileUid',
            updated_at: expect.any(String),
          },
        ],
      });
    });

    test('should handle bulk operations in chunks', async () => {
      const ruleMigrations: AddRuleMigrationRulesInput[] = Array.from({ length: 600 }, (_, i) => ({
        migration_id: 'migration1',
        original_rule: {
          id: `rule${i}`,
          vendor: 'splunk',
          title: `Test Rule ${i}`,
          description: `Test description ${i}`,
          query: `test query ${i}`,
          query_language: 'spl',
        },
        elastic_rule: {
          id: `elastic_rule${i}`,
          title: `Elastic Rule ${i}`,
          query: `elastic query ${i}`,
        },
      }));

      await ruleMigrationsDataRulesClient.create(ruleMigrations);

      expect(esClient.asInternalUser.bulk).toHaveBeenCalledTimes(2);
    });
  });

  describe('update', () => {
    test('should update rule migrations in bulk', async () => {
      const ruleMigrations = [
        {
          id: 'doc1',
          status: SiemMigrationStatus.COMPLETED,
          translation_result: RuleTranslationResult.FULL,
        },
        {
          id: 'doc2',
          status: SiemMigrationStatus.FAILED,
          translation_result: RuleTranslationResult.UNTRANSLATABLE,
        },
      ];

      await ruleMigrationsDataRulesClient.update(ruleMigrations);

      expect(esClient.asInternalUser.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        operations: [
          { update: { _index: '.kibana-siem-rule-migrations', _id: 'doc1' } },
          {
            doc: {
              status: SiemMigrationStatus.COMPLETED,
              translation_result: RuleTranslationResult.FULL,
              updated_by: 'testProfileUid',
              updated_at: expect.any(String),
            },
          },
          { update: { _index: '.kibana-siem-rule-migrations', _id: 'doc2' } },
          {
            doc: {
              status: SiemMigrationStatus.FAILED,
              translation_result: RuleTranslationResult.UNTRANSLATABLE,
              updated_by: 'testProfileUid',
              updated_at: expect.any(String),
            },
          },
        ],
      });
    });

    test('should throw an error if bulk update fails', async () => {
      const ruleMigrations = [
        {
          id: 'doc1',
          status: SiemMigrationStatus.COMPLETED,
        },
      ];

      const error = new Error('Bulk update failed');
      esClient.asInternalUser.bulk = jest.fn().mockRejectedValue(error);

      await expect(ruleMigrationsDataRulesClient.update(ruleMigrations)).rejects.toThrow(
        'Bulk update failed'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error updating rule migrations: Bulk update failed'
      );
    });
  });

  describe('get', () => {
    test('should retrieve rule migrations with filters', async () => {
      const migrationId = 'migration1';
      const mockResponse: SearchResponse<RuleMigrationRule> = {
        hits: {
          total: { value: 2 },
          hits: [
            {
              _id: 'doc1',
              _source: {
                migration_id: 'migration1',
                original_rule: {
                  id: 'rule1',
                  vendor: 'splunk',
                  title: 'Test Rule 1',
                  description: 'Test description 1',
                  query: 'test query 1',
                  query_language: 'spl',
                },
                elastic_rule: {
                  id: 'elastic_rule1',
                  title: 'Elastic Rule 1',
                  query: 'elastic query 1',
                },
                status: SiemMigrationStatus.COMPLETED,
              },
            },
            {
              _id: 'doc2',
              _source: {
                migration_id: 'migration1',
                original_rule: {
                  id: 'rule2',
                  vendor: 'splunk',
                  title: 'Test Rule 2',
                  description: 'Test description 2',
                  query: 'test query 2',
                  query_language: 'spl',
                },
                elastic_rule: {
                  id: 'elastic_rule2',
                  title: 'Elastic Rule 2',
                  query: 'elastic query 2',
                },
                status: SiemMigrationStatus.PENDING,
              },
            },
          ],
        },
      } as SearchResponse<RuleMigrationRule>;

      esClient.asInternalUser.search = jest.fn().mockResolvedValue(mockResponse);

      const result = await ruleMigrationsDataRulesClient.get(migrationId, {
        filters: { status: SiemMigrationStatus.COMPLETED },
        sort: { sortField: 'elastic_rule.title', sortDirection: 'asc' },
        from: 0,
        size: 10,
      });

      expect(result).toEqual({
        total: 2,
        data: [
          {
            id: 'doc1',
            migration_id: 'migration1',
            original_rule: {
              id: 'rule1',
              vendor: 'splunk',
              title: 'Test Rule 1',
              description: 'Test description 1',
              query: 'test query 1',
              query_language: 'spl',
            },
            elastic_rule: {
              id: 'elastic_rule1',
              title: 'Elastic Rule 1',
              query: 'elastic query 1',
            },
            status: SiemMigrationStatus.COMPLETED,
          },
          {
            id: 'doc2',
            migration_id: 'migration1',
            original_rule: {
              id: 'rule2',
              vendor: 'splunk',
              title: 'Test Rule 2',
              description: 'Test description 2',
              query: 'test query 2',
              query_language: 'spl',
            },
            elastic_rule: {
              id: 'elastic_rule2',
              title: 'Elastic Rule 2',
              query: 'elastic query 2',
            },
            status: SiemMigrationStatus.PENDING,
          },
        ],
      });
    });

    test('should throw an error if search fails', async () => {
      const migrationId = 'migration1';
      const error = new Error('Search failed');
      esClient.asInternalUser.search = jest.fn().mockRejectedValue(error);

      await expect(ruleMigrationsDataRulesClient.get(migrationId)).rejects.toThrow('Search failed');
      expect(logger.error).toHaveBeenCalledWith('Error searching rule migrations: Search failed');
    });
  });

  describe('saveProcessing', () => {
    test('should update rule migration status to processing', async () => {
      const id = 'doc1';

      await ruleMigrationsDataRulesClient.saveProcessing(id);

      expect(esClient.asInternalUser.update).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        id: 'doc1',
        doc: {
          status: SiemMigrationStatus.PROCESSING,
          updated_by: 'testProfileUid',
          updated_at: expect.any(String),
        },
        refresh: 'wait_for',
      });
    });
  });

  describe('saveCompleted', () => {
    test('should update rule migration status to completed', async () => {
      const ruleMigration = {
        id: 'doc1',
        migration_id: 'migration1',
        original_rule: {
          id: 'rule1',
          vendor: 'splunk',
          title: 'Test Rule',
          description: 'Test description',
          query: 'test query',
          query_language: 'spl',
        },
        elastic_rule: {
          id: 'elastic_rule1',
          title: 'Elastic Rule',
          query: 'elastic query',
        },
        status: SiemMigrationStatus.PROCESSING,
        translation_result: RuleTranslationResult.FULL,
        '@timestamp': '2025-08-04T00:00:00.000Z',
        created_by: 'testProfileUid',
      };

      await ruleMigrationsDataRulesClient.saveCompleted(ruleMigration as StoredRuleMigration);

      expect(esClient.asInternalUser.update).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        id: 'doc1',
        doc: {
          migration_id: 'migration1',
          original_rule: {
            id: 'rule1',
            vendor: 'splunk',
            title: 'Test Rule',
            description: 'Test description',
            query: 'test query',
            query_language: 'spl',
          },
          elastic_rule: {
            id: 'elastic_rule1',
            title: 'Elastic Rule',
            query: 'elastic query',
          },
          status: SiemMigrationStatus.COMPLETED,
          translation_result: RuleTranslationResult.FULL,
          '@timestamp': '2025-08-04T00:00:00.000Z',
          created_by: 'testProfileUid',
          updated_by: 'testProfileUid',
          updated_at: expect.any(String),
        },
        refresh: 'wait_for',
      });
    });
  });

  describe('saveError', () => {
    test('should update rule migration status to failed', async () => {
      const ruleMigration = {
        id: 'doc1',
        migration_id: 'migration1',
        original_rule: {
          id: 'rule1',
          vendor: 'splunk',
          title: 'Test Rule',
          description: 'Test description',
          query: 'test query',
          query_language: 'spl',
        },
        elastic_rule: {
          id: 'elastic_rule1',
          title: 'Elastic Rule',
          query: 'elastic query',
        },
        status: SiemMigrationStatus.PROCESSING,
        error: 'Translation failed',
        '@timestamp': '2025-08-04T00:00:00.000Z',
        created_by: 'testProfileUid',
      };

      await ruleMigrationsDataRulesClient.saveError(ruleMigration as StoredRuleMigration);

      expect(esClient.asInternalUser.update).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        id: 'doc1',
        doc: {
          migration_id: 'migration1',
          original_rule: {
            id: 'rule1',
            vendor: 'splunk',
            title: 'Test Rule',
            description: 'Test description',
            query: 'test query',
            query_language: 'spl',
          },
          elastic_rule: {
            id: 'elastic_rule1',
            title: 'Elastic Rule',
            query: 'elastic query',
          },
          status: SiemMigrationStatus.FAILED,
          error: 'Translation failed',
          '@timestamp': '2025-08-04T00:00:00.000Z',
          created_by: 'testProfileUid',
          updated_by: 'testProfileUid',
          updated_at: expect.any(String),
        },
        refresh: 'wait_for',
      });
    });
  });

  describe('releaseProcessing', () => {
    test('should update processing rules back to pending', async () => {
      const migrationId = 'migration1';

      await ruleMigrationsDataRulesClient.releaseProcessing(migrationId);

      expect(esClient.asInternalUser.updateByQuery).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        query: {
          bool: {
            filter: [
              { term: { migration_id: 'migration1' } },
              { term: { status: SiemMigrationStatus.PROCESSING } },
            ],
          },
        },
        script: { source: "ctx._source['status'] = 'pending'" },
        refresh: false,
      });
    });
  });

  describe('updateStatus', () => {
    test('should update rule migration status with filters', async () => {
      const migrationId = 'migration1';
      const filter = { status: SiemMigrationStatus.PENDING };
      const statusToUpdate = SiemMigrationStatus.PROCESSING;

      await ruleMigrationsDataRulesClient.updateStatus(migrationId, filter, statusToUpdate, {
        refresh: true,
      });

      expect(esClient.asInternalUser.updateByQuery).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        query: {
          bool: {
            filter: [
              { term: { migration_id: 'migration1' } },
              { term: { status: SiemMigrationStatus.PENDING } },
            ],
          },
        },
        script: { source: "ctx._source['status'] = 'processing'" },
        refresh: true,
      });
    });

    test('should throw an error if updateByQuery fails', async () => {
      const migrationId = 'migration1';
      const error = new Error('UpdateByQuery failed');
      esClient.asInternalUser.updateByQuery = jest.fn().mockRejectedValue(error);

      await expect(
        ruleMigrationsDataRulesClient.updateStatus(migrationId, {}, SiemMigrationStatus.COMPLETED)
      ).rejects.toThrow('UpdateByQuery failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error updating rule migrations status: UpdateByQuery failed'
      );
    });
  });

  describe('getTranslationStats', () => {
    test('should return translation stats', async () => {
      const migrationId = 'migration1';
      const mockResponse = {
        hits: { total: { value: 10 } },
        aggregations: {
          success: {
            doc_count: 8,
            result: {
              buckets: [
                { key: RuleTranslationResult.FULL, doc_count: 5 },
                { key: RuleTranslationResult.PARTIAL, doc_count: 2 },
                { key: RuleTranslationResult.UNTRANSLATABLE, doc_count: 1 },
              ],
            },
            installable: { doc_count: 6 },
            prebuilt: { doc_count: 4 },
            missing_index: { doc_count: 2 },
          },
          failed: { doc_count: 2 },
        },
      };

      esClient.asInternalUser.search = jest.fn().mockResolvedValue(mockResponse);

      const result = await ruleMigrationsDataRulesClient.getTranslationStats(migrationId);

      expect(result).toEqual({
        id: 'migration1',
        rules: {
          total: 10,
          success: {
            total: 8,
            result: {
              [RuleTranslationResult.FULL]: 5,
              [RuleTranslationResult.PARTIAL]: 2,
              [RuleTranslationResult.UNTRANSLATABLE]: 1,
            },
            installable: 6,
            prebuilt: 4,
            missing_index: 2,
          },
          failed: 2,
        },
      });
    });

    test('should throw an error if search fails', async () => {
      const migrationId = 'migration1';
      const error = new Error('Search failed');
      esClient.asInternalUser.search = jest.fn().mockRejectedValue(error);

      await expect(ruleMigrationsDataRulesClient.getTranslationStats(migrationId)).rejects.toThrow(
        'Search failed'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting rule migrations stats: Search failed'
      );
    });
  });

  describe('getStats', () => {
    test('should return migration stats', async () => {
      const migrationId = 'migration1';
      const mockResponse = {
        hits: { total: { value: 10 } },
        aggregations: {
          status: {
            buckets: [
              { key: SiemMigrationStatus.PENDING, doc_count: 3 },
              { key: SiemMigrationStatus.PROCESSING, doc_count: 2 },
              { key: SiemMigrationStatus.COMPLETED, doc_count: 4 },
              { key: SiemMigrationStatus.FAILED, doc_count: 1 },
            ],
          },
          createdAt: { value_as_string: '2025-01-01T00:00:00.000Z' },
          lastUpdatedAt: { value_as_string: '2025-01-02T00:00:00.000Z' },
        },
      };

      esClient.asInternalUser.search = jest.fn().mockResolvedValue(mockResponse);

      const result = await ruleMigrationsDataRulesClient.getStats(migrationId);

      expect(result).toEqual({
        id: 'migration1',
        rules: {
          total: 10,
          [SiemMigrationStatus.PENDING]: 3,
          [SiemMigrationStatus.PROCESSING]: 2,
          [SiemMigrationStatus.COMPLETED]: 4,
          [SiemMigrationStatus.FAILED]: 1,
        },
        created_at: '2025-01-01T00:00:00.000Z',
        last_updated_at: '2025-01-02T00:00:00.000Z',
      });
    });
  });

  describe('getAllStats', () => {
    test('should return all migrations stats', async () => {
      const mockResponse = {
        aggregations: {
          migrationIds: {
            buckets: [
              {
                key: 'migration1',
                doc_count: 5,
                status: {
                  buckets: [
                    { key: SiemMigrationStatus.COMPLETED, doc_count: 3 },
                    { key: SiemMigrationStatus.FAILED, doc_count: 2 },
                  ],
                },
                createdAt: { value_as_string: '2025-08-04T00:00:00.000Z' },
                lastUpdatedAt: { value_as_string: '2025-08-04T00:00:00.000Z' },
              },
            ],
          },
        },
      };

      esClient.asInternalUser.search = jest.fn().mockResolvedValue(mockResponse);

      const result = await ruleMigrationsDataRulesClient.getAllStats();

      expect(result).toEqual([
        {
          id: 'migration1',
          rules: {
            total: 5,
            [SiemMigrationStatus.PENDING]: 0,
            [SiemMigrationStatus.PROCESSING]: 0,
            [SiemMigrationStatus.COMPLETED]: 3,
            [SiemMigrationStatus.FAILED]: 2,
          },
          created_at: '2025-08-04T00:00:00.000Z',
          last_updated_at: '2025-08-04T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('getAllIntegrationsStats', () => {
    test('should return integrations stats', async () => {
      const mockResponse = {
        aggregations: {
          integrationIds: {
            buckets: [
              { key: 'integration1', doc_count: 10 },
              { key: 'integration2', doc_count: 5 },
            ],
          },
        },
      };

      esClient.asInternalUser.search = jest.fn().mockResolvedValue(mockResponse);

      const result = await ruleMigrationsDataRulesClient.getAllIntegrationsStats();

      expect(result).toEqual([
        { id: 'integration1', total_rules: 10 },
        { id: 'integration2', total_rules: 5 },
      ]);
    });
  });

  describe('prepareDelete', () => {
    test('should prepare bulk delete operations', async () => {
      const migrationId = 'migration1';
      const mockGetResponse = {
        total: 2,
        data: [
          {
            id: 'doc1',
            migration_id: 'migration1',
            original_rule: {
              id: 'rule1',
              vendor: 'splunk',
              title: 'Test Rule 1',
              description: 'Test description 1',
              query: 'test query 1',
              query_language: 'spl',
            },
            elastic_rule: {
              id: 'elastic_rule1',
              title: 'Elastic Rule 1',
              query: 'elastic query 1',
            },
            status: SiemMigrationStatus.COMPLETED,
            '@timestamp': '2025-08-04T00:00:00.000Z',
            created_by: 'testProfileUid',
          },
          {
            id: 'doc2',
            migration_id: 'migration1',
            original_rule: {
              id: 'rule2',
              vendor: 'splunk',
              title: 'Test Rule 2',
              description: 'Test description 2',
              query: 'test query 2',
              query_language: 'spl',
            },
            elastic_rule: {
              id: 'elastic_rule2',
              title: 'Elastic Rule 2',
              query: 'elastic query 2',
            },
            status: SiemMigrationStatus.PENDING,
            '@timestamp': '2025-08-04T00:00:00.000Z',
            created_by: 'testProfileUid',
          },
        ] as StoredRuleMigration[],
      };
      jest.spyOn(ruleMigrationsDataRulesClient, 'get').mockResolvedValue(mockGetResponse);

      const result = await ruleMigrationsDataRulesClient.prepareDelete(migrationId);

      expect(result).toEqual([
        { delete: { _id: 'doc1', _index: '.kibana-siem-rule-migrations' } },
        { delete: { _id: 'doc2', _index: '.kibana-siem-rule-migrations' } },
      ]);
    });
  });

  describe('updateIndexPattern', () => {
    test('should update index pattern for specific rule IDs', async () => {
      const id = 'migration1';
      const indexPattern = 'new-index-*';
      const translatedRuleIds = ['rule1', 'rule2'];
      const mockResponse = { updated: 2 };

      esClient.asInternalUser.updateByQuery = jest.fn().mockResolvedValue(mockResponse);

      const result = await ruleMigrationsDataRulesClient.updateIndexPattern(
        id,
        indexPattern,
        translatedRuleIds
      );

      expect(esClient.asInternalUser.updateByQuery).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        script: {
          source: expect.stringContaining(
            `def originalQuery = ctx._source.elastic_rule.query;
                def newQuery = originalQuery.replace('${SIEM_RULE_MIGRATION_INDEX_PATTERN_PLACEHOLDER}', '${indexPattern}');
                ctx._source.elastic_rule.query = newQuery;`
          ),
          lang: 'painless',
        },
        query: {
          bool: {
            filter: [
              {
                term: {
                  migration_id: 'migration1',
                },
              },
              {
                terms: {
                  _id: ['rule1', 'rule2'],
                },
              },
              conditions.isMissingIndex(),
            ],
          },
        },
      });
      expect(result).toBe(2);
    });

    test('should update index pattern for all rules in migration', async () => {
      const id = 'migration1';
      const indexPattern = 'new-index-*';
      const mockResponse = { updated: 5 };

      esClient.asInternalUser.updateByQuery = jest.fn().mockResolvedValue(mockResponse);

      const result = await ruleMigrationsDataRulesClient.updateIndexPattern(id, indexPattern);

      expect(esClient.asInternalUser.updateByQuery).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations',
        script: {
          source: expect.stringContaining(
            `def originalQuery = ctx._source.elastic_rule.query;
                def newQuery = originalQuery.replace('${SIEM_RULE_MIGRATION_INDEX_PATTERN_PLACEHOLDER}', '${indexPattern}');
                ctx._source.elastic_rule.query = newQuery;`
          ),
          lang: 'painless',
        },
        query: {
          bool: {
            filter: [
              {
                term: {
                  migration_id: 'migration1',
                },
              },
              conditions.isMissingIndex(),
            ],
          },
        },
      });
      expect(result).toBe(5);
    });

    test('should throw an error if updateByQuery fails', async () => {
      const id = 'migration1';
      const indexPattern = 'new-index-*';
      const error = new Error('UpdateByQuery failed');
      esClient.asInternalUser.updateByQuery = jest.fn().mockRejectedValue(error);

      await expect(
        ruleMigrationsDataRulesClient.updateIndexPattern(id, indexPattern)
      ).rejects.toThrow('UpdateByQuery failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error updating index pattern for migration migration1: Error: UpdateByQuery failed'
      );
    });
  });

  describe('private methods', () => {
    describe('getFilterQuery', () => {
      test('should build filter query with multiple conditions', () => {
        const migrationId = 'migration1';
        const filters = {
          status: [SiemMigrationStatus.PENDING, SiemMigrationStatus.PROCESSING],
          ids: ['doc1', 'doc2'],
          searchTerm: 'test',
          installed: true,
          installable: true,
          prebuilt: false,
          failed: false,
          fullyTranslated: true,
          partiallyTranslated: false,
          untranslatable: false,
        };

        const result = (
          ruleMigrationsDataRulesClient as unknown as { getFilterQuery: Function }
        ).getFilterQuery(migrationId, filters);

        expect(result).toEqual({
          bool: {
            filter: [
              { term: { migration_id: 'migration1' } },
              { terms: { status: [SiemMigrationStatus.PENDING, SiemMigrationStatus.PROCESSING] } },
              { terms: { _id: ['doc1', 'doc2'] } },
              { match: { 'elastic_rule.title': 'test' } },
              { exists: { field: 'elastic_rule.id' } },
              { term: { translation_result: RuleTranslationResult.FULL } },
              { bool: { must_not: { exists: { field: 'elastic_rule.id' } } } },
              { bool: { must_not: { exists: { field: 'elastic_rule.prebuilt_rule_id' } } } },
              { bool: { must_not: { term: { status: SiemMigrationStatus.FAILED } } } },
              { term: { translation_result: RuleTranslationResult.FULL } },
              {
                bool: { must_not: { term: { translation_result: RuleTranslationResult.PARTIAL } } },
              },
              {
                bool: {
                  must_not: { term: { translation_result: RuleTranslationResult.UNTRANSLATABLE } },
                },
              },
            ],
          },
        });
      });

      test('should build filter query with single status', () => {
        const migrationId = 'migration1';
        const filters = { status: SiemMigrationStatus.COMPLETED };

        const result = (
          ruleMigrationsDataRulesClient as unknown as { getFilterQuery: Function }
        ).getFilterQuery(migrationId, filters);

        expect(result).toEqual({
          bool: {
            filter: [
              { term: { migration_id: 'migration1' } },
              { term: { status: SiemMigrationStatus.COMPLETED } },
            ],
          },
        });
      });

      test('should build filter query with no filters', () => {
        const migrationId = 'migration1';

        const result = (
          ruleMigrationsDataRulesClient as unknown as { getFilterQuery: Function }
        ).getFilterQuery(migrationId);

        expect(result).toEqual({
          bool: {
            filter: [{ term: { migration_id: 'migration1' } }],
          },
        });
      });
    });

    describe('statusAggCounts', () => {
      test('should count status aggregations correctly', () => {
        const statusAgg = {
          buckets: [
            { key: SiemMigrationStatus.PENDING, doc_count: 5 },
            { key: SiemMigrationStatus.PROCESSING, doc_count: 3 },
            { key: SiemMigrationStatus.COMPLETED, doc_count: 10 },
            { key: SiemMigrationStatus.FAILED, doc_count: 2 },
          ],
        };

        const result = (
          ruleMigrationsDataRulesClient as unknown as { statusAggCounts: Function }
        ).statusAggCounts(statusAgg);

        expect(result).toEqual({
          [SiemMigrationStatus.PENDING]: 5,
          [SiemMigrationStatus.PROCESSING]: 3,
          [SiemMigrationStatus.COMPLETED]: 10,
          [SiemMigrationStatus.FAILED]: 2,
        });
      });

      test('should handle missing status buckets', () => {
        const statusAgg = {
          buckets: [{ key: SiemMigrationStatus.COMPLETED, doc_count: 10 }],
        };

        const result = (
          ruleMigrationsDataRulesClient as unknown as { statusAggCounts: Function }
        ).statusAggCounts(statusAgg);

        expect(result).toEqual({
          [SiemMigrationStatus.PENDING]: 0,
          [SiemMigrationStatus.PROCESSING]: 0,
          [SiemMigrationStatus.COMPLETED]: 10,
          [SiemMigrationStatus.FAILED]: 0,
        });
      });
    });

    describe('translationResultAggCount', () => {
      test('should count translation result aggregations correctly', () => {
        const resultAgg = {
          buckets: [
            { key: RuleTranslationResult.FULL, doc_count: 8 },
            { key: RuleTranslationResult.PARTIAL, doc_count: 2 },
            { key: RuleTranslationResult.UNTRANSLATABLE, doc_count: 1 },
          ],
        };

        const result = (
          ruleMigrationsDataRulesClient as unknown as { translationResultAggCount: Function }
        ).translationResultAggCount(resultAgg);

        expect(result).toEqual({
          [RuleTranslationResult.FULL]: 8,
          [RuleTranslationResult.PARTIAL]: 2,
          [RuleTranslationResult.UNTRANSLATABLE]: 1,
        });
      });

      test('should handle missing translation result buckets', () => {
        const resultAgg = {
          buckets: [{ key: RuleTranslationResult.FULL, doc_count: 5 }],
        };

        const result = (
          ruleMigrationsDataRulesClient as unknown as { translationResultAggCount: Function }
        ).translationResultAggCount(resultAgg);

        expect(result).toEqual({
          [RuleTranslationResult.FULL]: 5,
          [RuleTranslationResult.PARTIAL]: 0,
          [RuleTranslationResult.UNTRANSLATABLE]: 0,
        });
      });
    });
  });
});
