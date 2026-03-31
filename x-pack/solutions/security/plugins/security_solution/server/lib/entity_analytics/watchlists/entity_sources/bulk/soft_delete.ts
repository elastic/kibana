/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';
import type { EntityType } from '@kbn/entity-store/common';
import type { WatchlistsByEuid } from '../../entities/service';
import { getErrorFromBulkResponse, errorsMsg } from '../sync/utils';
import { removeWatchlistAttributeFromStore } from '../sync/entity_store_sync';

export interface StaleEntity {
  docId: string;
  sourceId: string;
}

/**
 * Painless script that removes a source from an entity document.
 * - Removes `params.source_id` from `labels.source_ids`
 * - If `source_ids` is now empty, removes `params.source_type` from `labels.sources`
 * - If `sources` is now empty, hard-deletes the document via `ctx.op = 'delete'`
 */
export const REMOVE_SOURCE_SCRIPT = `
if (ctx._source.labels?.source_ids != null) {
  ctx._source.labels.source_ids.removeIf(sid -> sid == params.source_id);
}

if (ctx._source.labels?.source_ids == null || ctx._source.labels.source_ids.isEmpty()) {
  if (ctx._source.labels?.sources != null) {
    ctx._source.labels.sources.removeIf(src -> src == params.source_type);
  }
}

if (ctx._source.labels?.sources == null || ctx._source.labels.sources.isEmpty()) {
  ctx.op = 'delete';
} else {
  ctx._source['@timestamp'] = params.now;
  if (ctx._source.event == null) { ctx._source.event = new HashMap(); }
  ctx._source.event.ingested = params.now;
}
`;

export const bulkRemoveSourceOperationsFactory =
  (logger: Logger) =>
  ({
    staleEntities,
    sourceType,
    targetIndex,
  }: {
    staleEntities: StaleEntity[];
    sourceType: string;
    targetIndex: string;
  }): object[] => {
    const ops: object[] = [];
    const now = new Date().toISOString();
    logger.debug(
      `[WatchlistSync] Building bulk remove-source operations for ${staleEntities.length} entities`
    );
    for (const entity of staleEntities) {
      ops.push(
        { update: { _index: targetIndex, _id: entity.docId } },
        {
          script: {
            source: REMOVE_SOURCE_SCRIPT,
            params: {
              source_id: entity.sourceId,
              source_type: sourceType,
              now,
            },
          },
        }
      );
    }
    return ops;
  };

export const applyBulkRemoveSource = async ({
  esClient,
  crudClient,
  logger,
  staleEntities,
  sourceType,
  watchlistsByEuid,
  watchlist,
}: {
  esClient: ElasticsearchClient;
  crudClient: CRUDClient;
  logger: Logger;
  staleEntities: StaleEntity[];
  sourceType: string;
  watchlistsByEuid: WatchlistsByEuid;
  watchlist: { name: string; id: string; index: string };
}): Promise<void> => {
  if (staleEntities.length === 0) {
    return;
  }

  const chunkSize = 500;
  const buildOps = bulkRemoveSourceOperationsFactory(logger);
  const hardDeletedEuids: string[] = [];

  for (let start = 0; start < staleEntities.length; start += chunkSize) {
    const chunk = staleEntities.slice(start, start + chunkSize);
    const operations = buildOps({ staleEntities: chunk, sourceType, targetIndex: watchlist.index });
    if (operations.length > 0) {
      const resp = await esClient.bulk({ refresh: 'wait_for', body: operations });
      const errors = getErrorFromBulkResponse(resp);
      if (errors.length > 0) {
        logger.error(`[WatchlistSync] Bulk remove-source errors: ${errorsMsg(errors)}`);
      }

      for (let i = 0; i < chunk.length; i++) {
        const item = resp.items[i];
        const result = item?.update?.result;
        if (result === 'deleted') {
          hardDeletedEuids.push(chunk[i].docId);
        }
      }
    }
  }

  if (hardDeletedEuids.length > 0) {
    await removeWatchlistAttributeFromStore({
      crudClient,
      logger,
      entityRefs: hardDeletedEuids.map((euid) => ({
        euid,
        type: euid.split(':')[0] as EntityType,
        currentWatchlists: watchlistsByEuid.get(euid),
      })),
      watchlistId: watchlist.id,
    });
  }
};
