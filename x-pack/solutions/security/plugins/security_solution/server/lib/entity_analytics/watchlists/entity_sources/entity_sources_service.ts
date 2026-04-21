/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/server';
import type { MonitoringEntitySource } from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { WatchlistEntitySourceClient } from './infra';
import type { IntegrationType } from './infra';
import { WatchlistConfigClient } from '../management/watchlist_config';
import type { IdentityProvider, WatchlistsByEuid } from '../entities/service';
import { createWatchlistEntitiesService } from '../entities/service';
import { getIndexForWatchlist } from '../entities/utils';
import { createIndexSyncService } from './sync/index_sync';
import { applyBulkRemoveSource } from './bulk/soft_delete';
import type { StaleEntity } from './bulk/soft_delete';
import { MANUAL_SOURCE_ID } from './manual/constants';

interface WatchlistMeta {
  name: string;
  id: string;
  index: string;
}

const DELETION_DETECTION_SOURCE_TYPES = ['index', 'store'] as const;

const buildIdentityProvider = (source: MonitoringEntitySource): IdentityProvider => {
  if (source.type === 'index') return { type: 'index', field: source.identifierField || '' };
  if (source.type === 'store') return { type: 'store', queryRule: source.queryRule || '' };
  return { type: 'integration', name: source.integrationName as IntegrationType };
};

/**
 * Generic paginated search that collects results page by page.
 * The `mapHit` callback extracts the desired value from each hit.
 */
const paginatedSearch = async <T>(
  esClient: ElasticsearchClient,
  params: {
    index: string;
    query: Record<string, unknown>;
    _source: string[] | false;
    sort: Array<Record<string, string>>;
  },
  mapHit: (hit: { _id?: string; _source?: unknown }) => T | undefined
): Promise<T[]> => {
  const results: T[] = [];
  let searchAfter: SortResults | undefined;
  const pageSize = 1000;

  while (true) {
    const response = await esClient.search({
      ...params,
      size: pageSize,
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });

    for (const hit of response.hits.hits) {
      const value = mapHit(hit);
      if (value !== undefined) results.push(value);
    }

    if (response.hits.hits.length < pageSize) break;
    searchAfter = response.hits.hits[response.hits.hits.length - 1].sort;
  }

  return results;
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

  /** Finds all entity docs in the watchlist index that belong to a specific source. */
  const findEntitiesBySource = (meta: WatchlistMeta, sourceId: string): Promise<StaleEntity[]> =>
    paginatedSearch(
      esClient,
      {
        index: meta.index,
        query: {
          bool: {
            must: [
              { term: { 'labels.source_ids': sourceId } },
              { term: { 'watchlist.id': meta.id } },
            ],
          },
        },
        _source: false,
        sort: [{ 'entity.id': 'asc' }],
      },
      (hit) => (hit._id ? { docId: hit._id, sourceId } : undefined)
    );

  /** Builds a map of euid → current watchlist memberships from the entity store. */
  const buildWatchlistsByEuid = async (meta: WatchlistMeta): Promise<WatchlistsByEuid> => {
    // Collect euids from the watchlist index
    const euids = await paginatedSearch<string>(
      esClient,
      {
        index: meta.index,
        query: { term: { 'watchlist.id': meta.id } },
        _source: ['entity.id'],
        sort: [{ 'entity.id': 'asc' }],
      },
      (hit) => (hit._source as { entity?: { id?: string } })?.entity?.id
    );

    if (euids.length === 0) return new Map();

    // Query entity store for current watchlist memberships
    const watchlistsByEuid: WatchlistsByEuid = new Map();
    const entityStoreIndex = getEntitiesAlias(ENTITY_LATEST, namespace);
    const pageSize = 1000;

    for (let i = 0; i < euids.length; i += pageSize) {
      const batch = euids.slice(i, i + pageSize);
      const response = await esClient.search<Record<string, unknown>>({
        index: entityStoreIndex,
        size: batch.length,
        query: { terms: { 'entity.id': batch } },
        _source: ['entity.id', 'entity.attributes.watchlists'],
      });

      for (const hit of response.hits.hits) {
        const src = hit._source as
          | { entity?: { id?: string; attributes?: { watchlists?: unknown } } }
          | undefined;
        const euid = src?.entity?.id;
        const raw = src?.entity?.attributes?.watchlists;
        if (!euid) {
          // skip
        } else if (Array.isArray(raw)) {
          watchlistsByEuid.set(euid, raw as string[]);
        } else if (typeof raw === 'string') {
          watchlistsByEuid.set(euid, [raw]);
        }
      }
    }

    return watchlistsByEuid;
  };

  /**
   * Removes entities from orphaned sources (sources that no longer exist but
   * still have entities in the watchlist index). Skips CSV and active sources.
   */
  const cleanupOrphanedEntities = async (meta: WatchlistMeta, activeSourceIds: string[] = []) => {
    const aggResponse = await esClient.search({
      index: meta.index,
      size: 0,
      query: { term: { 'watchlist.id': meta.id } },
      aggs: {
        source_ids: { terms: { field: 'labels.source_ids', size: 100 } },
      },
    });

    const excludedIds = new Set([MANUAL_SOURCE_ID, ...activeSourceIds]);
    const orphanedSourceIds: string[] = (
      (aggResponse.aggregations?.source_ids as { buckets: Array<{ key: string }> })?.buckets ?? []
    )
      .map((b) => b.key)
      .filter((id) => !excludedIds.has(id));

    if (orphanedSourceIds.length === 0) {
      logger.debug(`[WatchlistSync] No orphaned sources for watchlist ${meta.id}`);
      return;
    }

    const watchlistsByEuid = await buildWatchlistsByEuid(meta);

    for (const sourceId of orphanedSourceIds) {
      const staleEntities = await findEntitiesBySource(meta, sourceId);
      if (staleEntities.length === 0) {
        // No entities for this orphaned source
      } else {
        logger.info(
          `[WatchlistSync] Cleaning up ${staleEntities.length} entities for orphaned source ${sourceId}`
        );

        for (const sourceType of DELETION_DETECTION_SOURCE_TYPES) {
          await applyBulkRemoveSource({
            esClient,
            crudClient,
            logger,
            staleEntities,
            sourceType,
            watchlist: meta,
            watchlistsByEuid,
          });
        }
      }
    }
  };

  const syncWatchlist = async (watchlistId: string) => {
    const watchlist = await watchlistClient.get(watchlistId);
    const sourceIds = await watchlistClient.getEntitySourceIds(watchlistId);
    const meta: WatchlistMeta = {
      name: watchlist.name,
      id: watchlist.id || watchlistId,
      index: getIndexForWatchlist(namespace),
    };

    const { sources } = await descriptorClient.list({});
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
      watchlist: meta,
    });

    await indexSyncService.plainIndexSync(entitiesBySource);
    await cleanupOrphanedEntities(meta, sourceIds);

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
