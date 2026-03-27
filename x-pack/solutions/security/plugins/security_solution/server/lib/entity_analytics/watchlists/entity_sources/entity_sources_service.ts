/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { WatchlistEntitySourceClient } from './infra';
import type { IntegrationType } from './infra';
import { WatchlistConfigClient } from '../management/watchlist_config';
import type { IdentityProvider } from '../entities/service';
import { createWatchlistEntitiesService } from '../entities/service';
import { getIndexForWatchlist } from '../entities/utils';
import { createIndexSyncService } from './sync/index_sync';

export type EntitySourcesService = ReturnType<typeof createEntitySourcesService>;

export const createEntitySourcesService = ({
  esClient,
  soClient,
  logger,
  namespace,
}: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  namespace: string;
}) => {
  const watchlistClient = new WatchlistConfigClient({ esClient, soClient, logger, namespace });
  const descriptorClient = new WatchlistEntitySourceClient({ soClient, namespace });
  const watchlistEntitiesService = createWatchlistEntitiesService({
    esClient,
    namespace,
  });

  const syncWatchlist = async (watchlistId: string) => {
    const watchlist = await watchlistClient.get(watchlistId);
    const sourceIds = await watchlistClient.getEntitySourceIds(watchlistId);
    const targetIndex = getIndexForWatchlist(watchlist.name, namespace);

    const { sources } = await descriptorClient.list({});
    const idp = (source: (typeof sources)[number]): IdentityProvider => {
      if (source.type === 'index') {
        return {
          type: 'index' as const,
          field: source.identifierField || '',
        };
      }

      return {
        type: 'integration' as const,
        name: source.integrationName as IntegrationType,
      };
    };
    const entitiesBySource = await Promise.all(
      sources
        .filter((s) => sourceIds.includes(s.id))
        .map(async (source) => {
          const entityStoreEntityIdsByType = await watchlistEntitiesService.listEntityStoreEntities(
            idp(source)
          );
          return { sourceId: source.id, entityStoreEntityIdsByType };
        })
    );

    const indexSyncService = createIndexSyncService({
      esClient,
      logger,
      targetIndex,
      descriptorClient,
    });

    await indexSyncService.plainIndexSync(entitiesBySource);

    logger.info(`[WatchlistSync] Completed sync for watchlist ${watchlistId} (${watchlist.name})`);
  };

  return { syncWatchlist };
};
