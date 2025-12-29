/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ServicesItemsItem } from '../../data_registry/data_registry_types';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getApmIndices } from '../../utils/get_apm_indices';
import { getLogsIndices } from '../../utils/get_logs_indices';
import { getMetricsIndices } from '../../utils/get_metrics_indices';
import { getTypedSearch } from '../../utils/get_typed_search';
import { matchesIndexPattern } from '../../utils/matches_index_pattern';
import { parseDatemath } from '../../utils/time';

type ServiceSource = 'apm' | 'logs' | 'metrics';

export interface ExtendedServicesItemsItem extends ServicesItemsItem {
  sources: ServiceSource[];
}

interface ServiceFromIndex {
  serviceName: string;
  environment?: string;
  sources: Array<'logs' | 'metrics'>;
}

const MAX_SERVICES_FROM_INDICES = 500;

async function getServicesFromLogsAndMetricsIndices({
  esClient,
  logsIndices,
  metricsIndices,
  apmIndexPatterns,
  start,
  end,
  environment,
  logger,
}: {
  esClient: IScopedClusterClient;
  logsIndices: string[];
  metricsIndices: string[];
  apmIndexPatterns: string[];
  start: number;
  end: number;
  environment?: string;
  logger: Logger;
}): Promise<ServiceFromIndex[]> {
  const allIndices = [...logsIndices, ...metricsIndices];

  if (allIndices.length === 0) {
    return [];
  }

  try {
    const search = getTypedSearch(esClient.asCurrentUser);
    const response = await search({
      index: allIndices,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: start, lte: end } } },
            { exists: { field: 'service.name' } },
            ...(environment ? [{ term: { 'service.environment': environment } }] : []),
          ],
        },
      },
      aggs: {
        services: {
          terms: {
            field: 'service.name',
            size: MAX_SERVICES_FROM_INDICES,
          },
          aggs: {
            environments: {
              terms: {
                field: 'service.environment',
                size: 10,
              },
            },
            indices: {
              terms: {
                field: '_index',
                size: 100,
              },
            },
          },
        },
      },
    });

    const buckets = response.aggregations?.services?.buckets ?? [];

    return buckets.map((bucket) => {
      const indexNames =
        bucket.indices?.buckets
          .map((b) => b.key)
          .filter((key): key is string => typeof key === 'string') ?? [];

      // Determine the source of the service based on which index patterns the service was found in
      // Exclude APM indices as they are classified as 'apm'
      const sources: Array<'logs' | 'metrics'> = [];
      const foundInLogs = indexNames.some((index) =>
        matchesIndexPattern({
          index,
          patterns: logsIndices,
          excludePatterns: apmIndexPatterns,
        })
      );
      const foundInMetrics = indexNames.some((index) =>
        matchesIndexPattern({
          index,
          patterns: metricsIndices,
          excludePatterns: apmIndexPatterns,
        })
      );

      if (foundInLogs) {
        sources.push('logs');
      }

      if (foundInMetrics) {
        sources.push('metrics');
      }

      return {
        serviceName: bucket.key as string,
        environment: bucket.environments?.buckets?.[0]?.key as string | undefined,
        sources,
      };
    });
  } catch (error) {
    logger.debug(`Failed to get services from indices: ${error.message}`);
    return [];
  }
}

function mergeServices({
  apmServices,
  logsAndMetricsServices,
}: {
  apmServices: ServicesItemsItem[];
  logsAndMetricsServices: ServiceFromIndex[];
}): ExtendedServicesItemsItem[] {
  const serviceMap = new Map<string, ExtendedServicesItemsItem>();

  for (const service of apmServices) {
    serviceMap.set(service.serviceName, {
      ...service,
      sources: ['apm'],
    });
  }

  for (const service of logsAndMetricsServices) {
    const existing = serviceMap.get(service.serviceName);
    if (existing) {
      for (const source of service.sources) {
        if (!existing.sources.includes(source)) {
          existing.sources.push(source);
        }
      }
    } else {
      serviceMap.set(service.serviceName, {
        serviceName: service.serviceName,
        environments: service.environment ? [service.environment] : undefined,
        sources: [...service.sources],
      });
    }
  }

  return Array.from(serviceMap.values());
}

export async function getToolHandler({
  core,
  plugins,
  request,
  esClient,
  dataRegistry,
  logger,
  start,
  end,
  environment,
  healthStatus,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  logger: Logger;
  start: string;
  end: string;
  environment?: string;
  healthStatus?: string[];
}): Promise<{
  services: ExtendedServicesItemsItem[];
  maxCountExceeded: boolean;
  serviceOverflowCount: number;
}> {
  const startMs = parseDatemath(start);
  const endMs = parseDatemath(end, { roundUp: true });

  const [logsIndices, metricsIndices, apmIndices] = await Promise.all([
    getLogsIndices({ core, logger }),
    getMetricsIndices({ core, plugins, logger }),
    getApmIndices({ core, plugins, logger }),
  ]);

  const apmIndexPatterns = Object.values(apmIndices).flatMap((pattern) =>
    pattern.split(',').map((p) => p.trim())
  );

  const [apmResponse, logsAndMetricsServices] = await Promise.all([
    dataRegistry.getData('servicesItems', {
      request,
      environment,
      start,
      end,
    }),
    getServicesFromLogsAndMetricsIndices({
      esClient,
      logsIndices,
      metricsIndices,
      apmIndexPatterns,
      start: startMs,
      end: endMs,
      environment,
      logger,
    }),
  ]);

  const apmServices = apmResponse?.items ?? [];

  // Filter APM services by health status (if provided) and convert latency to milliseconds
  const normalizedApmServices = apmServices.flatMap((service) => {
    if (healthStatus && !healthStatus.includes(service.healthStatus ?? 'unknown')) {
      return [];
    }

    return [
      {
        ...service,
        latency: service.latency ? service.latency / 1000 : undefined,
      },
    ];
  });

  // Merge all services from different sources
  // When filtering by health status, exclude logs/metrics-only services since they don't have health data
  const services = mergeServices({
    apmServices: normalizedApmServices,
    logsAndMetricsServices: healthStatus ? [] : logsAndMetricsServices,
  });

  return {
    services,
    maxCountExceeded: apmResponse?.maxCountExceeded ?? false,
    serviceOverflowCount: apmResponse?.serviceOverflowCount ?? 0,
  };
}
