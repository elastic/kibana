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
import { createEntitySourcesService } from './entity_sources_service';

jest.mock('../management/watchlist_config');
jest.mock('./infra/entity_source_client');
jest.mock('../entities/service');
jest.mock('./sync/index_sync');
jest.mock('../entities/utils');
jest.mock('./bulk/soft_delete');

const { mockListEntitySources } = jest.requireMock('./infra/entity_source_client') as {
  mockListEntitySources: jest.Mock;
};

const { mockWatchlistGet, mockGetEntitySourceIds, mockWatchlistList } = jest.requireMock(
  '../management/watchlist_config'
) as {
  mockWatchlistGet: jest.Mock;
  mockGetEntitySourceIds: jest.Mock;
  mockWatchlistList: jest.Mock;
};

const { mockListEntityStoreEntities } = jest.requireMock('../entities/service') as {
  mockListEntityStoreEntities: jest.Mock;
};

const { mockPlainIndexSync } = jest.requireMock('./sync/index_sync') as {
  mockPlainIndexSync: jest.Mock;
};

const { mockGetIndexForWatchlist } = jest.requireMock('../entities/utils') as {
  mockGetIndexForWatchlist: jest.Mock;
};

const { applyBulkRemoveSource: mockApplyBulkRemoveSource } = jest.requireMock(
  './bulk/soft_delete'
) as {
  applyBulkRemoveSource: jest.Mock;
};

