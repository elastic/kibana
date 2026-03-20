/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient as EsClient } from '@kbn/core/server';
import type {
  IndexName,
  Names,
  ReindexRequest,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';

export interface ReindexOptions {
  source: { index: Names; query?: QueryDslQueryContainer };
  dest: { index: IndexName };
  signal?: AbortSignal;
}

export const reindex = async (
  esClient: EsClient,
  options: ReindexOptions
): Promise<{ created: number; total: number }> => {
  const { source, dest, signal } = options;
  const body: ReindexRequest = {
    source: { index: source.index, query: source.query },
    dest: { index: dest.index },
    wait_for_completion: true,
    refresh: true,
    conflicts: 'proceed',
  };
  const response = await esClient.reindex(body, { signal });
  const created = response.created ?? 0;
  const total = response.total ?? 0;
  return { created, total };
};
