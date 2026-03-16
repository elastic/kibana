/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWatchlistEntitiesService } from './service';

describe('Watchlist entities service', () => {
  it('groups entity store ids by entity type and removes duplicates', async () => {
    const service = createWatchlistEntitiesService({
      esClient: { search: jest.fn() } as never,
      entityStoreDataClient: {
        searchEntities: jest.fn().mockResolvedValue({
          records: [
            { entity: { id: 'user:jdoe', type: 'user' } },
            { entity: { id: 'host:server-1', type: 'host' } },
            { entity: { id: 'service:api', EngineMetadata: { Type: 'service' } } },
            { entity: { id: 'user:jdoe', type: 'user' } },
          ],
        }),
      } as never,
      namespace: 'default',
    });

    await expect(service.listEntityStoreEntities()).resolves.toEqual({
      user: ['user:jdoe'],
      host: ['host:server-1'],
      service: ['service:api'],
      generic: [],
    });
  });
});
