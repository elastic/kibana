/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { WatchlistEntitySourceClient } from '../infra';
import type { EntityStoreEntityIdsByType } from '../../entities/service';
import { createSourcesSyncService } from './sources_sync';
import { createUpdateDetectionService } from './update_detection/update_detection';

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
  const sourcesSyncService = createSourcesSyncService({ logger });

  const plainIndexSync = async (
    sources: {
      sourceId: string;
      entityStoreEntityIdsByType: EntityStoreEntityIdsByType;
    }[]
  ) => {
    await sourcesSyncService.syncBySourceIds({
      descriptorClient,
      sources,
      process: async (source, entityStoreEntityIdsByType) => {
        await updateDetectionService.updateDetection(source, entityStoreEntityIdsByType);
      },
    });
  };

  return { plainIndexSync };
};
