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
    const entitiesBySource = await Promise.all(
      sources
        .filter((s) => sourceIds.includes(s.id))
        .map(async (source) => {
          if (source.type === 'index') {
            const identity: IdentityProvider = {
              type: 'index',
              field: source.identifierField || '',
            };
            const { correlationMap, entityIdsByType } =
              await watchlistEntitiesService.listEntityStoreEntities(identity);
            return {
              sourceId: source.id,
              entityStoreEntityIdsByType: entityIdsByType,
              correlationMap,
            };
          }

          if (source.type === 'store') {
            const identity: IdentityProvider = {
              type: 'store',
              queryRule: source.queryRule || '',
            };
            const entityStoreEntityIdsByType =
              await watchlistEntitiesService.listEntityStoreEntities(identity);
            return { sourceId: source.id, entityStoreEntityIdsByType };
          }

          const identity: IdentityProvider = {
            type: 'integration',
            name: source.integrationName as IntegrationType,
          };
          const entityStoreEntityIdsByType = await watchlistEntitiesService.listEntityStoreEntities(
            identity
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

  const syncAllWatchlists = async () => {
    const allWatchlists = await watchlistClient.list();
    // The id field is always present on persisted watchlists (set from saved object id);
    // it is only optional in the shared OpenAPI schema because create requests omit it.
    const watchlists = allWatchlists.filter((w): w is typeof w & { id: string } => w.id != null);

    if (watchlists.length === 0) {
      logger.debug(`No watchlists found for namespace "${namespace}". Skipping sync.`);
      return;
    }

    logger.debug(`Found ${watchlists.length} watchlist(s) to sync in namespace "${namespace}"`);

    for (const watchlist of watchlists) {
      try {
        logger.debug(`Syncing watchlist "${watchlist.name}" (${watchlist.id})`);
        await syncWatchlist(watchlist.id);
      } catch (err) {
        logger.error(
          `Failed to sync watchlist "${watchlist.name}" (${watchlist.id}): ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    logger.info(
      `[WatchlistSync] Completed sync of ${watchlists.length} watchlist(s) for namespace "${namespace}"`
    );
  };

  return { syncWatchlist, syncAllWatchlists };
};
