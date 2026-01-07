/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { CoreSetup, IScopedClusterClient, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getApmIndices } from '../../utils/get_apm_indices';
import { getTypedSearch } from '../../utils/get_typed_search';
import { timeRangeFilter, termFilter } from '../../utils/dsl_filters';
import { parseDatemath } from '../../utils/time';

export interface ExitSpanError {
  'span.destination.service.resource': string;
  'span.name': string;
  count: number;
}

export interface GetExitSpanErrorsResult {
  exitSpanErrors: ExitSpanError[];
}

export async function getToolHandler({
  core,
  plugins,
  logger,
  esClient,
  serviceName,
  serviceEnvironment,
  start,
  end,
  limit = 10,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  esClient: IScopedClusterClient;
  serviceName: string;
  serviceEnvironment?: string;
  start: string;
  end: string;
  limit?: number;
}): Promise<GetExitSpanErrorsResult> {
  const apmIndices = await getApmIndices({ core, plugins, logger });
  const spanIndex = apmIndices.span;

  const parsedStart = parseDatemath(start);
  const parsedEnd = parseDatemath(end, { roundUp: true });

  const search = getTypedSearch(esClient.asCurrentUser);

  const environmentFilters: QueryDslQueryContainer[] = serviceEnvironment
    ? [
        {
          bool: {
            should: [
              { term: { 'service.environment': serviceEnvironment } },
              // otel
              { term: { 'resource.attributes.deployment.environment': serviceEnvironment } },
            ],
            minimum_should_match: 1,
          },
        },
      ]
    : [];

  // ES aliases map OTel fields (attributes.*, resource.attributes.*) to ECS fields,
  // so we only need to query/aggregate on ECS field paths
  const response = await search({
    index: spanIndex,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...timeRangeFilter('@timestamp', { start: parsedStart, end: parsedEnd }),
          ...termFilter('service.name', serviceName),
          ...environmentFilters,
          { term: { 'event.outcome': 'failure' } },
          { exists: { field: 'span.destination.service.resource' } },
        ],
      },
    },
    aggregations: {
      by_destination: {
        terms: {
          field: 'span.destination.service.resource',
          size: limit,
          order: { _count: 'desc' },
        },
        aggs: {
          by_span_name: {
            terms: {
              field: 'span.name',
              size: 3,
              order: { _count: 'desc' },
            },
          },
        },
      },
    },
  });

  // Process aggregation buckets into flat array
  const exitSpanErrors: ExitSpanError[] = (
    response.aggregations?.by_destination?.buckets ?? []
  ).flatMap((destBucket) => {
    const destination = destBucket.key as string;
    return (destBucket.by_span_name?.buckets ?? []).map((spanBucket) => ({
      'span.destination.service.resource': destination,
      'span.name': spanBucket.key as string,
      count: spanBucket.doc_count,
    }));
  });

  logger.debug(`Found ${exitSpanErrors.length} exit span error groups for service ${serviceName}`);

  return { exitSpanErrors };
}
