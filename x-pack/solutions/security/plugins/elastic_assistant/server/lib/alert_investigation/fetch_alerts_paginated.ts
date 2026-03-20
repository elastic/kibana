/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

const FETCH_PAGE_SIZE = 100;
const MAX_TOTAL_ALERTS = 5000;

interface AlertHit {
  _id: string;
  _source: Record<string, unknown>;
  sort?: unknown[];
}

/**
 * Fetches unprocessed alerts using PIT (Point-in-Time) and search_after
 * for memory-safe pagination over large result sets.
 */
export const fetchAlertsPaginated = async ({
  esClient,
  spaceId,
  lookbackMinutes,
  maxAlerts = MAX_TOTAL_ALERTS,
  logger,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  lookbackMinutes: number;
  maxAlerts?: number;
  logger: Logger;
}): Promise<{ alerts: AlertHit[]; totalFetched: number }> => {
  const index =
    spaceId === 'default'
      ? '.alerts-security.alerts-default'
      : `.alerts-security.alerts-${spaceId}`;

  const now = new Date();
  const lookbackTime = new Date(now.getTime() - lookbackMinutes * 60 * 1000);
  const cap = Math.min(maxAlerts, MAX_TOTAL_ALERTS);
  const pageSize = Math.min(FETCH_PAGE_SIZE, cap);

  let pit: { id: string } | undefined;
  const allAlerts: AlertHit[] = [];

  try {
    const pitResponse = await esClient.openPointInTime({
      index,
      keep_alive: '2m',
    });
    pit = { id: pitResponse.id };

    let searchAfter: unknown[] | undefined;
    let keepSearching = true;

    while (keepSearching && allAlerts.length < cap) {
      const remaining = cap - allAlerts.length;
      const currentSize = Math.min(pageSize, remaining);

      const searchParams: Record<string, unknown> = {
        pit: { id: pit.id, keep_alive: '2m' },
        query: {
          bool: {
            filter: [
              { terms: { 'kibana.alert.workflow_status': ['open', 'acknowledged'] } },
              { range: { '@timestamp': { gte: lookbackTime.toISOString() } } },
              {
                bool: {
                  must_not: [
                    { exists: { field: 'kibana.alert.building_block_type' } },
                    { exists: { field: 'kibana.alert.pipeline.processed' } },
                  ],
                },
              },
            ],
          },
        },
        sort: [
          { 'kibana.alert.risk_score': { order: 'desc' as const } },
          { _shard_doc: 'asc' as const },
        ],
        size: currentSize,
      };

      if (searchAfter) {
        searchParams.search_after = searchAfter;
      }

      const result = await esClient.search(searchParams);

      const hits = result.hits.hits;
      if (hits.length === 0) {
        keepSearching = false;
        break;
      }

      for (const hit of hits) {
        if (hit._id != null) {
          allAlerts.push({
            _id: hit._id,
            _source: (hit._source ?? {}) as Record<string, unknown>,
            sort: hit.sort,
          });
        }
      }

      const lastHit = hits[hits.length - 1];
      searchAfter = lastHit?.sort;

      if (hits.length < currentSize) {
        keepSearching = false;
      }
    }

    logger.info(
      `fetchAlertsPaginated: fetched ${allAlerts.length} alerts from '${index}' using PIT`
    );
  } finally {
    if (pit) {
      try {
        await esClient.closePointInTime({ id: pit.id });
      } catch (closeError) {
        logger.warn(
          `Failed to close PIT: ${closeError instanceof Error ? closeError.message : closeError}`
        );
      }
    }
  }

  return { alerts: allAlerts, totalFetched: allAlerts.length };
};
