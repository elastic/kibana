/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Adapters, StoredSiemMigration } from '../types';
import { RuleMigrationSpaceIndexMigrator } from './rule_migrations_per_space_index_migrator';
import type { SearchResponseBody } from 'elasticsearch-8.x/lib/api/types';

const mockRuleIndexAggregationsResult = {
  aggregations: {
    migrationIds: {
      buckets: [
        {
          key: 'migration1',
          createdAt: { value_as_string: '2023-01-01T00:00:00Z' },
          createdBy: { buckets: [{ key: 'user1' }] },
        },
        {
          key: 'migration2',
          createdAt: { value_as_string: '2023-01-02T00:00:00Z' },
          createdBy: { buckets: [{ key: 'user2' }, { key: 'user3' }] },
        },
      ],
    },
  },
};

const mockMigrationsIndexResult = {
  hits: {
    hits: [],
  },
} as unknown as SearchResponseBody<StoredSiemMigration>;

const getMockedESSearchFunction = (
  rulesIndexAggResult: typeof mockRuleIndexAggregationsResult = mockRuleIndexAggregationsResult,
  migrationIndexResult: typeof mockMigrationsIndexResult = mockMigrationsIndexResult
) =>
  jest.fn((args) => {
    if (args.index === '.kibana-siem-rule-migrations-rules-space1') {
      return Promise.resolve(rulesIndexAggResult);
    } else if (args.index === '.kibana-siem-rule-migrations-migrations-space1') {
      return Promise.resolve(migrationIndexResult);
    }
    return Promise.resolve({ hits: { hits: [] } });
  });

const esClientMock = {
  search: jest.fn(),
  bulk: jest.fn(),
} as unknown as jest.Mocked<ElasticsearchClient>;

const loggerMock = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const ruleMigrationIndexAdapters = {
  rules: {
    getIndexName: (spaceId: string) => `.kibana-siem-rule-migrations-rules-${spaceId}`,
  },
  migrations: {
    getIndexName: (spaceId: string) => `.kibana-siem-rule-migrations-migrations-${spaceId}`,
    getInstalledIndexName: (spaceId: string) =>
      `.kibana-siem-rule-migrations-migrations-${spaceId}`,
    createIndex: jest.fn(),
  },
} as unknown as Adapters;

describe('RuleMigrationSpaceIndexMigrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    esClientMock.search.mockImplementation(
      getMockedESSearchFunction() as unknown as ElasticsearchClient['search']
    );
  });

  it('should create correct number of documents when nothing exists in Migration index', async () => {
    const migrator = new RuleMigrationSpaceIndexMigrator(
      'space1',
      esClientMock,
      loggerMock,
      ruleMigrationIndexAdapters
    );
    await migrator.run();

    expect(esClientMock.bulk).toHaveBeenNthCalledWith(1, {
      refresh: 'wait_for',
      operations: [
        { create: { _id: 'migration1', _index: '.kibana-siem-rule-migrations-migrations-space1' } },
        { id: 'migration1', created_at: '2023-01-01T00:00:00Z', created_by: 'user1' },
        { create: { _id: 'migration2', _index: '.kibana-siem-rule-migrations-migrations-space1' } },
        { id: 'migration2', created_at: '2023-01-02T00:00:00Z', created_by: 'user2' },
      ],
    });
  });

  it('should create correct number of documents when some exist in Migration index', async () => {
    const mockMigrationIndexResultWithOneDocument = {
      hits: {
        hits: [
          {
            _id: 'migration1',
            _source: {
              created_at: '2023-01-01T00:00:00Z',
              created_by: 'user1',
            },
          },
        ],
      },
    } as unknown as SearchResponseBody<StoredSiemMigration>;
    esClientMock.search.mockImplementation(
      getMockedESSearchFunction(
        mockRuleIndexAggregationsResult,
        mockMigrationIndexResultWithOneDocument
      ) as unknown as ElasticsearchClient['search']
    );

    const migrator = new RuleMigrationSpaceIndexMigrator(
      'space1',
      esClientMock,
      loggerMock,
      ruleMigrationIndexAdapters
    );

    await migrator.run();
    expect(esClientMock.bulk).toHaveBeenNthCalledWith(1, {
      refresh: 'wait_for',
      operations: [
        { create: { _id: 'migration2', _index: '.kibana-siem-rule-migrations-migrations-space1' } },
        { id: 'migration2', created_at: '2023-01-02T00:00:00Z', created_by: 'user2' },
      ],
    });
  });
});
