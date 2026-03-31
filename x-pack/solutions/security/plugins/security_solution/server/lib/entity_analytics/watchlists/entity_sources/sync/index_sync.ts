/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { WatchlistEntitySourceClient } from '../infra';
import { createSourcesSyncService } from './sources_sync';
import type { SyncSourceEntry } from './sources_sync';
import { createUpdateDetectionService } from './update_detection/update_detection';
import { createDeletionDetectionService } from './deletion_detection/deletion_detection';

export type IndexSyncService = ReturnType<typeof createIndexSyncService>;

export const createIndexSyncService = ({
  esClient,
  logger,
  targetIndex,
  descriptorClient,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  targetIndex: string;
  descriptorClient: WatchlistEntitySourceClient;
}) => {
  const updateDetectionService = createUpdateDetectionService({
    esClient,
    logger,
    targetIndex,
    descriptorClient,
  });
  const deletionDetectionService = createDeletionDetectionService({
    esClient,
    logger,
    targetIndex,
    descriptorClient,
  });
  const sourcesSyncService = createSourcesSyncService({ logger });

  const plainIndexSync = async (sources: SyncSourceEntry[]) => {
    await sourcesSyncService.syncBySourceIds({
      descriptorClient,
      sources,
      process: async (source, entityStoreEntityIdsByType, correlationMap) => {
        const entities = await updateDetectionService.updateDetection(
          source,
          entityStoreEntityIdsByType,
          correlationMap
        );
        const currentEuids = entities.map((e) => e.euid);
        await deletionDetectionService.deletionDetection(source, currentEuids);
      },
    });
  };

  return { plainIndexSync };
};
