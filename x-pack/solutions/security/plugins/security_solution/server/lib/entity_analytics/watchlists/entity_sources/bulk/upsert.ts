/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import type { WatchlistBulkEntity } from '../types';
import { getErrorFromBulkResponse, errorsMsg } from '../sync/utils';
import { addWatchlistAttributeToStore } from '../sync/entity_store_sync';

export const UPDATE_SCRIPT_SOURCE = `
def src = ctx._source;
boolean modified = false;

if (src.labels == null) { src.labels = new HashMap(); }
if (src.labels.source_ids == null) { src.labels.source_ids = new ArrayList(); }
if (!src.labels.source_ids.contains(params.source_id)) {
  src.labels.source_ids.add(params.source_id);
  modified = true;
}
if (src.labels.sources == null) { src.labels.sources = new ArrayList(); }
if (!src.labels.sources.contains(params.source_type)) {
  src.labels.sources.add(params.source_type);
  modified = true;
}

if (modified) {
  src['@timestamp'] = params.now;
  if (src.event == null) { src.event = new HashMap(); }
  src.event.ingested = params.now;
}
`;

const buildCreateDoc = (
  entity: WatchlistBulkEntity,
  sourceLabel: string,
  watchlist: { name: string; id: string }
) => {
  const now = new Date().toISOString();
  return {
    '@timestamp': now,
    event: { ingested: now },
    entity: {
      id: entity.euid,
      name: entity.name,
      type: entity.type,
    },
    labels: { sources: [sourceLabel], source_ids: [entity.sourceId] },
    watchlist,
  };
};

export const bulkUpsertOperationsFactory =
  (logger: Logger, watchlist: { name: string; id: string }) =>
  ({
    entities,
    sourceLabel,
    targetIndex,
  }: {
    entities: WatchlistBulkEntity[];
    sourceLabel: string;
    targetIndex: string;
  }): object[] => {
    const ops: object[] = [];
    logger.debug(`[WatchlistSync] Building bulk operations for ${entities.length} entities`);
    for (const entity of entities) {
      if (entity.existingEntityId) {
        ops.push(
          { update: { _index: targetIndex, _id: entity.existingEntityId } },
          {
            script: {
              source: UPDATE_SCRIPT_SOURCE,
              params: {
                now: new Date().toISOString(),
                source_id: entity.sourceId,
                source_type: sourceLabel,
              },
            },
          }
        );
      } else {
        ops.push(
          { index: { _index: targetIndex, _id: entity.euid } },
          buildCreateDoc(entity, sourceLabel, watchlist)
        );
      }
    }
    return ops;
  };

export const applyBulkUpsert = async ({
  esClient,
  crudClient,
  logger,
  entities,
  source,
  watchlist,
}: {
  esClient: ElasticsearchClient;
  crudClient: CRUDClient;
  logger: Logger;
  entities: WatchlistBulkEntity[];
  source: MonitoringEntitySource;
  watchlist: { name: string; id: string; index: string };
}) => {
  if (entities.length === 0) {
    return;
  }

  const chunkSize = 500;
  const buildOps = bulkUpsertOperationsFactory(logger, watchlist);

  for (let start = 0; start < entities.length; start += chunkSize) {
    const chunk = entities.slice(start, start + chunkSize);
    const operations = buildOps({
      entities: chunk,
      sourceLabel: source.type ?? 'index',
      targetIndex: watchlist.index,
    });
    if (operations.length > 0) {
      const resp = await esClient.bulk({ refresh: 'wait_for', body: operations });
      const errors = getErrorFromBulkResponse(resp);
      if (errors.length > 0) {
        logger.error(`[WatchlistSync] Bulk upsert errors: ${errorsMsg(errors)}`);
      }
    }
  }

  await addWatchlistAttributeToStore({
    crudClient,
    logger,
    entityRefs: entities.map((e) => ({
      euid: e.euid,
      type: e.type,
      currentWatchlists: e.currentWatchlists,
    })),
    watchlistId: watchlist.id,
  });
};
