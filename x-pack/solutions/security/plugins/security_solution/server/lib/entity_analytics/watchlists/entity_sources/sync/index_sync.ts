/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';
import type { WatchlistDataSources } from '../../../../../../common/api/entity_analytics';
import type { WatchlistEntitySourceClient } from '../infra';
import { createSourcesSyncService } from './sources_sync';
import type { SyncResult, SyncSourceEntry } from './sources_sync';
import { createWatchlistSyncMarkersService } from './sync_markers';
import type { FullSyncState } from './update_detection/update_detection';
import { createUpdateDetectionService } from './update_detection/update_detection';
import { createDeletionDetectionService } from './deletion_detection/deletion_detection';

export type IndexSyncService = ReturnType<typeof createIndexSyncService>;

export const createIndexSyncService = ({
  internalEsClient,
  dataEsClient,
  crudClient,
  logger,
  descriptorClient,
  watchlist,
}: {
  internalEsClient: ElasticsearchClient;
  dataEsClient: ElasticsearchClient;
  crudClient: CRUDClient;
  logger: Logger;
  descriptorClient: WatchlistEntitySourceClient;
  watchlist: { name: string; id: string; index: string };
}) => {
  const syncMarkersService = createWatchlistSyncMarkersService(descriptorClient, internalEsClient);

  const updateDetectionService = createUpdateDetectionService({
    internalEsClient,
    dataEsClient,
    crudClient,
    logger,
    syncMarkersService,
    watchlist,
  });
  const deletionDetectionService = createDeletionDetectionService({
    esClient: internalEsClient,
    crudClient,
    logger,
    watchlist,
  });
  const sourcesSyncService = createSourcesSyncService({ logger });

  /**
   * Resolves whether a new full sync has completed for this source, and the window to use for
   * it, exactly once per sync cycle.
   */
  const resolveFullSyncState = async (
    source: WatchlistDataSources.MonitoringEntitySource
  ): Promise<FullSyncState & { completedAt?: string }> => {
    if (source.type !== 'entity_analytics_integration') {
      return { hasNewFullSync: false };
    }

    const { hasNewFullSync, completedAt } = await syncMarkersService.detectNewFullSync(source);
    if (!hasNewFullSync || !completedAt) {
      return { hasNewFullSync: false };
    }

    const syncMarker = await syncMarkersService.getFullSyncWindowStart(source, completedAt);
    return { hasNewFullSync: true, syncMarker, completedAt };
  };

  const plainIndexSync = async (
    sources: SyncSourceEntry[],
    fullSyncState?: FullSyncState
  ): Promise<SyncResult[]> =>
    sourcesSyncService.syncBySourceIds({
      sources,
      process: async (
        source,
        entityStoreEntityIdsByType,
        correlationMap,
        watchlistsByEuid,
        pageRange
      ) => {
        const { entities } = await updateDetectionService.updateDetection(
          source,
          entityStoreEntityIdsByType,
          correlationMap,
          watchlistsByEuid,
          fullSyncState
        );
        const currentEuids = entities.map((e) => e.euid);
        await deletionDetectionService.deletionDetection(
          source,
          currentEuids,
          watchlistsByEuid,
          pageRange,
          fullSyncState?.hasNewFullSync
        );
      },
    });

  const markFullSyncProcessed = async (
    source: WatchlistDataSources.MonitoringEntitySource,
    completedAt: string
  ): Promise<void> => {
    await syncMarkersService.markFullSyncProcessed(source, completedAt);
  };

  return { plainIndexSync, resolveFullSyncState, markFullSyncProcessed };
};
