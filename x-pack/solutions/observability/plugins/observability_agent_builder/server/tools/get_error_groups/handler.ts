/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { getTypedSearch } from '../../utils/get_typed_search';
import { getTotalHits } from '../../utils/get_total_hits';
import { timeRangeFilter, kqlFilter, termFilter } from '../../utils/dsl_filters';
import { parseDatemath } from '../../utils/time';

const EXCEPTION_TYPE = 'exception.type';

interface APMErrorGroup {
  groupId: string;
  name: string;
  lastSeen: number;
  occurrences: number;
  culprit: string | undefined;
  handled: boolean | undefined;
  type: string | undefined;
  traceId: string | undefined;
}

interface OTelExceptionGroup {
  exceptionType: string;
  occurrences: number;
  lastSeen: number;
  sample: Record<string, unknown> | undefined;
}

export async function getToolHandler({
  core,
  request,
  esClient,
  dataRegistry,
  logger,
  serviceName,
  serviceEnvironment,
  start,
  end,
  kqlFilter: kuery,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  logger: Logger;
  serviceName?: string;
  serviceEnvironment?: string;
  start: string;
  end: string;
  kqlFilter?: string;
}): Promise<{
  apmErrorGroups: APMErrorGroup[];
  otelExceptionGroups: OTelExceptionGroup[];
  totalApmErrors: number;
  totalOtelExceptions: number;
}> {
  const [apmErrors, otelExceptions] = await Promise.all([
    getApmErrorGroups({ request, dataRegistry, serviceName, serviceEnvironment, start, end }),
    getOTelExceptionGroups({
      core,
      esClient,
      logger,
      serviceName,
      serviceEnvironment,
      start,
      end,
      kuery,
    }),
  ]);

  return {
    apmErrorGroups: apmErrors.groups,
    otelExceptionGroups: otelExceptions.groups,
    totalApmErrors: apmErrors.total,
    totalOtelExceptions: otelExceptions.total,
  };
}

async function getApmErrorGroups({
  request,
  dataRegistry,
  serviceName,
  serviceEnvironment,
  start,
  end,
}: {
  request: KibanaRequest;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  serviceName?: string;
  serviceEnvironment?: string;
  start: string;
  end: string;
}): Promise<{ groups: APMErrorGroup[]; total: number }> {
  if (!serviceName) {
    return { groups: [], total: 0 };
  }

  try {
    const errors = await dataRegistry.getData('apmErrors', {
      request,
      serviceName,
      serviceEnvironment,
      start,
      end,
    });

    if (!errors || errors.length === 0) {
      return { groups: [], total: 0 };
    }

    return {
      groups: errors,
      total: errors.length,
    };
  } catch (error) {
    return { groups: [], total: 0 };
  }
}

async function getOTelExceptionGroups({
  core,
  esClient,
  logger,
  serviceName,
  serviceEnvironment,
  start,
  end,
  kuery,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  esClient: IScopedClusterClient;
  logger: Logger;
  serviceName?: string;
  serviceEnvironment?: string;
  start: string;
  end: string;
  kuery?: string;
}): Promise<{ groups: OTelExceptionGroup[]; total: number }> {
  const logsIndices = await getLogsIndices({ core, logger });

  if (logsIndices.length === 0) {
    return { groups: [], total: 0 };
  }

  const parsedStart = parseDatemath(start);
  const parsedEnd = parseDatemath(end, { roundUp: true });

  const boolFilters = [
    ...timeRangeFilter('@timestamp', {
      start: parsedStart,
      end: parsedEnd,
    }),
    ...kqlFilter(kuery),
    ...termFilter('service.name', serviceName),
    ...termFilter('service.environment', serviceEnvironment),
    { exists: { field: EXCEPTION_TYPE } },
  ];

  try {
    const typedSearch = getTypedSearch(esClient.asCurrentUser);
    const response = await typedSearch({
      index: logsIndices,
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: boolFilters,
        },
      },
      aggregations: {
        exception_types: {
          terms: {
            field: EXCEPTION_TYPE,
            size: 50,
            order: { _count: 'desc' },
          },
          aggs: {
            last_seen: {
              max: { field: '@timestamp' },
            },
            sample: {
              top_hits: {
                size: 1,
                _source: [
                  '@timestamp',
                  'service.name',
                  'service.environment',
                  'host.name',
                  'trace.id',
                  'exception.type',
                  'exception.message',
                  'message',
                ],
                sort: { '@timestamp': { order: 'desc' } },
              },
            },
          },
        },
      },
    });

    const totalHits = getTotalHits(response);

    const aggs = response.aggregations as {
      exception_types?: {
        buckets: Array<{
          key: string;
          doc_count: number;
          last_seen?: { value: number };
          sample?: { hits?: { hits?: Array<{ _source?: Record<string, unknown> }> } };
        }>;
      };
    };

    const buckets = aggs?.exception_types?.buckets ?? [];

    const groups: OTelExceptionGroup[] = buckets.map((bucket) => ({
      exceptionType: bucket.key,
      occurrences: bucket.doc_count,
      lastSeen: bucket.last_seen?.value ?? 0,
      sample: bucket.sample?.hits?.hits?.[0]?._source,
    }));

    return { groups, total: totalHits };
  } catch (error) {
    logger.debug(`Failed to get OTel exception groups: ${error.message}`);
    return { groups: [], total: 0 };
  }
}
