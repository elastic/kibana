/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * The gate may widen its search beyond the run's time range when the range is empty.
 * Counting at least this far back keeps that behavior for recent alerts, while bounding
 * the query (7 days is also the default serverless search boost window).
 */
export const GATE_SCOPE_MIN_LOOKBACK = 'now-7d';

const DEFAULT_START = 'now-24h';
const DEFAULT_END = 'now';

/**
 * Counts the open and acknowledged, non-building-block alerts the ground-truthing gate could retrieve: those in the run's time range or the last 7 days.
 *
 * A missing alerts index counts as zero. Throws when any shard fails, so a partial count is never mistaken for zero.
 */
export const countGateScopeAlerts = async ({
  alertsIndexPattern,
  end,
  esClient,
  start,
}: {
  alertsIndexPattern: string;
  end?: string;
  esClient: ElasticsearchClient;
  start?: string;
}): Promise<number> => {
  const { _shards: shards, count } = await esClient.count({
    allow_no_indices: true,
    ignore_unavailable: true,
    index: alertsIndexPattern,
    query: {
      bool: {
        filter: [
          { terms: { 'kibana.alert.workflow_status': ['open', 'acknowledged'] } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                {
                  range: {
                    '@timestamp': {
                      format: 'strict_date_optional_time',
                      gte: start ?? DEFAULT_START,
                      lte: end ?? DEFAULT_END,
                    },
                  },
                },
                { range: { '@timestamp': { gte: GATE_SCOPE_MIN_LOOKBACK } } },
              ],
            },
          },
        ],
        must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
      },
    },
  });

  if ((shards?.failed ?? 0) > 0) {
    throw new Error(
      `Alert count was incomplete: ${shards.failed} of ${shards.total} shard(s) failed`
    );
  }

  return count;
};
