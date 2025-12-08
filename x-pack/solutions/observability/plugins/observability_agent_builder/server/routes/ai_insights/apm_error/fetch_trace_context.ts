/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';

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
  transactionId?: string;
  spanId?: string;
  serviceName?: string;
  errorExceptionType?: string;
  errorExceptionMessage?: string;
  errorLogMessage?: string;
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

export async function fetchTraceContext({
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
  const traceIndices = [apmIndices.transaction, apmIndices.span].join(',');
  const errorIndices = apmIndices.error;

  // Fetch trace documents (transactions and spans)
  const [traceResponse, errorResponse] = await Promise.all([
    esClient.asCurrentUser.search({
      index: traceIndices,
      size: 100,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { term: { 'trace.id': traceId } },
            { range: { '@timestamp': { gte: start, lte: end } } },
          ],
        },
      },
      fields: [
        'timestamp.us',
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
    }),
    esClient.asCurrentUser.search({
      index: errorIndices,
      size: 100,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { term: { 'trace.id': traceId } },
            { range: { '@timestamp': { gte: start, lte: end } } },
          ],
          must_not: [{ terms: { 'error.log.level': ['debug', 'info', 'warning'] } }],
        },
      },
      fields: [
        'timestamp.us',
        '@timestamp',
        'trace.id',
        'transaction.id',
        'span.id',
        'service.name',
        'error.exception.type',
        'error.exception.message',
        'error.log.message',
      ],
      _source: false,
      sort: [{ '@timestamp': 'asc' }],
    }),
  ]);

  // Process trace items
  const traceItems: TraceItem[] = traceResponse.hits.hits.map((hit) => {
    const fields = hit.fields || {};

    const timestampUs = fields['timestamp.us']?.[0];
    const timestamp = timestampUs
      ? new Date(Math.floor(timestampUs / 1000)).toISOString()
      : fields['@timestamp']?.[0];

    const processorEvent = fields['processor.event']?.[0];
    const isTransaction = processorEvent === 'transaction';

    const baseItem: TraceItem = {
      timestamp,
      serviceName: fields['service.name']?.[0],
      traceId: fields['trace.id']?.[0],
      eventOutcome: fields['event.outcome']?.[0],
      parentId: fields['parent.id']?.[0],
    };

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

  // Aggregate by service
  const serviceAggregatesMap = new Map<string, ServiceAggregate>();
  for (const item of traceItems) {
    const serviceName = item.serviceName ?? 'unknown';
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

  // Process errors
  const traceErrors: TraceError[] = errorResponse.hits.hits.map((hit) => {
    const fields = hit.fields || {};

    const timestampUs = fields['timestamp.us']?.[0];
    const timestamp = timestampUs
      ? new Date(Math.floor(timestampUs / 1000)).toISOString()
      : fields['@timestamp']?.[0];

    return {
      timestamp,
      traceId: fields['trace.id']?.[0],
      transactionId: fields['transaction.id']?.[0],
      spanId: fields['span.id']?.[0],
      serviceName: fields['service.name']?.[0],
      errorExceptionType: fields['error.exception.type']?.[0],
      errorExceptionMessage: fields['error.exception.message']?.[0],
      errorLogMessage: fields['error.log.message']?.[0],
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