describe('createEntitySourcesService', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const soClient = savedObjectsClientMock.create();
  const logger = loggingSystemMock.createLogger();
  const namespace = 'default';

  beforeEach(() => {
    jest.clearAllMocks();

    mockWatchlistGet.mockResolvedValue({ name: 'VIP Users' });
    mockGetEntitySourceIds.mockResolvedValue(['source-a', 'source-c']);
    mockListEntitySources.mockResolvedValue({
      sources: [
        {
          id: 'source-a',
          type: 'index',
          identifierField: 'user.id',
        },
        {
          id: 'source-b',
          type: 'integration',
          integrationName: 'entityanalytics_ad',
        },
        {
          id: 'source-c',
          type: 'integration',
          integrationName: 'entityanalytics_okta',
        },
      ],
    });
    mockListEntityStoreEntities
      .mockResolvedValueOnce({
        entityIdsByType: {
          user: ['user:1'],
          host: [],
          service: [],
          generic: [],
        },
        correlationMap: new Map(),
        watchlistsByEuid: new Map(),
      })
      .mockResolvedValueOnce({
        entityIdsByType: {
          user: ['user:2'],
          host: ['host:1'],
          service: [],
          generic: [],
        },
        watchlistsByEuid: new Map(),
      });
    mockPlainIndexSync.mockResolvedValue(undefined);
    mockGetIndexForWatchlist.mockReturnValue('.lists-watchlist-vip-users-default');
  });

  it('builds the linked source payload and passes it to plainIndexSync', async () => {
    const service = createEntitySourcesService({
      esClient,
      soClient,
      logger,
      namespace,
    });

    await service.syncWatchlist('watchlist-1');

    expect(mockWatchlistGet).toHaveBeenCalledWith('watchlist-1');
    expect(mockGetEntitySourceIds).toHaveBeenCalledWith('watchlist-1');
    expect(mockListEntitySources).toHaveBeenCalledWith({});
    expect(mockGetIndexForWatchlist).toHaveBeenCalledWith(namespace);

    expect(mockListEntityStoreEntities).toHaveBeenCalledTimes(2);
    expect(mockListEntityStoreEntities).toHaveBeenNthCalledWith(1, {
      type: 'index',
      field: 'user.id',
    });
    expect(mockListEntityStoreEntities).toHaveBeenNthCalledWith(2, {
      type: 'integration',
      name: 'entityanalytics_okta',
    });

    expect(mockPlainIndexSync).toHaveBeenCalledWith([
      {
        sourceId: 'source-a',
        entityStoreEntityIdsByType: {
          user: ['user:1'],
          host: [],
          service: [],
          generic: [],
        },
        correlationMap: expect.any(Map),
        watchlistsByEuid: expect.any(Map),
      },
      {
        sourceId: 'source-c',
        entityStoreEntityIdsByType: {
          user: ['user:2'],
          host: ['host:1'],
          service: [],
          generic: [],
        },
        watchlistsByEuid: expect.any(Map),
      },
    ]);

    expect(logger.info).toHaveBeenCalledWith(
      '[WatchlistSync] Completed sync for watchlist watchlist-1 (VIP Users)'
    );
  });

  describe('syncAllWatchlists', () => {
    const createService = () =>
      createEntitySourcesService({ esClient, soClient, logger, namespace });

    it('syncs each watchlist returned by list', async () => {
      mockWatchlistList.mockResolvedValue([
        { id: 'wl-1', name: 'VIP Users' },
        { id: 'wl-2', name: 'Privileged Hosts' },
      ]);

      const service = createService();
      // Stub syncWatchlist indirectly via the mocks it calls
      mockWatchlistGet.mockResolvedValue({ name: 'stub' });
      mockGetEntitySourceIds.mockResolvedValue([]);
      mockListEntitySources.mockResolvedValue({ sources: [] });

      await service.syncAllWatchlists();

      expect(mockWatchlistList).toHaveBeenCalledTimes(1);
      // syncWatchlist is called once per watchlist — get is the first call it makes
      expect(mockWatchlistGet).toHaveBeenCalledTimes(2);
      expect(mockWatchlistGet).toHaveBeenCalledWith('wl-1');
      expect(mockWatchlistGet).toHaveBeenCalledWith('wl-2');
    });

    it('skips sync and logs debug when no watchlists exist', async () => {
      mockWatchlistList.mockResolvedValue([]);

      const service = createService();
      await service.syncAllWatchlists();

      expect(logger.debug).toHaveBeenCalledWith(
        'No watchlists found for namespace "default". Skipping sync.'
      );
      expect(mockWatchlistGet).not.toHaveBeenCalled();
    });

    it('filters out watchlists without an id', async () => {
      mockWatchlistList.mockResolvedValue([
        { id: 'wl-1', name: 'VIP Users' },
        { id: undefined, name: 'No ID' },
        { name: 'Also No ID' },
      ]);

      const service = createService();
      mockWatchlistGet.mockResolvedValue({ name: 'stub' });
      mockGetEntitySourceIds.mockResolvedValue([]);
      mockListEntitySources.mockResolvedValue({ sources: [] });

      await service.syncAllWatchlists();

      expect(mockWatchlistGet).toHaveBeenCalledTimes(1);
      expect(mockWatchlistGet).toHaveBeenCalledWith('wl-1');
    });

    it('cleans up orphaned entities when no sources are linked', async () => {
      mockWatchlistList.mockResolvedValue([{ id: 'wl-1', name: 'Cleaned' }]);

      const service = createService();
      mockWatchlistGet.mockResolvedValue({ name: 'Cleaned', id: 'wl-1' });
      mockGetEntitySourceIds.mockResolvedValue([]);
      mockListEntitySources.mockResolvedValue({ sources: [] });

      // Mock: aggregation returns one orphaned source ID (not csv)
      esClient.search
        .mockResolvedValueOnce({
          aggregations: {
            source_ids: {
              buckets: [
                { key: 'orphaned-source-1', doc_count: 3 },
                { key: 'csv', doc_count: 2 },
              ],
            },
          },
        } as never)
        // Mock: buildWatchlistsByEuid — first search returns euids
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: { entity: { id: 'user:alice' } } }] },
        } as never)
        // Mock: buildWatchlistsByEuid — entity store query for watchlist memberships
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  entity: { id: 'user:alice', attributes: { watchlists: ['wl-1'] } },
                },
              },
            ],
          },
        } as never)
        // Mock: findEntitiesBySource — paginated search for stale entities
        .mockResolvedValueOnce({
          hits: { hits: [{ _id: 'user:alice:doc1' }] },
        } as never);

      await service.syncAllWatchlists();

      expect(mockApplyBulkRemoveSource).toHaveBeenCalledWith(
        expect.objectContaining({
          staleEntities: [{ docId: 'user:alice:doc1', sourceId: 'orphaned-source-1' }],
        })
      );
      // plainIndexSync still runs (with empty sources) but cleanup handles orphans
      expect(mockPlainIndexSync).toHaveBeenCalledWith([]);
    });

    it('continues syncing remaining watchlists when one fails', async () => {
      mockWatchlistList.mockResolvedValue([
        { id: 'wl-1', name: 'Failing' },
        { id: 'wl-2', name: 'Succeeding' },
      ]);

      const service = createService();
      mockWatchlistGet
        .mockRejectedValueOnce(new Error('get failed'))
        .mockResolvedValueOnce({ name: 'Succeeding' });
      mockGetEntitySourceIds.mockResolvedValue([]);
      mockListEntitySources.mockResolvedValue({ sources: [] });

      await service.syncAllWatchlists();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to sync watchlist "Failing" (wl-1): get failed')
      );
      // Second watchlist still synced
      expect(mockWatchlistGet).toHaveBeenCalledWith('wl-2');
    });
  });
});
