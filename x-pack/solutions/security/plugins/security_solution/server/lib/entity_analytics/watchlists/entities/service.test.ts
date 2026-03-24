/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createWatchlistEntitiesService } from './service';

describe('Watchlist entities service', () => {
  it('groups entity store ids by entity type and removes duplicates', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: { entity: { id: 'user:jdoe', type: 'user' } }, _index: '1' },
            { _source: { entity: { id: 'host:server-1', type: 'host' } }, _index: '2' },
            {
              _source: { entity: { id: 'service:api', EngineMetadata: { Type: 'service' } } },
              _index: '3',
            },
            { _source: { entity: { id: 'user:jdoe', type: 'user' } }, _index: '4' },
          ],
        },
      } as never)
      .mockResolvedValueOnce({
        hits: {
          hits: [],
        },
      } as never);

    const service = createWatchlistEntitiesService({
      esClient,
      namespace: 'default',
    });

    await expect(
      service.listEntityStoreEntities({
        type: 'index',
        field: 'user.id',
      })
    ).resolves.toEqual({
      user: ['user:jdoe'],
      host: ['host:server-1'],
      service: ['service:api'],
      generic: [],
    });

    expect(esClient.search).toHaveBeenCalledTimes(2);
  });
});
