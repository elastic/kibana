/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics';
import type { MonitoringEntitySourceDescriptorClient } from '../../../privilege_monitoring/saved_objects';
import type { EntityStoreEntityIdsByType } from '../../entities/service';

export type SourceProcessor = (
  source: MonitoringEntitySource,
  entityStoreEntityIdsByType: EntityStoreEntityIdsByType
) => Promise<void>;

export const createSourcesSyncService = ({ logger }: { logger: Logger }) => {
  const syncBySourceIds = async ({
    descriptorClient,
    sources,
    process,
  }: {
    descriptorClient: MonitoringEntitySourceDescriptorClient;
    sources: { sourceId: string; entityStoreEntityIdsByType: EntityStoreEntityIdsByType }[];
    process: SourceProcessor;
  }): Promise<void> => {
    if (sources.length === 0) {
      logger.debug('[WatchlistSync] No entity sources linked to watchlist. Skipping sync.');
      return;
    }

    // Process sources sequentially to avoid race conditions
    for (const { sourceId, entityStoreEntityIdsByType } of sources) {
      try {
        const source = await descriptorClient.get(sourceId);
        await process(source, entityStoreEntityIdsByType);
      } catch (error) {
        logger.warn(`[WatchlistSync] Source processing failed for ${sourceId}: ${String(error)}`);
      }
    }
  };

  return { syncBySourceIds };
};
