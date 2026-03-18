/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWatchlistEntitiesService } from './service';

describe('Watchlist entities service', () => {
  it('groups entity store ids by entity type and removes duplicates', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            { _source: { entity: { id: 'user:jdoe', type: 'user' } } },
            { _source: { entity: { id: 'host:server-1', type: 'host' } } },
            { _source: { entity: { id: 'service:api', EngineMetadata: { Type: 'service' } } } },
            { _source: { entity: { id: 'user:jdoe', type: 'user' } } },
          ],
        },
      }),
    };

    const service = createWatchlistEntitiesService({
      esClient: esClient as never,
      namespace: 'default',
    });

    await expect(service.listEntityStoreEntities()).resolves.toEqual({
      user: ['user:jdoe'],
      host: ['host:server-1'],
      service: ['service:api'],
      generic: [],
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
  });
});
