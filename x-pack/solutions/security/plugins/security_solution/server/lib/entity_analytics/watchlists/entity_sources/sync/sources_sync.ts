/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics';
import type { MonitoringEntitySourceDescriptorClient } from '../../../privilege_monitoring/saved_objects';

export type SourceProcessor = (source: MonitoringEntitySource) => Promise<void>;

export const createSourcesSyncService = ({ logger }: { logger: Logger }) => {
  const syncBySourceIds = async ({
    descriptorClient,
    sourceIds,
    process,
  }: {
    descriptorClient: MonitoringEntitySourceDescriptorClient;
    sourceIds: string[];
    process: SourceProcessor;
  }): Promise<void> => {
    if (sourceIds.length === 0) {
      logger.debug('[WatchlistSync] No entity sources linked to watchlist. Skipping sync.');
      return;
    }

    // Process sources sequentially to avoid race conditions
    for (const sourceId of sourceIds) {
      try {
        const source = await descriptorClient.get(sourceId);
        await process(source);
      } catch (error) {
        logger.warn(`[WatchlistSync] Source processing failed for ${sourceId}: ${String(error)}`);
      }
    }
  };

  return { syncBySourceIds };
};
