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
import { createIndexSyncService } from './index_sync';
import type { WatchlistDataSources } from '../../../../../../common/api/entity_analytics';
import type { EntityStoreEntityIdsByType, WatchlistsByEuid } from '../../entities/service';

// Only the entity-source ES writes (bulk upsert/remove) are mocked — update detection and
// deletion detection run for real, including sync marker handling, so this exercises the
// actual wiring between them.
jest.mock('../infra/entity_source_client');
jest.mock('../bulk/upsert');
jest.mock('../bulk/soft_delete');

const {
  WatchlistEntitySourceClient,
  mockGetLastProcessedMarker,
  mockUpdateLastProcessedMarker,
  mockGetLastFullSyncMarker,
  mockUpdateLastFullSyncMarker,
} = jest.requireMock('../infra/entity_source_client') as {
  WatchlistEntitySourceClient: jest.Mock;
  mockGetLastProcessedMarker: jest.Mock;
  mockUpdateLastProcessedMarker: jest.Mock;
  mockGetLastFullSyncMarker: jest.Mock;
  mockUpdateLastFullSyncMarker: jest.Mock;
};

const { applyBulkUpsert } = jest.requireMock('../bulk/upsert') as {
  applyBulkUpsert: jest.Mock;
};
const { applyBulkRemoveSource } = jest.requireMock('../bulk/soft_delete') as {
  applyBulkRemoveSource: jest.Mock;
};

