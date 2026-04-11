/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import type { WatchlistEntitySourceClient } from '../infra';
import type { EntityStoreEntityIdsByType } from '../../entities/service';
import type { CorrelationMap } from '../../entities/types';

export interface SyncSourceEntry {
  sourceId: string;
  entityStoreEntityIdsByType: EntityStoreEntityIdsByType;
  correlationMap?: CorrelationMap;
}

export type SourceProcessor = (
  source: MonitoringEntitySource,
  entityStoreEntityIdsByType: EntityStoreEntityIdsByType,
  correlationMap?: CorrelationMap
) => Promise<void>;

export const createSourcesSyncService = ({ logger }: { logger: Logger }) => {
  const syncBySourceIds = async ({
    descriptorClient,
    sources,
    process,
  }: {
    descriptorClient: WatchlistEntitySourceClient;
    sources: SyncSourceEntry[];
    process: SourceProcessor;
  }): Promise<void> => {
    if (sources.length === 0) {
      logger.debug('[WatchlistSync] No entity sources linked to watchlist. Skipping sync.');
      return;
    }

    // Process sources sequentially to avoid race conditions
    for (const { sourceId, entityStoreEntityIdsByType, correlationMap } of sources) {
      try {
        const source = await descriptorClient.get(sourceId);
        await process(source, entityStoreEntityIdsByType, correlationMap);
      } catch (error) {
        logger.warn(`[WatchlistSync] Source processing failed for ${sourceId}: ${String(error)}`);
      }
    }
  };

  return { syncBySourceIds };
};
