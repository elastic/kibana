/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateThroughputWithRange } from '@kbn/apm-data-access-plugin/server/utils';
import { termQuery } from '@kbn/observability-utils-server/es/queries/term_query';
import type { KibanaRequest } from '@kbn/core/server';
import { SERVICE_NAME } from '@kbn/apm-types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { TraceMetrics } from '../../data_registry/data_registry_types';
import { buildConnectionKey } from './build_connections_from_spans';
import type { ConnectionMetrics, ConnectionWithKey, ServiceTopologyConnection } from './types';

interface MetricsMap {
  [key: string]: ConnectionMetrics;
}

export function computeConnectionMetrics(params: TraceMetrics): ConnectionMetrics {
  return {
    latencyMs: params.latencyUs !== null ? params.latencyUs / 1000 : undefined,
    throughputPerMin:
      params.throughputPerMin !== null
        ? Math.round(params.throughputPerMin * 1000) / 1000
        : undefined,
    errorRate: params.errorRate ?? undefined,
  };
}

function rawCountsToMetrics({
  latencyCount,
  latencySum,
  errorCount,
  successCount,
  start,
  end,
}: {
  latencyCount: number;
  latencySum: number;
  errorCount: number;
  successCount: number;
  start: number;
  end: number;
}): TraceMetrics {
  const totalCount = errorCount + successCount;
  return {
    latencyUs: latencyCount > 0 ? latencySum / latencyCount : null,
    throughputPerMin:
      latencyCount > 0 ? calculateThroughputWithRange({ start, end, value: latencyCount }) : null,
    errorRate: totalCount > 0 ? errorCount / totalCount : null,
  };
}

export async function getConnectionMetrics({
  dataRegistry,
  request,
  start,
  end,
  serviceNames,
}: {
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  request: KibanaRequest;
  start: number;
  end: number;
  serviceNames: string[];
}): Promise<MetricsMap> {
  if (serviceNames.length === 0) {
    return {};
  }

  const statsItems = await dataRegistry.getData('apmConnectionStatsItems', {
    request,
    start,
    end,
    filter:
      serviceNames.length > 1
        ? [{ terms: { [SERVICE_NAME]: serviceNames } }]
        : termQuery(SERVICE_NAME, serviceNames[0]),
  });

  if (!statsItems) {
    return {};
  }

  const metricsEntries = statsItems.flatMap((item) => {
    const serviceName = item.from.serviceName;
    const dependencyName = item.to.dependencyName;
    if (!serviceName || !dependencyName) {
      return [];
    }

    const key = buildConnectionKey(serviceName, dependencyName);
    const { error_count, success_count, latency_count, latency_sum } = item.value;

    return [
      [
        key,
        computeConnectionMetrics(
          rawCountsToMetrics({
            latencyCount: latency_count,
            latencySum: latency_sum,
            errorCount: error_count,
            successCount: success_count,
            start,
            end,
          })
        ),
      ] as const,
    ];
  });

  return Object.fromEntries(metricsEntries);
}

export function finalizeConnections(
  connections: ConnectionWithKey[],
  metricsMap?: MetricsMap
): ServiceTopologyConnection[] {
  return connections.map((conn) => ({
    source: conn.source,
    target: conn.target,
    metrics: metricsMap?.[conn._key],
  }));
}
