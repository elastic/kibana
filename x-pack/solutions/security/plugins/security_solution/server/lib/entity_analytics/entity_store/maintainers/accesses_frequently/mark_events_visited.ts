/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { INDEX_PATTERN } from './constants';

export async function markEventsAsVisited(
  esClient: ElasticsearchClient,
  logger: Logger,
  documentIds: string[]
): Promise<number> {
  if (documentIds.length === 0) return 0;

  const body = documentIds.flatMap((id) => [
    { update: { _index: INDEX_PATTERN, _id: id } },
    { doc: { visited: true } },
  ]);

  const result = await esClient.bulk({ body, refresh: true });
  const failedCount = result.errors ? result.items.filter((i) => i.update?.error).length : 0;
  const updated = documentIds.length - failedCount;
  logger.info(`Marked ${updated} events as visited`);
  return updated;
}
