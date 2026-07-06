/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest } from '@kbn/core/server';
import { termQuery } from '@kbn/observability-utils-server/es/queries/term_query';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
} from '@kbn/apm-types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ApmConnectionStatsEntry } from '../../data_registry/data_registry_types';
import type { ServiceTopologyResponse, ServiceTopologyConnection } from './types';
import { computeConnectionMetrics } from './get_connection_metrics';

/**
 * Fast path for depth=1 downstream: uses getConnectionStats which queries
 * pre-aggregated service_destination metrics (1m rollups) plus destination map
 * for service.name resolution, with proper deduplication when multiple
 * span.destination.service.resource values resolve to the same service.
 *
 * This is O(1) aggregation cost regardless of trace volume — dramatically
 * faster for customers with billions of traces or traces with 20,000+ spans.
 */
export async function getImmediateDownstreamDependencies({
  dataRegistry,
  request,
  serviceName,
  startMs,
  endMs,
}: {
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  request: KibanaRequest;
  serviceName: string;
  startMs: number;
  endMs: number;
}): Promise<ServiceTopologyResponse> {
  const statsEntries = await dataRegistry.getData('apmConnectionStats', {
    request,
    start: startMs,
    end: endMs,
    filter: termQuery(SERVICE_NAME, serviceName),
  });

  if (!statsEntries) {
    return { connections: [] };
  }

  const connections: ServiceTopologyConnection[] = statsEntries.map((entry) => ({
    source: { [SERVICE_NAME]: serviceName },
    target: toTarget(entry),
    metrics: computeConnectionMetrics(entry.metrics),
  }));

  return { connections };
}

function toTarget(entry: ApmConnectionStatsEntry) {
  if (entry.type === 'service') {
    return { [SERVICE_NAME]: entry.serviceName };
  }

  return {
    [SPAN_DESTINATION_SERVICE_RESOURCE]: entry.dependencyName,
    [SPAN_TYPE]: entry.spanType,
    [SPAN_SUBTYPE]: entry.spanSubtype,
  };
}
