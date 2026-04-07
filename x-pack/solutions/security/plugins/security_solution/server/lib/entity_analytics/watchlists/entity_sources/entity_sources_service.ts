/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';
import type { MonitoringEntitySource } from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { WatchlistEntitySourceClient } from './infra';
import type { IntegrationType } from './infra';
import { WatchlistConfigClient } from '../management/watchlist_config';
import type { IdentityProvider } from '../entities/service';
import { createWatchlistEntitiesService } from '../entities/service';
import { getIndexForWatchlist } from '../entities/utils';
import { createIndexSyncService } from './sync/index_sync';

const buildIdentityProvider = (source: MonitoringEntitySource): IdentityProvider => {
  if (source.type === 'index') return { type: 'index', field: source.identifierField || '' };
  if (source.type === 'store') return { type: 'store', queryRule: source.queryRule || '' };
  return { type: 'integration', name: source.integrationName as IntegrationType };
};

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
  const crudClient = new CRUDClient({ logger, esClient, namespace });
  const watchlistEntitiesService = createWatchlistEntitiesService({
    esClient,
    namespace,
  });

  const syncWatchlist = async (watchlistId: string) => {
    const watchlist = await watchlistClient.get(watchlistId);
    const sourceIds = await watchlistClient.getEntitySourceIds(watchlistId);
    const targetIndex = getIndexForWatchlist(namespace);

    const { sources } = await descriptorClient.list({}); // default to 10 sources, each watchlist has 1/2 sources so this is ok for now but not ideal.
    const entitiesBySource = await Promise.all(
      sources
        .filter((s) => sourceIds.includes(s.id))
        .map(async (source) => {
          const identity = buildIdentityProvider(source);
          const { entityIdsByType, watchlistsByEuid, ...rest } =
            await watchlistEntitiesService.listEntityStoreEntities(identity);
          return {
            sourceId: source.id,
            entityStoreEntityIdsByType: entityIdsByType,
            watchlistsByEuid,
            ...rest,
          };
        })
    );

    const indexSyncService = createIndexSyncService({
      esClient,
      crudClient,
      logger,
      descriptorClient,
      watchlist: { name: watchlist.name, id: watchlist.id || watchlistId, index: targetIndex },
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
