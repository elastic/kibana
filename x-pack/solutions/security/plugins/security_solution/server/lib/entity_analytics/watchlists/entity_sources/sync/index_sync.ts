/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';
import type { WatchlistEntitySourceClient } from '../infra';
import { createSourcesSyncService } from './sources_sync';
import type { SyncSourceEntry } from './sources_sync';
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
  const updateDetectionService = createUpdateDetectionService({
    internalEsClient,
    dataEsClient,
    crudClient,
    logger,
    descriptorClient,
    watchlist,
  });
  const deletionDetectionService = createDeletionDetectionService({
    esClient: internalEsClient,
    crudClient,
    logger,
    watchlist,
  });
  const sourcesSyncService = createSourcesSyncService({ logger });

  const plainIndexSync = async (sources: SyncSourceEntry[]) => {
    await sourcesSyncService.syncBySourceIds({
      sources,
      process: async (
        source,
        entityStoreEntityIdsByType,
        correlationMap,
        watchlistsByEuid,
        pageRange
      ) => {
        // updateDetection returns hasNewFullSync alongside entities because the two are tied
        // together: it's what decided whether `entities` was built from a full-sync window
        // (a complete snapshot) or just the incremental cursor (a partial delta). We pass it
        // on to deletionDetection so it knows which one it's getting — only a complete
        // snapshot is safe to use for deciding what's missing (and should be deleted).
        const { entities, hasNewFullSync } = await updateDetectionService.updateDetection(
          source,
          entityStoreEntityIdsByType,
          correlationMap,
          watchlistsByEuid
        );
        const currentEuids = entities.map((e) => e.euid);
        await deletionDetectionService.deletionDetection(
          source,
          currentEuids,
          watchlistsByEuid,
          pageRange,
          hasNewFullSync
        );
      },
    });
  };

  return { plainIndexSync };
};
