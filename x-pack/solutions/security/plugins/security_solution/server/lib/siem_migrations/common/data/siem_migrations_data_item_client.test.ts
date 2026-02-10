/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type SearchApi from '@elastic/elasticsearch/lib/api/api/search';
import type { SiemMigrationsClientDependencies, ItemDocument } from '../types';
import { SiemMigrationsDataItemClient } from './siem_migrations_data_item_client';
import { dsl } from './dsl_queries';
import type { SiemMigrationSort } from './types';

type SearchApiResponse = Awaited<ReturnType<typeof SearchApi>>;

class TestSiemMigrationsDataItemClient extends SiemMigrationsDataItemClient<ItemDocument> {
  protected type = 'rule' as const;
  public getVendor = jest.fn().mockResolvedValue('qradar');
  protected getSortOptions(_sort?: SiemMigrationSort) {
    return [];
  }
}

describe('SiemMigrationsDataItemClient', () => {
  let client: TestSiemMigrationsDataItemClient;
  const esClient =
    elasticsearchServiceMock.createCustomClusterClient() as unknown as IScopedClusterClient;

  const logger = loggingSystemMock.createLogger();
  const indexNameProvider = jest.fn().mockReturnValue('.kibana-siem-rule-migrations-rules-default');
  const currentUser = {
    userName: 'testUser',
    profile_uid: 'testProfileUid',
  } as unknown as AuthenticatedUser;
  const dependencies = {} as unknown as SiemMigrationsClientDependencies;

  beforeEach(() => {
    client = new TestSiemMigrationsDataItemClient(
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

  describe('getStats', () => {
    it('queries ES using isEligibleForTranslation filter', async () => {
      (
        esClient.asInternalUser.search as unknown as jest.MockedFn<typeof SearchApi>
      ).mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {
          status: {
            buckets: [],
          },
        },
      } as unknown as SearchApiResponse);

      await client.getStats('mig-1');

      expect(esClient.asInternalUser.search).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations-rules-default',
        query: {
          bool: {
            filter: [{ term: { migration_id: 'mig-1' } }, dsl.isEligibleForTranslation()],
          },
        },
        aggregations: {
          status: { terms: { field: 'status' } },
          createdAt: { min: { field: '@timestamp' } },
          lastUpdatedAt: { max: { field: 'updated_at' } },
        },
        _source: false,
      });
    });
  });

  describe('getAllStats', () => {
    it('queries ES using eligibility filter', async () => {
      (
        esClient.asInternalUser.search as unknown as jest.MockedFn<typeof SearchApi>
      ).mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {
          migrationIds: {
            buckets: [],
          },
        },
      } as unknown as SearchApiResponse);

      await client.getAllStats();

      expect(esClient.asInternalUser.search).toHaveBeenCalledWith({
        index: '.kibana-siem-rule-migrations-rules-default',
        query: {
          bool: {
            filter: [dsl.isEligibleForTranslation()],
          },
        },
        aggregations: {
          migrationIds: {
            terms: { field: 'migration_id', order: { createdAt: 'asc' }, size: 10000 },
            aggregations: {
              status: { terms: { field: 'status' } },
              createdAt: { min: { field: '@timestamp' } },
              lastUpdatedAt: { max: { field: 'updated_at' } },
            },
          },
        },
        _source: false,
      });
    });
  });
});
