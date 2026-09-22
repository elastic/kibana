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
import { DEFAULT_MAX_OUTPUT_CHARS, DEFAULT_TRACE_FIELDS } from './constants';

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

function getSerializedLength(value: unknown): number {
  return JSON.stringify(value).length;
}

function truncateTraceDocuments({
  traceId,
  items,
  totalHits,
  maxDocsPerTrace,
  maxOutputChars,
}: {
  traceId: string;
  items: Record<string, unknown>[];
  totalHits: number;
  maxDocsPerTrace: number;
  maxOutputChars: number;
}) {
  const exceededMaxDocsPerTrace = totalHits > maxDocsPerTrace;

  if (maxOutputChars <= 0) {
    return {
      items: [],
      isTruncated: true,
      remainingOutputChars: 0,
      message: `Truncated (budget), ${totalHits} items were reduced to 0 items.`,
    };
  }

  const remainingBudgetChars = maxOutputChars;

  const returnedItems: Record<string, unknown>[] = [];
  let usedBudgetChars = 0;

  for (const item of items) {
    const itemSizeChars = getSerializedLength(item);
    const nextUsedChars = usedBudgetChars + itemSizeChars;

    if (nextUsedChars > remainingBudgetChars) {
      break;
    }

    returnedItems.push(item);
    usedBudgetChars = nextUsedChars;
  }

  const truncatedByBudget = returnedItems.length < items.length;
  const isTruncated = exceededMaxDocsPerTrace || truncatedByBudget;

  const remainingOutputChars = Math.max(0, maxOutputChars - usedBudgetChars);

  return {
    items: returnedItems,
    isTruncated,
    message: isTruncated
      ? `Truncated (${
          truncatedByBudget ? 'budget' : 'maxDocsPerTrace'
        }), ${totalHits} items were reduced to ${returnedItems.length} items.`
      : undefined,
    remainingOutputChars,
  };
}

function truncateTraces(
  rawTraces: Array<{
    traceId: string;
    items: Record<string, unknown>[];
    services: ServiceAggregate[];
    totalHits: number;
    error?: string;
  }>,
  maxDocsPerTrace: number,
  maxOutputChars: number
) {
  let remainingChars = maxOutputChars;
  return rawTraces.map((trace) => {
    if (trace.error) {
      return {
        traceId: trace.traceId,
        items: [],
        error: trace.error,
        services: [],
        isTruncated: false,
      };
    }
    const { items, isTruncated, message, remainingOutputChars } = truncateTraceDocuments({
      traceId: trace.traceId,
      items: trace.items,
      totalHits: trace.totalHits,
      maxDocsPerTrace,
      maxOutputChars: remainingChars,
    });
    remainingChars = remainingOutputChars;
    return { traceId: trace.traceId, items, services: trace.services, isTruncated, message };
  });
}

export async function getTraceDocuments({
  esClient,
  traceIds,
  index,
  startTime,
  endTime,
  maxDocsPerTrace,
  fields = DEFAULT_TRACE_FIELDS,
}: {
  esClient: IScopedClusterClient;
  traceIds: string[];
  index: string[];
  startTime: number;
  endTime: number;
  maxDocsPerTrace: number;
  fields?: string[];
}): Promise<
  {
    traceId: string;
    items: Record<string, unknown>[];
    services: ServiceAggregate[];
    error?: string;
    isTruncated: boolean;
    isOutputTruncated?: boolean;
    message?: string;
  }[]
> {
  const searches: MsearchRequestItem[] = traceIds.flatMap((traceId) => [
    { index },
    {
      track_total_hits: maxDocsPerTrace + 1, // +1 to determine if results are truncated
      size: maxDocsPerTrace,
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
  const rawTraces = msearchResponse.responses.map((response, responseIndex) => {
    const traceId = traceIds[responseIndex];
    if ('error' in response) {
      return {
        traceId,
        items: [],
        error: `Failed to fetch trace documents for trace.id ${traceId}: ${response.error.type}: ${response.error.reason}`,
        services: [],
        totalHits: 0,
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
      traceId,
      items: response.hits.hits.map((hit) => unwrapEsFields(hit.fields)),
      services,
      totalHits: getTotalHits(response),
    };
  });

  return truncateTraces(rawTraces, maxDocsPerTrace, DEFAULT_MAX_OUTPUT_CHARS);
}
