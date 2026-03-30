/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import type { WatchlistBulkEntity } from '../types';
import { getErrorFromBulkResponse, errorsMsg } from '../sync/utils';

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

const buildCreateDoc = (entity: WatchlistBulkEntity, sourceLabel: string) => {
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
  };
};

export const bulkUpsertOperationsFactory =
  (logger: Logger) =>
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
          buildCreateDoc(entity, sourceLabel)
        );
      }
    }
    return ops;
  };

export const applyBulkUpsert = async ({
  esClient,
  logger,
  entities,
  source,
  targetIndex,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  entities: WatchlistBulkEntity[];
  source: MonitoringEntitySource;
  targetIndex: string;
}) => {
  if (entities.length === 0) {
    return;
  }

  const chunkSize = 500;
  const buildOps = bulkUpsertOperationsFactory(logger);

  for (let start = 0; start < entities.length; start += chunkSize) {
    const chunk = entities.slice(start, start + chunkSize);
    const operations = buildOps({
      entities: chunk,
      sourceLabel: source.type ?? 'index',
      targetIndex,
    });
    if (operations.length > 0) {
      const resp = await esClient.bulk({ refresh: 'wait_for', body: operations });
      const errors = getErrorFromBulkResponse(resp);
      if (errors.length > 0) {
        logger.error(`[WatchlistSync] Bulk upsert errors: ${errorsMsg(errors)}`);
      }
    }
  }
};
