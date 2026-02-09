/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { getTypedSearch } from '../../../utils/get_typed_search';
import { kqlFilter as buildKqlFilter, timeRangeFilter } from '../../../utils/dsl_filters';
import type { Anchor } from '../types';
import type { CorrelationFieldAggregations } from './types';

const TRACE_ID_FIELD = 'trace.id';
const TRACE_ID_AGG_NAME = 'trace_id';

export async function getAnchors({
  esClient,
  indices,
  startTime,
  endTime,
  kqlFilter,
  logger,
  maxSequences,
}: {
  esClient: IScopedClusterClient;
  indices: string[];
  startTime: number;
  endTime: number;
  kqlFilter: string | undefined;
  logger: Logger;
  maxSequences: number;
}): Promise<Anchor[]> {
  const search = getTypedSearch(esClient.asCurrentUser);

  // aggregation to get diverse samples across trace.id field.
  const aggs: Record<string, AggregationsAggregationContainer> = {
    [TRACE_ID_AGG_NAME]: {
      diversified_sampler: {
        shard_size: Math.max(100, maxSequences * 10),
        field: TRACE_ID_FIELD,
        max_docs_per_value: 1,
      },
      aggs: {
        unique_values: {
          terms: {
            field: TRACE_ID_FIELD,
            size: maxSequences,
            execution_hint: 'map' as const,
          },
          aggs: {
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
  };

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
          { exists: { field: TRACE_ID_FIELD } },
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
        },
      },
    },
  };
  };

  const response = await search(searchRequest);

  const aggregations = response.aggregations as CorrelationFieldAggregations | undefined;
  const buckets = aggregations?.[TRACE_ID_AGG_NAME]?.unique_values?.buckets ?? [];

  const anchors: Anchor[] = buckets.map((bucket) => {
    const firstHit = bucket.anchor_doc.hits.hits[0];

    return {
      '@timestamp': firstHit?._source?.['@timestamp'],
      correlation: {
        field: TRACE_ID_FIELD,
        value: String(bucket.key),
      },
    };
  });

  logger.debug(`Found ${anchors.length} unique anchors across correlation fields`);

  return anchors;
}
