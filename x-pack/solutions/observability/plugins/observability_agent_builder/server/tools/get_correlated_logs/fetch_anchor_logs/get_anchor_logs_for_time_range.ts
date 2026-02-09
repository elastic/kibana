/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import { createHash } from 'crypto';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { warningAndAboveLogFilter } from '../../../utils/warning_and_above_log_filter';
import { getTypedSearch } from '../../../utils/get_typed_search';
import { kqlFilter as buildKqlFilter, timeRangeFilter } from '../../../utils/dsl_filters';
import type { AnchorLog } from '../types';
import type { CorrelationFieldAggregations } from './types';

export async function getAnchorLogsForTimeRange({
  esClient,
  logsIndices,
  startTime,
  endTime,
  kqlFilter,
  errorLogsOnly,
  correlationFields,
  logger,
  maxSequences,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  startTime: number;
  endTime: number;
  kqlFilter: string | undefined;
  errorLogsOnly: boolean;
  correlationFields: string[];
  logger: Logger;
  maxSequences: number;
}) {
  const search = getTypedSearch(esClient.asCurrentUser);

  // Use aggregation-based approach to get diverse samples across all correlation fields.
  // This prevents "starvation" where a single sequence with many anchors would prevent other sequences from being discovered.
  const searchRequest = {
    size: 0,
    track_total_hits: false,
    index: logsIndices,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
          ...buildKqlFilter(kqlFilter),

          // must have at least one correlation field
          {
            bool: {
              should: correlationFields.map((field) => ({ exists: { field } })),
              minimum_should_match: 1,
            },
          },

          // filter by error severity (default) or include all logs
          ...(errorLogsOnly ? [warningAndAboveLogFilter()] : []),
        ],
      },
    },
    aggs: buildDiversifiedSamplerAggregations(correlationFields, maxSequences),
  };

  const response = await search(searchRequest);

  const anchorLogs = parseAnchorLogsFromAggregations(
    response.aggregations as CorrelationFieldAggregations | undefined,
    correlationFields
  );

  logger.debug(`Found ${anchorLogs.length} unique anchor logs across correlation fields`);

  return anchorLogs.slice(0, maxSequences);
}

/**
 * Generates a unique aggregation key from a field name.
 * Combines a human-readable sanitized name with a short hash to guarantee uniqueness.
 * e.g., 'trace.id' -> 'field_trace_id_a1b2c3', 'trace_id' -> 'field_trace_id_d4e5f6'
 */
function getAggNameForField(field: string): string {
  const sanitized = field.replace(/[^a-zA-Z0-9]/g, '_');
  const hash = createHash('sha256').update(field).digest('hex').slice(0, 6);
  return `field_${sanitized}_${hash}`;
}

/**
 * Builds aggregations for diverse sampling of anchor logs across multiple correlation fields.
 *
 * This uses a layered approach to handle high-cardinality fields efficiently:
 * 1. Filter (exists): Skips documents without the field (fast, uses inverted index)
 * 2. Diversified Sampler: Limits scope and ensures unique values per field
 * 3. Terms with execution_hint 'map': Avoids Global Ordinals memory overhead
 * 4. Top Hits: Fetches document metadata in a single pass
 */
function buildDiversifiedSamplerAggregations(
  correlationFields: string[],
  maxSequences: number
): Record<string, AggregationsAggregationContainer> {
  return correlationFields.reduce((acc, field) => {
    const aggName = getAggNameForField(field);

    const fieldAgg: AggregationsAggregationContainer = {
      filter: { exists: { field } },
      aggs: {
        diverse_sampler: {
          diversified_sampler: {
            shard_size: Math.max(100, maxSequences * 10), // Oversample to improve diversity
            // shard_size: 1000, // Fixed oversampling to improve diversity
            field,
            max_docs_per_value: 1,
          },
          aggs: {
            unique_values: {
              terms: {
                field,
                size: maxSequences,
                execution_hint: 'map', // Disables "Global Ordinals". This is critically important for high-cardinality fields
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
      },
    };

    return { ...acc, [aggName]: fieldAgg };
  }, {} as Record<string, AggregationsAggregationContainer>);
}

function parseAnchorLogsFromAggregations(
  aggregations: CorrelationFieldAggregations | undefined,
  correlationFields: string[]
): AnchorLog[] {
  if (!aggregations) return [];

  const allAnchors = correlationFields.flatMap((field) => {
    const aggName = getAggNameForField(field);
    const filterAgg = aggregations[aggName];
    if (!filterAgg) return [];

    const buckets = filterAgg.diverse_sampler?.unique_values?.buckets ?? [];

    return buckets.map((bucket): AnchorLog => {
      const firstHit = bucket.anchor_doc.hits.hits[0];

      return {
        '@timestamp': firstHit?._source?.['@timestamp'] ?? '',
        correlation: {
          field,
          value: String(bucket.key),
          anchorLogId: firstHit?._id ?? 'unknown',
        },
      };
    });
  });

  // Dedupe by anchor document ID first (keeps first occurrence = highest priority field).
  // When the same document has multiple correlation fields (e.g., trace.id AND request.id),
  // we keep only the one from the highest priority field since correlationFields is ordered.
  // Then dedupe by field+value to ensure each correlation identity appears only once.
  const dedupedByDocId = uniqBy(allAnchors, (anchor) => anchor.correlation.anchorLogId);
  return uniqBy(
    dedupedByDocId,
    (anchor) => `${anchor.correlation.field}_${anchor.correlation.value}`
  );
}