const createMockCrudClient = (): jest.Mocked<CRUDClient> =>
  ({
    searchLatestEntities: jest
      .fn()
      .mockResolvedValue({ records: [], total: 0, inspect: { dsl: [], response: [] } }),
    bulkUpdateEntity: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<CRUDClient>);

const watchlist = {
  id: 'privileged-users-watchlist-id',
  name: 'Privileged Users',
  index: '.entity-analytics.watchlists.privileged-default',
};

const oktaSource: WatchlistDataSources.MonitoringEntitySource = {
  id: 'okta-source-id',
  type: 'entity_analytics_integration',
  name: 'okta',
  indexPattern: 'logs-entityanalytics_okta.user-default',
  integrationName: 'entityanalytics_okta',
  enabled: true,
  integrations: {
    syncMarkerIndex: 'logs-entityanalytics_okta.entity-default',
    syncData: {},
  },
};

describe('Watchlist index sync — demotion regression (update + deletion detection)', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let internalEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let dataEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    internalEsClient = elasticsearchServiceMock.createElasticsearchClient();
    dataEsClient = elasticsearchServiceMock.createElasticsearchClient();
    applyBulkUpsert.mockResolvedValue(undefined);
    applyBulkRemoveSource.mockResolvedValue(undefined);
    mockGetLastProcessedMarker.mockResolvedValue('2024-01-01T00:00:00Z');
    mockUpdateLastProcessedMarker.mockResolvedValue(undefined);
  });

  it('removes only the demoted user from the watchlist, keeping the still-privileged one', async () => {
    // Update detection: the source query (bounded by source.queryRule) now matches only
    // alice. Bob's latest doc shows a non-privileged role, so the aggregation no longer
    // returns him as a currently-matching entity.
    dataEsClient.search.mockResolvedValue({
      aggregations: {
        entities: {
          buckets: [
            {
              key: { euid: 'user:alice' },
              latest_doc: {
                hits: {
                  hits: [
                    { _source: { '@timestamp': '2024-03-01T00:00:00Z', 'user.name': 'alice' } },
                  ],
                },
              },
            },
          ],
          after_key: undefined,
        },
      },
    } as never);

    // No full sync has ever completed for this source before, so the first internalEsClient search call — the 'completed' sync marker
    // lookup inside detectNewFullSync — returns a completed event, which flags hasNewFullSync for the first time.
    mockGetLastFullSyncMarker.mockResolvedValue(undefined);
    internalEsClient.search
      .mockResolvedValueOnce({
        hits: { hits: [{ _id: 'marker-1', _source: { '@timestamp': '2024-03-01T00:00:00Z' } }] },
      } as never)
      // Second call is the 'started' marker lookup (getFullSyncWindowStart), used to widen
      // update detection's window since a new full sync was just detected.
      .mockResolvedValueOnce({
        hits: { hits: [{ _id: 'marker-0', _source: { '@timestamp': '2024-02-01T00:00:00Z' } }] },
      } as never)
      // Third call is deletion detection's stale-entity query against the watchlist index:
      // alice is excluded via must_not (she's in currentEuids), bob is not, so he comes back
      // as stale.
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'watchlist-doc-bob', _source: {}, sort: ['s'] }],
          total: { value: 1, relation: 'eq' },
        },
      } as never);

    const descriptorClient = new WatchlistEntitySourceClient({
      soClient: savedObjectsClientMock.create(),
      namespace: 'default',
    });

    const service = createIndexSyncService({
      internalEsClient,
      dataEsClient,
      crudClient: createMockCrudClient(),
      logger,
      descriptorClient,
      watchlist,
    });

    const entityStoreEntityIdsByType: EntityStoreEntityIdsByType = {
      user: ['user:alice', 'user:bob'],
      host: [],
      service: [],
      generic: [],
    };
    const watchlistsByEuid: WatchlistsByEuid = new Map([
      ['user:alice', [watchlist.name]],
      ['user:bob', [watchlist.name]],
    ]);

    // Resolved once, up front — this is what the caller (entity_sources_service.ts) reuses
    // across every page of a source's sync cycle instead of re-deriving it per page.
    const fullSyncState = await service.resolveFullSyncState(oktaSource);
    expect(fullSyncState).toEqual({
      hasNewFullSync: true,
      syncMarker: '2024-02-01T00:00:00Z',
      completedAt: '2024-03-01T00:00:00Z',
    });

    const [result] = await service.plainIndexSync(
      [{ source: oktaSource, entityStoreEntityIdsByType, watchlistsByEuid }],
      fullSyncState
    );

    // Only bob — absent from the update-detection result — gets removed.
    expect(applyBulkRemoveSource).toHaveBeenCalledTimes(1);
    expect(applyBulkRemoveSource).toHaveBeenCalledWith(
      expect.objectContaining({
        staleEntities: [{ docId: 'watchlist-doc-bob', sourceId: oktaSource.id }],
        sourceType: 'entity_analytics_integration',
      })
    );

    // Alice is still privileged — she's upserted, never removed.
    expect(applyBulkUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: [expect.objectContaining({ euid: 'user:alice', sourceId: oktaSource.id })],
      })
    );

    expect(result).toEqual({ sourceId: oktaSource.id, failed: false });
    await service.markFullSyncProcessed(oktaSource, fullSyncState.completedAt as string);
    expect(mockUpdateLastFullSyncMarker).toHaveBeenCalledWith(oktaSource, '2024-03-01T00:00:00Z');
  });

  it('does not persist the full-sync marker when deletion detection fails, so the next run retries it', async () => {
    dataEsClient.search.mockResolvedValue({
      aggregations: {
        entities: {
          buckets: [
            {
              key: { euid: 'user:alice' },
              latest_doc: {
                hits: {
                  hits: [
                    { _source: { '@timestamp': '2024-03-01T00:00:00Z', 'user.name': 'alice' } },
                  ],
                },
              },
            },
          ],
          after_key: undefined,
        },
      },
    } as never);

    mockGetLastFullSyncMarker.mockResolvedValue(undefined);
    internalEsClient.search
      .mockResolvedValueOnce({
        hits: { hits: [{ _id: 'marker-1', _source: { '@timestamp': '2024-03-01T00:00:00Z' } }] },
      } as never)
      .mockResolvedValueOnce({
        hits: { hits: [{ _id: 'marker-0', _source: { '@timestamp': '2024-02-01T00:00:00Z' } }] },
      } as never)
      // Deletion detection's stale-entity query fails transiently.
      .mockRejectedValueOnce(new Error('ES unavailable'));

    const descriptorClient = new WatchlistEntitySourceClient({
      soClient: savedObjectsClientMock.create(),
      namespace: 'default',
    });

    const service = createIndexSyncService({
      internalEsClient,
      dataEsClient,
      crudClient: createMockCrudClient(),
      logger,
      descriptorClient,
      watchlist,
    });

    const entityStoreEntityIdsByType: EntityStoreEntityIdsByType = {
      user: ['user:alice', 'user:bob'],
      host: [],
      service: [],
      generic: [],
    };
    const watchlistsByEuid: WatchlistsByEuid = new Map([
      ['user:alice', [watchlist.name]],
      ['user:bob', [watchlist.name]],
    ]);

    const fullSyncState = await service.resolveFullSyncState(oktaSource);

    // sourcesSyncService catches and logs per-source failures rather than throwing.
    const [result] = await service.plainIndexSync(
      [{ source: oktaSource, entityStoreEntityIdsByType, watchlistsByEuid }],
      fullSyncState
    );

    expect(result).toEqual({ sourceId: oktaSource.id, failed: true });
    expect(mockUpdateLastFullSyncMarker).not.toHaveBeenCalled();
    expect(applyBulkRemoveSource).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Source processing failed'));
  });

  it('does not remove anyone when the source has no syncMarkerIndex (pre-fix misconfiguration)', async () => {
    const sourceWithoutMarkerIndex: WatchlistDataSources.MonitoringEntitySource = {
      ...oktaSource,
      integrations: undefined,
    };

    // Same "bob demoted" update-detection result as above.
    dataEsClient.search.mockResolvedValue({
      aggregations: {
        entities: {
          buckets: [
            {
              key: { euid: 'user:alice' },
              latest_doc: {
                hits: {
                  hits: [
                    { _source: { '@timestamp': '2024-03-01T00:00:00Z', 'user.name': 'alice' } },
                  ],
                },
              },
            },
          ],
          after_key: undefined,
        },
      },
    } as never);

    const descriptorClient = new WatchlistEntitySourceClient({
      soClient: savedObjectsClientMock.create(),
      namespace: 'default',
    });

    const service = createIndexSyncService({
      internalEsClient,
      dataEsClient,
      crudClient: createMockCrudClient(),
      logger,
      descriptorClient,
      watchlist,
    });

    const entityStoreEntityIdsByType: EntityStoreEntityIdsByType = {
      user: ['user:alice', 'user:bob'],
      host: [],
      service: [],
      generic: [],
    };
    const watchlistsByEuid: WatchlistsByEuid = new Map([
      ['user:alice', [watchlist.name]],
      ['user:bob', [watchlist.name]],
    ]);

    await service.plainIndexSync([
      { source: sourceWithoutMarkerIndex, entityStoreEntityIdsByType, watchlistsByEuid },
    ]);

    // This is the bug: bob is demoted, but with no syncMarkerIndex, deletion detection never
    // even queries for stale entities, so he's never removed from the watchlist.
    expect(internalEsClient.search).not.toHaveBeenCalled();
    expect(applyBulkRemoveSource).not.toHaveBeenCalled();
  });
});
