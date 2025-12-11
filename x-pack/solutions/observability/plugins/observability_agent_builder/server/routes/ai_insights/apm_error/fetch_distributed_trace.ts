/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import type { UnflattenedApmEvent } from '@kbn/apm-data-access-plugin/server/utils/utility_types';
import { getTypedSearch } from '../../../utils/get_typed_search';
import { termFilter, timeRangeFilter } from '../../../utils/dsl_filters';

interface ServiceAggregate {
  serviceName: string;
  count: number;
  errorCount: number;
}

export interface DistributedTrace {
  traceDocuments: Array<UnflattenedApmEvent>;
  isPartialTrace: boolean;
  services: ServiceAggregate[];
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
}): Promise<DistributedTrace> {
  const search = getTypedSearch(esClient.asCurrentUser);
  const indices = [apmIndices.transaction, apmIndices.span, apmIndices.error].join(',');

  const size = 100;
  const traceResponse = await search({
    index: indices,
    size,
    track_total_hits: size + 1,
    query: {
      bool: {
        filter: [
          ...termFilter('trace.id', traceId),
          ...timeRangeFilter('@timestamp', { start, end }),
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
      'error.id',
      'error.grouping_key',
      'error.culprit',
      'error.log.message',
      'error.exception.message',
      'error.exception.handled',
      'error.exception.type',
    ],
    _source: false,
    sort: [{ '@timestamp': 'asc' }],
  });

  const traceDocuments = traceResponse.hits.hits.map(
    (hit) => accessKnownApmEventFields(hit.fields ?? {}).unflatten() as UnflattenedApmEvent
  );

  const total = traceResponse.hits.total;
  const isPartialTrace = total.relation === 'gte';

  const serviceAggs = traceResponse.aggregations?.services.buckets ?? [];
  const services = serviceAggs
    .map((bucket) => ({
      serviceName: bucket.key as string,
      count: bucket.doc_count,
      errorCount: bucket.error_count?.doc_count ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  logger.debug(
    `Fetched distributed trace for ${traceId}: ${traceDocuments.length} documents, ${services.length} services, partial: ${isPartialTrace}`
  );

  return {
    traceDocuments,
    isPartialTrace,
    services,
  };
}
