/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { createWatchlistMaintainer } from './watchlist_maintainer';

const mockSyncAllWatchlists = jest.fn();

jest.mock('../entity_sources/entity_sources_service', () => ({
  createEntitySourcesService: jest.fn(() => ({
    syncAllWatchlists: (...args: unknown[]) => mockSyncAllWatchlists(...args),
  })),
}));

describe('watchlist maintainer run', () => {
  const logger = loggingSystemMock.createLogger();
  const internalEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const getScopedClient = jest.fn();
  const hasAtLeast = jest.fn();

  const getStartServices = jest.fn();

  const run = () => {
    const { run: maintainerRun } = createWatchlistMaintainer({
      getStartServices,
      logger,
      hasEncryptionKey: true,
    });
    return maintainerRun({
      status: { metadata: { namespace: 'new-space' }, state: {} },
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      fakeRequest: httpServerMock.createKibanaRequest(),
      signal: new AbortController().signal,
    } as unknown as Parameters<typeof maintainerRun>[0]);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    hasAtLeast.mockReturnValue(true);
    getScopedClient.mockReturnValue(savedObjectsClientMock.create());
    internalEsClient.indices.exists.mockReset().mockResolvedValue(false);
    internalEsClient.indices.create.mockReset().mockResolvedValue({ acknowledged: true } as never);
    mockSyncAllWatchlists.mockResolvedValue(undefined);
    getStartServices.mockResolvedValue([
      {
        savedObjects: { getScopedClient },
        elasticsearch: { client: { asInternalUser: internalEsClient } },
      },
      { licensing: { getLicense: async () => ({ hasAtLeast }) } },
    ]);
  });

  it('creates the watchlist index for the space when it is missing, then syncs', async () => {
    await run();

    expect(internalEsClient.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({ index: '.entity_analytics.watchlists.new-space' })
    );
    expect(mockSyncAllWatchlists).toHaveBeenCalledTimes(1);
  });

  it('does not recreate the index when it already exists', async () => {
    internalEsClient.indices.exists.mockResolvedValue(true);

    await run();

    expect(internalEsClient.indices.create).not.toHaveBeenCalled();
    expect(mockSyncAllWatchlists).toHaveBeenCalledTimes(1);
  });

  it('still syncs when the index cannot be created', async () => {
    internalEsClient.indices.create.mockRejectedValue(new Error('cluster blocked'));

    await run();

    expect(mockSyncAllWatchlists).toHaveBeenCalledTimes(1);
  });

  it('does nothing below the platinum license', async () => {
    hasAtLeast.mockReturnValue(false);

    await run();

    expect(internalEsClient.indices.create).not.toHaveBeenCalled();
    expect(mockSyncAllWatchlists).not.toHaveBeenCalled();
  });
});
