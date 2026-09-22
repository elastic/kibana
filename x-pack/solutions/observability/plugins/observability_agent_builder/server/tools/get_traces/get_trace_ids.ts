/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { TRACE_ID } from '@kbn/apm-types';
import { getTypedSearch } from '../../utils/get_typed_search';
import { kqlFilter as buildKqlFilter, timeRangeFilter } from '../../utils/dsl_filters';

export async function getTraceIds({
  esClient,
  indices,
  startTime,
  endTime,
  kqlFilter,
  logger,
  maxTraces,
}: {
  esClient: IScopedClusterClient;
  indices: string[];
  startTime: number;
  endTime: number;
  kqlFilter: string | undefined;
  logger: Logger;
  maxTraces: number;
}): Promise<string[]> {
  const search = getTypedSearch(esClient.asCurrentUser);

  // `samplerShardSize` controls how many documents are considered per shard for the nested terms agg.
  const samplerShardSize = Math.max(200, maxTraces * 10);
  const searchRequest = {
    size: 0,
    track_total_hits: false,
    index: indices,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
          ...buildKqlFilter(kqlFilter),
          // Only consider documents that contain trace.id
          { exists: { field: TRACE_ID } },
        ],
      },
    },
    aggs: {
      sample: {
        sampler: {
          shard_size: samplerShardSize, // perf optimization to limit aggs to top N entires per shard
        },
        aggs: {
          trace_ids: {
            terms: {
              field: TRACE_ID,
              size: maxTraces,
              execution_hint: 'map' as const,
              // remove bias towards large traces by sorting on trace.id
              // which will be random-esque
              order: {
                _key: 'desc' as const,
              },
            },
          },
        },
      },
    },
  };

  const response = await search(searchRequest);
  const aggregations = response.aggregations;
  const buckets = aggregations?.sample?.trace_ids?.buckets ?? [];
  const traceIds = buckets.map((bucket) => String(bucket.key));
  logger.debug(`Found ${traceIds.length} trace.ids matching KQL filter`);
  return traceIds;
}
