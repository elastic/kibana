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

const { mockListEntitySources } = jest.requireMock('./infra/entity_source_client') as {
  mockListEntitySources: jest.Mock;
};

const { mockWatchlistGet, mockGetEntitySourceIds } = jest.requireMock(
  '../management/watchlist_config'
) as {
  mockWatchlistGet: jest.Mock;
  mockGetEntitySourceIds: jest.Mock;
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
        user: ['user:1'],
        host: [],
        service: [],
        generic: [],
      })
      .mockResolvedValueOnce({
        user: ['user:2'],
        host: ['host:1'],
        service: [],
        generic: [],
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
    expect(mockGetIndexForWatchlist).toHaveBeenCalledWith('VIP Users', namespace);

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
      },
      {
        sourceId: 'source-c',
        entityStoreEntityIdsByType: {
          user: ['user:2'],
          host: ['host:1'],
          service: [],
          generic: [],
        },
      },
    ]);

    expect(logger.info).toHaveBeenCalledWith(
      '[WatchlistSync] Completed sync for watchlist watchlist-1 (VIP Users)'
    );
  });
});
