/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { TRACE_ID } from '@kbn/apm-types';
import { getTypedSearch } from '../../../utils/get_typed_search';
import { kqlFilter as buildKqlFilter, timeRangeFilter } from '../../../utils/dsl_filters';
import type { Anchor } from '../types';
import type { TraceIdAggregations } from './types';

export async function getTraceIds({
  esClient,
  indices,
  startTime,
  endTime,
  kqlFilter,
  logger,
  maxTraceSize,
}: {
  esClient: IScopedClusterClient;
  indices: string[];
  startTime: number;
  endTime: number;
  kqlFilter: string | undefined;
  logger: Logger;
  maxTraceSize: number;
}): Promise<Anchor[]> {
  const search = getTypedSearch(esClient.asCurrentUser);

  // `traceIdBucketSize` controls the number of unique `trace.id` values returned (terms `size`).
  const traceIdBucketSize = Math.min(maxTraceSize, 20);
  // `samplerShardSize` controls how many documents are considered per shard for the nested terms agg.
  const samplerShardSize = Math.max(200, traceIdBucketSize * 10);
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
              size: traceIdBucketSize,
              execution_hint: 'map' as const,
              // remove bias towards large traces by sorting on trace.id
              // which will be random-esque
              order: {
                _key: 'desc' as const,
              },
            },
            aggs: {
              // Fetch a representative timestamp for each trace.id so we can build the +/- 1h window.
              anchor_doc: {
                top_hits: {
                  size: 1,
                  _source: ['@timestamp'],
                },
              },
            },
          },
        },
      },
    },
  };

  const response = await search(searchRequest);

  const aggregations = response.aggregations as TraceIdAggregations | undefined;
  const buckets = aggregations?.sample?.trace_ids?.buckets ?? [];

  const anchors: Anchor[] = buckets.map((bucket) => {
    const firstHit = bucket.anchor_doc.hits.hits[0];

    return {
      '@timestamp': firstHit?._source?.['@timestamp'],
      correlation: {
        field: TRACE_ID,
        value: String(bucket.key),
      },
    };
  });

  logger.debug(`Found ${anchors.length} unique anchors across correlation fields`);

  return anchors;
}
