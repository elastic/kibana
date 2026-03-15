/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import { createWatchlistEntitiesService } from './service';

describe('createWatchlistEntitiesService', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const watchlist: WatchlistObject = {
    id: 'watchlist-id',
    name: 'vip-users',
    managed: false,
    riskModifier: 1.5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns zero counts and skips bulk when no entities are provided', async () => {
    const service = createWatchlistEntitiesService({
      esClient,
      namespace: 'default',
    });

    await expect(service.add(watchlist, [])).resolves.toEqual({
      added: 0,
      failed: 0,
    });

    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('bulk indexes entities into the watchlist index', async () => {
    esClient.bulk.mockResolvedValue({
      items: [{ index: { _id: '1' } }, { index: { _id: '2' } }],
      errors: false,
    } as never);

    const service = createWatchlistEntitiesService({
      esClient,
      namespace: 'default',
    });
    const entities = [
      { entity: { id: 'user-1', name: 'alice' } },
      { entity: { id: 'user-2', name: 'bob' } },
    ];

    await expect(service.add(watchlist, entities)).resolves.toEqual({
      added: 2,
      failed: 0,
    });

    expect(esClient.bulk).toHaveBeenCalledWith({
      index: '.entity-analytics.watchlists.vip-users-default',
      operations: [{ index: {} }, entities[0], { index: {} }, entities[1]],
      refresh: 'wait_for',
    });
  });

  it('counts failed bulk items in the response', async () => {
    esClient.bulk.mockResolvedValue({
      items: [
        { index: { _id: '1' } },
        {
          index: {
            error: {
              type: 'mapper_parsing_exception',
              reason: 'failed to parse field',
            },
          },
        },
      ],
      errors: true,
    } as never);

    const service = createWatchlistEntitiesService({
      esClient,
      namespace: 'default',
    });

    await expect(
      service.add(watchlist, [
        { entity: { id: 'user-1', name: 'alice' } },
        { entity: { id: 'user-2', name: 'bob' } },
      ])
    ).resolves.toEqual({
      added: 1,
      failed: 1,
    });
  });
});
