/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssetCriticalityMigrationClient } from './asset_criticality_migration_client';
import { AssetCriticalityDataClient } from './asset_criticality_data_client';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import { ASSET_CRITICALITY_MAPPINGS_VERSIONS } from './constants';

jest.mock('./asset_criticality_data_client');

const emptySearchResponse = {
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { hits: [] },
};

describe('AssetCriticalityMigrationClient', () => {
  let logger: Logger;
  let auditLogger: AuditLogger | undefined;
  let esClient: ElasticsearchClient;
  let assetCriticalityDataClient: jest.Mocked<AssetCriticalityDataClient>;
  let migrationClient: AssetCriticalityMigrationClient;

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() } as unknown as Logger;
    auditLogger = undefined;
    esClient = { updateByQuery: jest.fn() } as unknown as ElasticsearchClient;
    assetCriticalityDataClient = new AssetCriticalityDataClient({
      logger,
      auditLogger,
      esClient,
      namespace: '*',
    }) as jest.Mocked<AssetCriticalityDataClient>;

    (AssetCriticalityDataClient as jest.Mock).mockImplementation(() => assetCriticalityDataClient);

    assetCriticalityDataClient.getIndex.mockImplementation(
      () => '.asset-criticality.asset-criticality-default'
    );

    migrationClient = new AssetCriticalityMigrationClient({ logger, auditLogger, esClient });
  });

  describe('isMappingsMigrationRequired', () => {
    it('should return true if versions are different', async () => {
      assetCriticalityDataClient.getIndexMappings.mockResolvedValue({
        index1: { mappings: { properties: {} } },
        index2: { mappings: { properties: {}, _meta: { version: '9999' } } },
      });

      const result = await migrationClient.isMappingsMigrationRequired();
      expect(result).toBe(true);
    });

    it('should return false if versions are equal', async () => {
      assetCriticalityDataClient.getIndexMappings.mockResolvedValue({
        index1: {
          mappings: { properties: {}, _meta: { version: ASSET_CRITICALITY_MAPPINGS_VERSIONS } },
        },
      });

      const result = await migrationClient.isMappingsMigrationRequired();
      expect(result).toBe(false);
    });
  });

  describe('isEcsDataMigrationRequired', () => {
    it('should return true if there are documents without asset.criticality field', async () => {
      assetCriticalityDataClient.search.mockResolvedValue({
        ...emptySearchResponse,
        hits: { hits: [{ _index: 'test-index' }] },
      });

      const result = await migrationClient.isEcsDataMigrationRequired();
      expect(result).toBe(true);
    });

    it('should return false if all documents have asset.criticality field', async () => {
      assetCriticalityDataClient.search.mockResolvedValue(emptySearchResponse);

      const result = await migrationClient.isEcsDataMigrationRequired();
      expect(result).toBe(false);
    });
  });

  describe('migrateMappings', () => {
    it('should call createOrUpdateIndex on assetCriticalityDataClient', async () => {
      await migrationClient.migrateMappings();
      expect(assetCriticalityDataClient.createOrUpdateIndex).toHaveBeenCalled();
    });
  });

  describe('migrateEcsData', () => {
    it('should call updateByQuery on esClient with correct parameters', async () => {
      await migrationClient.migrateEcsData();
      expect(esClient.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: assetCriticalityDataClient.getIndex(),
          body: expect.objectContaining({
            query: expect.any(Object),
            script: expect.any(Object),
          }),
        }),
        expect.any(Object)
      );
    });
  });
});
