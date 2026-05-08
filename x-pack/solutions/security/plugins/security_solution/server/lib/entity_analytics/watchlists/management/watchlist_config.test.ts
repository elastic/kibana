/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { WatchlistConfigClient } from './watchlist_config';
import { getIndexForWatchlist } from '../entities/utils';

jest.mock('../entities/utils', () => ({
  getIndexForWatchlist: jest.fn().mockReturnValue('mock-watchlist-index'),
}));

describe('WatchlistConfigClient', () => {
  let soClientMock: ReturnType<typeof savedObjectsClientMock.create>;
  let esClientMock: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let internalEsClientMock: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
  let client: WatchlistConfigClient;

  beforeEach(() => {
    soClientMock = savedObjectsClientMock.create();

    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    internalEsClientMock = elasticsearchServiceMock.createElasticsearchClient();

    loggerMock = loggingSystemMock.createLogger();

    client = new WatchlistConfigClient({
      soClient: soClientMock,
      esClient: esClientMock,
      internalEsClient: internalEsClientMock,
      namespace: 'default',
      logger: loggerMock,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEntityCounts', () => {
    it('should return a map of entity counts for given watchlist IDs', async () => {
      // Mock the ES search response
      esClientMock.search.mockResolvedValue({
        aggregations: {
          watchlist_counts: {
            buckets: [
              { key: 'watchlist-1', doc_count: 5 },
              { key: 'watchlist-3', doc_count: 12 },
            ],
          },
        },
      } as unknown as Awaited<ReturnType<typeof esClientMock.search>>);

      const ids = ['watchlist-1', 'watchlist-2', 'watchlist-3'];
      const result = await client.getEntityCounts(ids);

      // Should initialize all requested IDs to 0, then populate from buckets
      expect(result).toEqual({
        'watchlist-1': 5,
        'watchlist-2': 0, // No bucket returned, should default to 0
        'watchlist-3': 12,
      });

      expect(esClientMock.search).toHaveBeenCalledWith({
        index: 'mock-watchlist-index',
        size: 0,
        query: {
          terms: {
            'watchlist.id': ids,
          },
        },
        aggs: {
          watchlist_counts: {
            terms: {
              field: 'watchlist.id',
              size: ids.length,
            },
          },
        },
        ignore_unavailable: true,
      });
      expect(getIndexForWatchlist).toHaveBeenCalled();
    });

    it('should return all zeros if no buckets are returned', async () => {
      esClientMock.search.mockResolvedValue({
        aggregations: {
          watchlist_counts: {
            buckets: [],
          },
        },
      } as unknown as Awaited<ReturnType<typeof esClientMock.search>>);

      const ids = ['watchlist-1', 'watchlist-2'];
      const result = await client.getEntityCounts(ids);

      expect(result).toEqual({
        'watchlist-1': 0,
        'watchlist-2': 0,
      });
    });

    it('should catch errors, log them, and return a map of zeros', async () => {
      esClientMock.search.mockRejectedValue(new Error('ES failure'));

      const ids = ['watchlist-1', 'watchlist-2'];
      const result = await client.getEntityCounts(ids);

      expect(result).toEqual({
        'watchlist-1': 0,
        'watchlist-2': 0,
      });
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Failed to fetch watchlist entity counts: ES failure'
      );
    });
  });

  describe('getEntityCount', () => {
    it('should return the correct count for a single ID', async () => {
      jest.spyOn(client, 'getEntityCounts').mockResolvedValue({ 'watchlist-1': 10 });
      const result = await client.getEntityCount('watchlist-1');
      expect(result).toBe(10);
      expect(client.getEntityCounts).toHaveBeenCalledWith(['watchlist-1']);
    });
  });

  describe('list', () => {
    it('should return watchlists enriched with entityCounts', async () => {
      soClientMock.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'wl-1',
            type: 'watchlist_config',
            references: [],
            score: 0,
            attributes: { name: 'Watchlist 1' },
          },
          {
            id: 'wl-2',
            type: 'watchlist_config',
            references: [],
            score: 0,
            attributes: { name: 'Watchlist 2' },
          },
        ],
        total: 2,
        page: 1,
        per_page: 20,
      });

      jest.spyOn(client, 'getEntityCounts').mockResolvedValue({
        'wl-1': 42,
        'wl-2': 7,
      });

      const result = await client.list();

      expect(result).toEqual([
        {
          id: 'wl-1',
          name: 'Watchlist 1',
          entityCount: 42,
          createdAt: undefined,
          updatedAt: undefined,
          entitySourceIds: [],
        },
        {
          id: 'wl-2',
          name: 'Watchlist 2',
          entityCount: 7,
          createdAt: undefined,
          updatedAt: undefined,
          entitySourceIds: [],
        },
      ]);
      expect(client.getEntityCounts).toHaveBeenCalledWith(['wl-1', 'wl-2']);
    });

    it('should not call getEntityCounts if no watchlists are found', async () => {
      soClientMock.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      jest.spyOn(client, 'getEntityCounts');

      const result = await client.list();

      expect(result).toEqual([]);
      expect(client.getEntityCounts).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return a single watchlist enriched with entityCount', async () => {
      soClientMock.get.mockResolvedValue({
        id: 'wl-1',
        type: 'watchlist_config',
        references: [],
        attributes: { name: 'Watchlist 1' },
      });

      jest.spyOn(client, 'getEntityCount').mockResolvedValue(42);

      const result = await client.get('wl-1');

      expect(result).toEqual({
        id: 'wl-1',
        name: 'Watchlist 1',
        entityCount: 42,
        createdAt: undefined,
        updatedAt: undefined,
        entitySourceIds: [],
      });
      expect(client.getEntityCount).toHaveBeenCalledWith('wl-1');
    });
  });
});
