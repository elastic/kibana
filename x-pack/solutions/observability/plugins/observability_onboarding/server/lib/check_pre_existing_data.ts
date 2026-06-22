/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { estypes } from '@elastic/elasticsearch';

const PRE_CHECK_WINDOW_MS = 300_000;

/**
 * Checks whether data was actively flowing into the given indices
 * in the 5 minutes before `start`. If it was, time-range-based
 * has-data detection is likely to produce false positives.
 *
 * Returns `false` on any error so it never blocks the main flow.
 */
export const checkPreExistingData = async (
  esClient: ElasticsearchClient,
  indices: string[],
  start: string
): Promise<boolean> => {
  try {
    const startMs = new Date(start).getTime();
    const windowStart = new Date(startMs - PRE_CHECK_WINDOW_MS).toISOString();

    const result = await esClient.search({
      index: indices,
      ignore_unavailable: true,
      allow_partial_search_results: true,
      size: 0,
      terminate_after: 1,
      query: {
        bool: {
          filter: [{ range: { '@timestamp': { gte: windowStart, lt: start } } }],
        },
      },
    });

    return (result.hits.total as estypes.SearchTotalHits).value > 0;
  } catch {
    return false;
  }
};
