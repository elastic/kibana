/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import {
  SiemMigrationStatus,
  MigrationTranslationResult,
} from '../../../../../common/siem_migrations/constants';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { dsl } from './dsl_queries';
import { WorkflowMigrationsDataWorkflowsClient } from './workflow_migrations_data_workflows_client';

describe('WorkflowMigrationsDataWorkflowsClient', () => {
  const esClient =
    elasticsearchServiceMock.createCustomClusterClient() as unknown as IScopedClusterClient;
  const logger = loggingSystemMock.createLogger();
  const client = new WorkflowMigrationsDataWorkflowsClient(
    jest.fn().mockResolvedValue('.kibana-siem-workflow-migrations-workflows'),
    { username: 'testUser', profile_uid: 'testProfileUid' } as unknown as AuthenticatedUser,
    esClient,
    logger,
    {} as unknown as SiemMigrationsClientDependencies
  );

  describe('getTranslationStats', () => {
    it('returns translation outcome counts', async () => {
      esClient.asInternalUser.search = jest.fn().mockResolvedValue({
        hits: { total: { value: 4 } },
        aggregations: {
          success: {
            doc_count: 3,
            result: {
              buckets: [
                { key: MigrationTranslationResult.FULL, doc_count: 2 },
                { key: MigrationTranslationResult.PARTIAL, doc_count: 1 },
              ],
            },
            installable: { doc_count: 1 },
          },
          failed: { doc_count: 1 },
        },
      });

      const result = await client.getTranslationStats('migration-1');

      expect(esClient.asInternalUser.search).toHaveBeenCalledWith({
        index: '.kibana-siem-workflow-migrations-workflows',
        query: {
          bool: {
            filter: [{ term: { migration_id: 'migration-1' } }],
          },
        },
        aggregations: {
          success: {
            filter: { term: { status: SiemMigrationStatus.COMPLETED } },
            aggs: {
              result: { terms: { field: 'translation_result' } },
              installable: { filter: dsl.isInstallable() },
            },
          },
          failed: { filter: { term: { status: SiemMigrationStatus.FAILED } } },
        },
        _source: false,
        track_total_hits: true,
      });
      expect(result).toEqual({
        id: 'migration-1',
        items: {
          total: 4,
          success: {
            total: 3,
            result: {
              [MigrationTranslationResult.FULL]: 2,
              [MigrationTranslationResult.PARTIAL]: 1,
              [MigrationTranslationResult.UNTRANSLATABLE]: 0,
            },
            installable: 1,
          },
          failed: 1,
        },
      });
    });

    it('logs and rethrows when the search fails', async () => {
      esClient.asInternalUser.search = jest.fn().mockRejectedValue(new Error('Search failed'));

      await expect(client.getTranslationStats('migration-1')).rejects.toThrow('Search failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting workflow migrations stats: Search failed'
      );
    });
  });
});
