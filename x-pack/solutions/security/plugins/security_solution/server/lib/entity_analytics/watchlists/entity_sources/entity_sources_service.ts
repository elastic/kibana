/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { EntityStoreDataClient } from '../../entity_store/entity_store_data_client';
import { MonitoringEntitySourceDescriptorClient } from '../../privilege_monitoring/saved_objects';
import { WatchlistConfigClient } from '../management/watchlist_config';
import { createWatchlistEntitiesService } from '../entities/service';
import { getIndexForWatchlist } from '../entities/utils';
import { createIndexSyncService } from './sync/index_sync';

export type EntitySourcesService = ReturnType<typeof createEntitySourcesService>;

export const createEntitySourcesService = ({
  esClient,
  entityStoreDataClient,
  soClient,
  logger,
  namespace,
}: {
  esClient: ElasticsearchClient;
  entityStoreDataClient: Pick<EntityStoreDataClient, 'searchEntities'>;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  namespace: string;
}) => {
  const watchlistClient = new WatchlistConfigClient({ esClient, soClient, logger, namespace });
  const descriptorClient = new MonitoringEntitySourceDescriptorClient({ soClient, namespace });
  const watchlistEntitiesService = createWatchlistEntitiesService({
    esClient,
    entityStoreDataClient,
    namespace,
  });

  const syncWatchlist = async (watchlistId: string) => {
    const watchlist = await watchlistClient.get(watchlistId);
    const sourceIds = await watchlistClient.getEntitySourceIds(watchlistId);
    const targetIndex = getIndexForWatchlist(watchlist.name, namespace);
    const entityStoreEntityIdsByType = await watchlistEntitiesService.listEntityStoreEntities();

    const indexSyncService = createIndexSyncService({
      esClient,
      logger,
      targetIndex,
      descriptorClient,
    });

    await indexSyncService.plainIndexSync({ sourceIds, entityStoreEntityIdsByType });

    logger.info(`[WatchlistSync] Completed sync for watchlist ${watchlistId} (${watchlist.name})`);
  };

  return { syncWatchlist };
};
