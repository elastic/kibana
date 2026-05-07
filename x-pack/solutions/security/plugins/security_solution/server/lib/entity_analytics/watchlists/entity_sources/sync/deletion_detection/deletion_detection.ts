/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { WatchlistsByEuid } from '../../../entities/service';
import type { MonitoringEntitySource } from '../../../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import type { WatchlistEntityDoc } from '../../../entities/types';
import type { WatchlistEntitySourceClient } from '../../infra';
import type { StaleEntity } from '../../bulk/soft_delete';
import { applyBulkRemoveSource } from '../../bulk/soft_delete';
import { createWatchlistSyncMarkersService } from '../sync_markers';

export type DeletionDetectionService = ReturnType<typeof createDeletionDetectionService>;

export const createDeletionDetectionService = ({
  esClient,
  crudClient,
  logger,
  descriptorClient,
  watchlist,
}: {
  esClient: ElasticsearchClient;
  crudClient: CRUDClient;
  logger: Logger;
  descriptorClient: WatchlistEntitySourceClient;
  watchlist: { name: string; id: string; index: string };
}) => {
  const syncMarkersService = createWatchlistSyncMarkersService(descriptorClient, esClient);

  const findStaleEntities = async (
    sourceId: string,
    currentEuids: string[],
    range?: { gt?: string; lte?: string }
  ): Promise<StaleEntity[]> => {
    const rangeFilter =
      range && (range.gt !== undefined || range.lte !== undefined)
        ? [
            {
              range: {
                'entity.id': {
                  ...(range.gt !== undefined ? { gt: range.gt } : {}),
                  ...(range.lte !== undefined ? { lte: range.lte } : {}),
                },
              },
            },
          ]
        : [];

    const query: Record<string, unknown> = {
      bool: {
        must: [
          { term: { 'labels.source_ids': sourceId } },
          { term: { 'watchlist.id': watchlist.id } },
          ...rangeFilter,
        ],
        ...(currentEuids.length > 0
          ? { must_not: [{ terms: { 'entity.id': currentEuids } }] }
          : {}),
      },
    };

    const allStaleEntities: StaleEntity[] = [];
    let searchAfter: SortResults | undefined;
    const pageSize = 1000;

    while (true) {
      const response = await esClient.search<WatchlistEntityDoc>({
        index: watchlist.index,
        size: pageSize,
        query,
        _source: false,
        sort: [{ 'entity.id': 'asc' }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
      });

      for (const hit of response.hits.hits) {
        if (hit._id) {
          allStaleEntities.push({ docId: hit._id, sourceId });
        }
      }

      if (response.hits.hits.length < pageSize) break;
      const lastHit = response.hits.hits[response.hits.hits.length - 1];
      searchAfter = lastHit.sort;
    }

    return allStaleEntities;
  };

  const deletionDetection = async (
    source: MonitoringEntitySource,
    currentEuids: string[],
    watchlistsByEuid: WatchlistsByEuid,
    range?: { gt?: string; lte?: string }
  ): Promise<void> => {
    if (source.type === 'entity_analytics_integration') {
      const hasNewFullSync = await syncMarkersService.detectNewFullSync(source);
      if (!hasNewFullSync) {
        logger.debug(
          `[WatchlistSync] No new full sync for source ${source.id}; skipping deletion detection.`
        );
        return;
      }
    }

    const staleEntities = await findStaleEntities(source.id, currentEuids, range);

    if (staleEntities.length === 0) {
      logger.debug(`[WatchlistSync] No stale entities for source ${source.id}`);
      return;
    }

    logger.info(
      `[WatchlistSync] Deletion detection: found ${staleEntities.length} stale entities for source ${source.id}`
    );

    await applyBulkRemoveSource({
      esClient,
      crudClient,
      logger,
      staleEntities,
      sourceType: source.type ?? 'index',
      watchlist,
      watchlistsByEuid,
    });
  };

  return { deletionDetection };
};
