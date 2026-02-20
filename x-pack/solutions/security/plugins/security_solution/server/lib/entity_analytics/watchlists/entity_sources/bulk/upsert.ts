/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../common/api/entity_analytics';
import type { WatchlistBulkUser } from '../types';
import { getErrorFromBulkResponse, errorsMsg } from '../sync/utils';

/**
 * Upserts a user into the watchlist entity index.
 *
 * - Adds the source to the `labels.sources` and `labels.source_ids` arrays if not already present
 * - Updates `@timestamp` and `event.ingested` when the document is modified
 *
 * This allows multiple sources to independently contribute users,
 * with each source tracked via the labels arrays.
 */
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
  src.event.ingested = params.now;
}
`;

const buildCreateDoc = (user: WatchlistBulkUser, sourceLabel: string) => ({
  '@timestamp': new Date().toISOString(),
  user: { name: user.username },
  labels: { sources: [sourceLabel], source_ids: [user.sourceId] },
});

export const bulkUpsertOperationsFactory =
  (logger: Logger) =>
  <T extends WatchlistBulkUser>({
    users,
    sourceLabel,
    targetIndex,
  }: {
    users: T[];
    sourceLabel: string;
    targetIndex: string;
  }): object[] => {
    const ops: object[] = [];
    logger.debug(`[WatchlistSync] Building bulk operations for ${users.length} users`);
    for (const user of users) {
      if (user.existingUserId) {
        ops.push(
          { update: { _index: targetIndex, _id: user.existingUserId } },
          {
            script: {
              source: UPDATE_SCRIPT_SOURCE,
              params: {
                now: new Date().toISOString(),
                source_id: user.sourceId,
                source_type: 'index',
              },
            },
          }
        );
      } else {
        ops.push({ index: { _index: targetIndex } }, buildCreateDoc(user, sourceLabel));
      }
    }
    return ops;
  };

export const applyBulkUpsert = async ({
  esClient,
  logger,
  users,
  source,
  targetIndex,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  users: WatchlistBulkUser[];
  source: MonitoringEntitySource;
  targetIndex: string;
}) => {
  if (users.length === 0) {
    return;
  }

  const chunkSize = 500;
  const buildOps = bulkUpsertOperationsFactory(logger);

  for (let start = 0; start < users.length; start += chunkSize) {
    const chunk = users.slice(start, start + chunkSize);
    const operations = buildOps({
      users: chunk,
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
