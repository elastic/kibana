/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-utils-server/es/queries/range_query';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import { SPAN_DESTINATION_SERVICE_RESOURCE, TRACE_ID } from '@kbn/apm-types';

/**
 * Get trace IDs from exit spans that target a specific external dependency.
 * Used as a fallback for upstream topology when the target has no transactions
 * (e.g., databases like "postgres", caches like "redis").
 *
 * Searches by exact `span.destination.service.resource` match only — no heuristic/fuzzy matching.
 */
export async function getTraceIdsFromExitSpansTargetingDependency({
  apmEventClient,
  dependencyName,
  start,
  end,
  maxTraces = 500,
}: {
  apmEventClient: APMEventClient;
  dependencyName: string;
  start: number;
  end: number;
  maxTraces?: number;
}): Promise<string[]> {
  const response = await apmEventClient.search(
    'get_trace_ids_from_exit_spans_targeting_dependency',
    {
      apm: {
        sources: [
          {
            documentType: ApmDocumentType.SpanEvent,
            rollupInterval: RollupInterval.None,
          },
        ],
      },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencyName } },
          ],
        },
      },
      aggs: {
        sample: {
          sampler: {
            shard_size: maxTraces,
          },
          aggs: {
            traceIds: {
              terms: {
                field: TRACE_ID,
                size: maxTraces,
              },
            },
          },
        },
      },
    }
  );

  const buckets = response.aggregations?.sample?.traceIds?.buckets ?? [];
  return buckets.map((bucket) => String(bucket.key));
}
