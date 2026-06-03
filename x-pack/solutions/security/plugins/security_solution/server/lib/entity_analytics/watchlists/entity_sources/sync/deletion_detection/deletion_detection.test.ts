/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';
import type { WatchlistDataSources } from '../../../../../../../common/api/entity_analytics';
import type { WatchlistsByEuid } from '../../../entities/service';
import { createDeletionDetectionService } from './deletion_detection';

const createMockCrudClient = (): jest.Mocked<CRUDClient> =>
  ({
    searchLatestEntities: jest
      .fn()
      .mockResolvedValue({ records: [], total: 0, inspect: { dsl: [], response: [] } }),
    bulkUpdateEntity: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<CRUDClient>);

const emptyWatchlistsByEuid: WatchlistsByEuid = new Map();

jest.mock('../../infra/entity_source_client');
jest.mock('../../bulk/soft_delete');

const { WatchlistEntitySourceClient, mockGetLastFullSyncMarker, mockUpdateLastFullSyncMarker } =
  jest.requireMock('../../infra/entity_source_client') as {
    WatchlistEntitySourceClient: jest.Mock;
    mockGetLastFullSyncMarker: jest.Mock;
    mockUpdateLastFullSyncMarker: jest.Mock;
  };

const { applyBulkRemoveSource } = jest.requireMock('../../bulk/soft_delete') as {
  applyBulkRemoveSource: jest.Mock;
};

describe('DeletionDetectionService', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const watchlist = {
    id: 'test-watchlist-id',
    name: 'test-watchlist',
    index: '.entity-analytics.watchlists.test-default',
  };

  const createService = () => {
    const descriptorClient = new WatchlistEntitySourceClient({
      soClient: savedObjectsClientMock.create(),
      namespace: 'default',
    });
    return createDeletionDetectionService({
      esClient,
      crudClient: createMockCrudClient(),
      logger,
      descriptorClient,
      watchlist,
    });
  };

  const indexSource: WatchlistDataSources.MonitoringEntitySource = {
    id: 'source-idx',
    type: 'index',
    name: 'test-index-source',
    indexPattern: 'my-index-*',
    identifierField: 'user.name',
    enabled: true,
  };

  const integrationSource: WatchlistDataSources.MonitoringEntitySource = {
    id: 'source-int',
    type: 'entity_analytics_integration',
    name: 'test-integration-source',
    indexPattern: 'logs-entityanalytics_okta.user-default',
    integrationName: 'entityanalytics_okta',
    enabled: true,
    integrations: {
      syncMarkerIndex: 'logs-entityanalytics_okta.entity-default',
      syncData: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no stale entities found
    esClient.search.mockResolvedValue({
      hits: { hits: [], total: { value: 0, relation: 'eq' } },
    } as unknown as ReturnType<typeof esClient.search>);
  });

  describe('index sources', () => {
    it('skips bulk operations when no stale entities are found', async () => {
      const service = createService();
      await service.deletionDetection(indexSource, ['euid-1', 'euid-2'], emptyWatchlistsByEuid);

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: watchlist.index,
          query: {
            bool: {
              must: [
                { term: { 'labels.source_ids': 'source-idx' } },
                { term: { 'watchlist.id': watchlist.id } },
              ],
              must_not: [{ terms: { 'entity.id': ['euid-1', 'euid-2'] } }],
            },
          },
        })
      );
      expect(applyBulkRemoveSource).not.toHaveBeenCalled();
    });

    it('calls applyBulkRemoveSource when stale entities are found', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            { _id: 'doc-stale-1', _source: {}, sort: ['sort-1'] },
            { _id: 'doc-stale-2', _source: {}, sort: ['sort-2'] },
          ],
          total: { value: 2, relation: 'eq' },
        },
      } as unknown as ReturnType<typeof esClient.search>);

      const service = createService();
      await service.deletionDetection(indexSource, ['euid-1'], emptyWatchlistsByEuid);

      expect(applyBulkRemoveSource).toHaveBeenCalledWith(
        expect.objectContaining({
          staleEntities: [
            { docId: 'doc-stale-1', sourceId: 'source-idx' },
            { docId: 'doc-stale-2', sourceId: 'source-idx' },
          ],
          sourceType: 'index',
          watchlist,
        })
      );
    });

    it('omits must_not when currentEuids is empty (all entities are stale)', async () => {
      const service = createService();
      await service.deletionDetection(indexSource, [], emptyWatchlistsByEuid);

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [
                { term: { 'labels.source_ids': 'source-idx' } },
                { term: { 'watchlist.id': watchlist.id } },
              ],
            },
          },
        })
      );
    });

    it('scopes the query to the page range when range is provided', async () => {
      const service = createService();
      await service.deletionDetection(indexSource, ['euid-1'], emptyWatchlistsByEuid, {
        gt: 'host:z',
        lte: 'user:b',
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [
                { term: { 'labels.source_ids': 'source-idx' } },
                { term: { 'watchlist.id': watchlist.id } },
                { range: { 'entity.id': { gt: 'host:z', lte: 'user:b' } } },
              ],
              must_not: [{ terms: { 'entity.id': ['euid-1'] } }],
            },
          },
        })
      );
    });

    it('omits lte from range for the tail pass', async () => {
      const service = createService();
      await service.deletionDetection(indexSource, [], emptyWatchlistsByEuid, {
        gt: 'user:z',
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [
                { term: { 'labels.source_ids': 'source-idx' } },
                { term: { 'watchlist.id': watchlist.id } },
                { range: { 'entity.id': { gt: 'user:z' } } },
              ],
            },
          },
        })
      );
    });

    it('does not check detectNewFullSync for index sources', async () => {
      const service = createService();
      await service.deletionDetection(indexSource, ['euid-1'], emptyWatchlistsByEuid);

      // detectNewFullSync queries the sync marker index — should not happen for index sources
      // The only search call should be the stale entity query on the target index
      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: watchlist.index })
      );
    });
  });

  describe('integration sources', () => {
    it('skips deletion detection when no new full sync is detected', async () => {
      // No completed event in sync marker index
      mockGetLastFullSyncMarker.mockResolvedValue(undefined);
      esClient.search.mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as unknown as ReturnType<typeof esClient.search>);

      const service = createService();
      await service.deletionDetection(integrationSource, ['euid-1'], emptyWatchlistsByEuid);

      // Only the sync marker index query should happen, NOT the stale entity query
      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'logs-entityanalytics_okta.entity-default',
        })
      );
      expect(applyBulkRemoveSource).not.toHaveBeenCalled();
    });

    it('runs deletion detection when a new full sync is detected', async () => {
      mockGetLastFullSyncMarker.mockResolvedValue(undefined);
      // First call: sync marker index query returns a completed event
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'marker-1', _source: { '@timestamp': '2024-03-01T00:00:00Z' } }],
        },
      } as unknown as ReturnType<typeof esClient.search>);
      // Second call: stale entity query returns one stale entity
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'doc-stale', _source: {}, sort: ['s'] }],
          total: { value: 1, relation: 'eq' },
        },
      } as unknown as ReturnType<typeof esClient.search>);

      const service = createService();
      await service.deletionDetection(integrationSource, ['euid-1'], emptyWatchlistsByEuid);

      expect(mockUpdateLastFullSyncMarker).toHaveBeenCalledWith(
        integrationSource,
        '2024-03-01T00:00:00Z'
      );
      expect(applyBulkRemoveSource).toHaveBeenCalledWith(
        expect.objectContaining({
          staleEntities: [{ docId: 'doc-stale', sourceId: 'source-int' }],
          sourceType: 'entity_analytics_integration',
        })
      );
    });

    it('skips when completed event is not newer than last full sync marker', async () => {
      mockGetLastFullSyncMarker.mockResolvedValue('2024-03-01T00:00:00Z');
      // Completed event is same as last full sync
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'marker-1', _source: { '@timestamp': '2024-03-01T00:00:00Z' } }],
        },
      } as unknown as ReturnType<typeof esClient.search>);

      const service = createService();
      await service.deletionDetection(integrationSource, ['euid-1'], emptyWatchlistsByEuid);

      expect(applyBulkRemoveSource).not.toHaveBeenCalled();
    });
  });
});
