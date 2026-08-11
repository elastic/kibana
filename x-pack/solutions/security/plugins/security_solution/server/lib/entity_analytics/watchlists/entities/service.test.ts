/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createWatchlistEntitiesService } from './service';

describe('Watchlist entities service', () => {
  it('groups entity store ids by entity type', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _source: { entity: { id: 'user:jdoe', type: 'user' } },
            _index: '1',
            sort: ['user:jdoe'],
          },
          {
            _source: { entity: { id: 'host:server-1', type: 'host' } },
            _index: '2',
            sort: ['host:server-1'],
          },
          {
            _source: { entity: { id: 'service:api', EngineMetadata: { Type: 'service' } } },
            _index: '3',
            sort: ['service:api'],
          },
        ],
      },
    } as never);

    const service = createWatchlistEntitiesService({
      esClient,
      namespace: 'default',
    });

    const pages = [];
    for await (const page of service.listEntityStoreEntities({ type: 'index', field: 'user.id' })) {
      pages.push(page);
    }

    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual({
      correlationMap: expect.any(Map),
      watchlistsByEuid: expect.any(Map),
      maxEntityId: 'service:api',
      entityIdsByType: {
        user: ['user:jdoe'],
        host: ['host:server-1'],
        service: ['service:api'],
        generic: [],
      },
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
  });

  it('yields multiple pages and uses search_after between them', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    // First page: exactly 3 hits (full page with pageSize=3) → triggers a second fetch
    esClient.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: { entity: { id: 'user:a', type: 'user' } }, _index: '1', sort: ['user:a'] },
            { _source: { entity: { id: 'user:b', type: 'user' } }, _index: '2', sort: ['user:b'] },
            { _source: { entity: { id: 'user:c', type: 'user' } }, _index: '3', sort: ['user:c'] },
          ],
        },
      } as never)
      // Second page: 1 hit (partial page) → terminates the generator
      .mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: { entity: { id: 'user:d', type: 'user' } }, _index: '4', sort: ['user:d'] },
          ],
        },
      } as never);

    const service = createWatchlistEntitiesService({
      esClient,
      namespace: 'default',
      pageSize: 3,
    });

    const pages = [];
    for await (const page of service.listEntityStoreEntities({
      type: 'store',
      queryRule: 'entity.type: user',
    })) {
      pages.push(page);
    }

    expect(pages).toHaveLength(2);
    expect(pages[0].entityIdsByType.user).toEqual(['user:a', 'user:b', 'user:c']);
    expect(pages[0].maxEntityId).toBe('user:c');
    expect(pages[1].entityIdsByType.user).toEqual(['user:d']);
    expect(pages[1].maxEntityId).toBe('user:d');

    expect(esClient.search).toHaveBeenCalledTimes(2);
    // Second call must carry the search_after from the first page's last sort value
    expect(esClient.search).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ search_after: ['user:c'] })
    );
  });

  it('returns correlation map and entity IDs for index sources', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _source: { entity: { id: 'user:jdoe', type: 'user' }, user: { name: 'jdoe' } },
            _index: '1',
            sort: ['user:jdoe'],
          },
          {
            _source: {
              entity: { id: 'host:server-1', type: 'host' },
              host: { name: 'server-1' },
            },
            _index: '2',
            sort: ['host:server-1'],
          },
        ],
      },
    } as never);

    const service = createWatchlistEntitiesService({
      esClient,
      namespace: 'default',
    });

    const pages = [];
    for await (const page of service.listEntityStoreEntities({
      type: 'index',
      field: 'user.name',
    })) {
      pages.push(page);
    }

    expect(pages).toHaveLength(1);
    const result = pages[0];

    expect(result.entityIdsByType.user).toEqual(['user:jdoe']);
    expect(result.entityIdsByType.host).toEqual(['host:server-1']);
    expect(result.correlationMap?.get('jdoe')).toEqual({
      euids: ['user:jdoe'],
      entityType: 'user',
    });
    // host doesn't have user.name so it should not be in correlation map
    expect(result.correlationMap?.has('server-1')).toBe(false);
  });

  it('throws when a hit has no sort value', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [{ _source: { entity: { id: 'user:a', type: 'user' } }, _index: '1' }],
      },
    } as never);

    const service = createWatchlistEntitiesService({ esClient, namespace: 'default' });
    const gen = service.listEntityStoreEntities({ type: 'store', queryRule: 'entity.type: user' });

    await expect(gen.next()).rejects.toThrow(
      'Entity store pagination query returned a hit without sort values'
    );
  });
});
