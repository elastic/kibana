/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { getTypedSearch } from '../../../utils/get_typed_search';

interface TraceItem {
  timestamp: string;
  serviceName?: string;
  traceId?: string;
  eventOutcome?: string;
  parentId?: string;
  transactionId?: string;
  transactionName?: string;
  transactionType?: string;
  transactionDurationUs?: number;
  spanId?: string;
  spanName?: string;
  spanType?: string;
  spanSubtype?: string;
  spanDurationUs?: number;
  downstreamServiceResource?: string;
}

interface TraceError {
  timestamp: string;
  traceId?: string;
  serviceName?: string;
  errorId?: string;
  errorGroupId?: string;
  parentId?: string;
  transactionId?: string;
  spanId?: string;
  errorCulprit?: string;
  errorLogMessage?: string;
  errorExceptionMessage?: string;
  errorExceptionHandled?: boolean;
  errorExceptionType?: string;
}

interface ServiceAggregate {
  serviceName: string;
  count: number;
  errorCount: number;
}

export interface TraceContext {
  traceItems: TraceItem[];
  traceServiceAggregates: ServiceAggregate[];
  traceErrors: TraceError[];
}

export async function fetchDistributedTrace({
  esClient,
  apmIndices,
  traceId,
  start,
  end,
  logger,
}: {
  esClient: IScopedClusterClient;
  apmIndices: APMIndices;
  traceId: string;
  start: number;
  end: number;
  logger: Logger;
}): Promise<TraceContext> {
  const search = getTypedSearch(esClient.asCurrentUser);
  const traceIndices = [apmIndices.transaction, apmIndices.span].join(',');
  const errorIndices = apmIndices.error;

  const timeRangeFilter = { range: { '@timestamp': { gte: start, lte: end } } };
  const traceFilter = { term: { 'trace.id': traceId } };

  // Fetch trace documents (transactions and spans)
  const traceResponse = await search({
    index: traceIndices,
    size: 100,
    track_total_hits: false,
    query: { bool: { filter: [traceFilter, timeRangeFilter] } },
    fields: [
      '@timestamp',
      'service.name',
      'trace.id',
      'event.outcome',
      'parent.id',
      'processor.event',
      'transaction.id',
      'transaction.name',
      'transaction.type',
      'transaction.duration.us',
      'span.id',
      'span.name',
      'span.type',
      'span.subtype',
      'span.duration.us',
      'span.destination.service.resource',
    ],
    _source: false,
    sort: [{ '@timestamp': 'asc' }],
  });

  const traceItems: TraceItem[] = traceResponse.hits.hits.map((hit) => {
    const fields = (hit.fields || {}) as Record<string, any[]>;

    const processorEvent = fields['processor.event']?.[0];
    const isTransaction = processorEvent === 'transaction';

    const baseItem = {
      timestamp: fields['@timestamp']?.[0],
      serviceName: fields['service.name']?.[0],
      traceId: fields['trace.id']?.[0],
      eventOutcome: fields['event.outcome']?.[0],
      parentId: fields['parent.id']?.[0],
    };

    // for transactions
    if (isTransaction) {
      return {
        ...baseItem,
        transactionId: fields['transaction.id']?.[0],
        transactionName: fields['transaction.name']?.[0],
        transactionType: fields['transaction.type']?.[0],
        transactionDurationUs: fields['transaction.duration.us']?.[0],
        spanId: fields['span.id']?.[0],
      };
    }

    // for spans
    return {
      ...baseItem,
      transactionId: fields['transaction.id']?.[0],
      spanId: fields['span.id']?.[0],
      spanName: fields['span.name']?.[0],
      spanType: fields['span.type']?.[0],
      spanSubtype: fields['span.subtype']?.[0],
      spanDurationUs: fields['span.duration.us']?.[0],
      downstreamServiceResource: fields['span.destination.service.resource']?.[0],
    };
  });

  // Aggregate by services in the trace
  const serviceAggregatesMap = new Map<string, ServiceAggregate>();
  for (const item of traceItems) {
    const serviceName = (item.serviceName as string) ?? 'unknown';
    const existing = serviceAggregatesMap.get(serviceName) ?? {
      serviceName,
      count: 0,
      errorCount: 0,
    };

    existing.count += 1;
    if (item.eventOutcome === 'failure') {
      existing.errorCount += 1;
    }
    serviceAggregatesMap.set(serviceName, existing);
  }

  const traceServiceAggregates = Array.from(serviceAggregatesMap.values()).sort(
    (a, b) => b.count - a.count
  );

  // Fetch errors in the trace
  const errorResponse = await search({
    index: errorIndices,
    size: 100,
    track_total_hits: false,
    query: {
      bool: {
        filter: [traceFilter, timeRangeFilter],
        must_not: [{ terms: { 'error.log.level': ['debug', 'info', 'warning'] } }],
      },
    },
    fields: [
      '@timestamp',
      'trace.id',
      'service.name',
      'error.id',
      'error.grouping_key',
      'processor.event',
      'parent.id',
      'transaction.id',
      'span.id',
      'span.destination.service.resource',
      'error.culprit',
      'error.log.message',
      'error.exception.message',
      'error.exception.handled',
      'error.exception.type',
      'error.stack_trace',
    ],
    _source: false,
    sort: [{ '@timestamp': 'asc' }],
  });

  const traceErrors: TraceError[] = errorResponse.hits.hits.map((hit) => {
    const fields = (hit.fields || {}) as Record<string, any[]>;

    return {
      timestamp: fields['@timestamp']?.[0],
      traceId: fields['trace.id']?.[0],
      serviceName: fields['service.name']?.[0],
      errorId: fields['error.id']?.[0],
      errorGroupId: fields['error.grouping_key']?.[0],
      parentId: fields['parent.id']?.[0],
      transactionId: fields['transaction.id']?.[0],
      spanId: fields['span.id']?.[0],
      errorCulprit: fields['error.culprit']?.[0],
      errorLogMessage: fields['error.log.message']?.[0],
      errorExceptionMessage: fields['error.exception.message']?.[0],
      errorExceptionHandled: fields['error.exception.handled']?.[0],
      errorExceptionType: fields['error.exception.type']?.[0],
    };
  });

  logger.debug(
    `Fetched trace context for ${traceId}: ${traceItems.length} items, ${traceErrors.length} errors, ${traceServiceAggregates.length} services`
  );

  return {
    traceItems,
    traceServiceAggregates,
    traceErrors,
  };
}
