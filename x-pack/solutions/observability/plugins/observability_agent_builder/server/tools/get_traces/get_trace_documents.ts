/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MsearchRequestItem } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { TRACE_ID } from '@kbn/apm-types';
import { timeRangeFilter, termFilter } from '../../utils/dsl_filters';
import { unwrapEsFields } from '../../utils/unwrap_es_fields';
import { getTotalHits } from '../../utils/get_total_hits';
import { DEFAULT_TRACE_FIELDS } from './constants';

export interface ServiceAggregate {
  serviceName: string;
  count: number;
  errorCount: number;
}

interface ServicesAgg {
  buckets?: {
    key: unknown;
    doc_count: number;
    error_count?: { doc_count: number };
  }[];
}

export async function getTraceDocuments({
  esClient,
  traceIds,
  index,
  startTime,
  endTime,
  size,
  fields = DEFAULT_TRACE_FIELDS,
}: {
  esClient: IScopedClusterClient;
  traceIds: string[];
  index: string[];
  startTime: number;
  endTime: number;
  size: number;
  fields?: string[];
}): Promise<
  {
    items: Record<string, unknown>[];
    services: ServiceAggregate[];
    error?: string;
    isTruncated: boolean;
  }[]
> {
  const searches: MsearchRequestItem[] = traceIds.flatMap((traceId) => [
    { index },
    {
      track_total_hits: size + 1, // +1 to determine if results are truncated
      size,
      sort: [{ '@timestamp': { order: 'asc' } }],
      _source: false,
      fields,
      query: {
        bool: {
          filter: [
            ...timeRangeFilter('@timestamp', { start: startTime, end: endTime }),
            ...termFilter(TRACE_ID, traceId),
          ],
        },
      },
      aggs: {
        services: {
          terms: {
            field: 'service.name',
            size: 100,
          },
          aggs: {
            error_count: {
              filter: { term: { 'event.outcome': 'failure' } },
            },
          },
        },
      },
    },
  ]);
  const msearchResponse = await esClient.asCurrentUser.msearch({
    searches,
  });
  return msearchResponse.responses.map((response, responseIndex) => {
    const traceId = traceIds[responseIndex];
    if ('error' in response) {
      return {
        items: [],
        error: `Failed to fetch trace documents for trace.id ${traceId}: ${response.error.type}: ${response.error.reason}`,
        services: [],
        isTruncated: false,
      };
    }
    const serviceAggs = (response.aggregations?.services as ServicesAgg)?.buckets ?? [];
    const services = serviceAggs
      .map((bucket) => ({
        serviceName: bucket.key as string,
        count: bucket.doc_count,
        errorCount: bucket.error_count?.doc_count ?? 0,
      }))
      .sort((a, b) => b.count - a.count);
    return {
      items: response.hits.hits.map((hit) => unwrapEsFields(hit.fields)),
      services,
      isTruncated: getTotalHits(response) > size,
    };
  });
}
