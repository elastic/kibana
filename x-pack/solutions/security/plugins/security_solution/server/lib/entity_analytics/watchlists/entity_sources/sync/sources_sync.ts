/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import type { EntityStoreEntityIdsByType, WatchlistsByEuid } from '../../entities/service';
import type { CorrelationMap } from '../../entities/types';

export interface SyncSourceEntry {
  source: MonitoringEntitySource;
  entityStoreEntityIdsByType: EntityStoreEntityIdsByType;
  correlationMap?: CorrelationMap;
  watchlistsByEuid: WatchlistsByEuid;
  /** entity.id range for this page, used to scope deletion detection. */
  pageRange?: { gt?: string; lte?: string };
}

export type SourceProcessor = (
  source: MonitoringEntitySource,
  entityStoreEntityIdsByType: EntityStoreEntityIdsByType,
  correlationMap: CorrelationMap | undefined,
  watchlistsByEuid: WatchlistsByEuid,
  pageRange?: { gt?: string; lte?: string }
) => Promise<void>;

export const createSourcesSyncService = ({ logger }: { logger: Logger }) => {
  const syncBySourceIds = async ({
    sources,
    process,
  }: {
    sources: SyncSourceEntry[];
    process: SourceProcessor;
  }): Promise<void> => {
    if (sources.length === 0) {
      logger.debug('[WatchlistSync] No entity sources linked to watchlist. Skipping sync.');
      return;
    }

    for (const {
      source,
      entityStoreEntityIdsByType,
      correlationMap,
      watchlistsByEuid,
      pageRange,
    } of sources) {
      try {
        await process(
          source,
          entityStoreEntityIdsByType,
          correlationMap,
          watchlistsByEuid,
          pageRange
        );
      } catch (error) {
        logger.warn(`[WatchlistSync] Source processing failed for ${source.id}: ${String(error)}`);
      }
    }
  };

  return { syncBySourceIds };
};
