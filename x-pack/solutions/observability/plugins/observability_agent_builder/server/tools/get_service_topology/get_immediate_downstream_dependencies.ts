/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import { termQuery } from '@kbn/observability-utils-server/es/queries/term_query';
import { calculateThroughputWithRange } from '@kbn/apm-data-access-plugin/server/utils';
import { SERVICE_NAME } from '@kbn/apm-types';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ServiceTopologyResponse, ExternalNode, ServiceTopologyNode } from './types';

/**
 * Fast path for depth=1 downstream: queries pre-aggregated service_destination
 * metrics (1m rollups) instead of scanning raw span events. This is O(1)
 * aggregation cost regardless of trace volume — dramatically faster for
 * customers with billions of traces or traces with 20,000+ spans.
 *
 * Trade-off: targets are identified by span.destination.service.resource
 * (e.g., "checkout-proxy:5050") rather than resolved service.name
 * (e.g., "checkout-service"). This is acceptable for LLM consumption since
 * the resource name + span.type/subtype clearly identifies the dependency.
 */
export async function getImmediateDownstreamDependencies({
  dataRegistry,
  request,
  logger,
  serviceName,
  startMs,
  endMs,
}: {
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  request: KibanaRequest;
  logger: Logger;
  serviceName: string;
  startMs: number;
  endMs: number;
}): Promise<ServiceTopologyResponse> {
  logger.debug(`Using metrics-based fast path for immediate downstream of "${serviceName}"`);

  const statsItems = await dataRegistry.getData('apmConnectionStats', {
    request,
    start: startMs,
    end: endMs,
    filter: termQuery(SERVICE_NAME, serviceName),
    numBuckets: 1,
    withTimeseries: false,
  });

  if (!statsItems) {
    return { connections: [] };
  }

  const connections = statsItems.map((item) => {
    const { latency_count, latency_sum, error_count, success_count } = item.value;
    const totalCount = error_count + success_count;

    return {
      source: { 'service.name': item.from.serviceName } as ServiceTopologyNode,
      target: {
        'span.destination.service.resource': item.to.dependencyName,
        'span.type': item.to.spanType,
        'span.subtype': item.to.spanSubtype,
      } as ExternalNode,
      metrics: {
        errorRate: totalCount > 0 ? error_count / totalCount : undefined,
        latencyMs: latency_count > 0 ? latency_sum / latency_count / 1000 : undefined,
        throughputPerMin:
          latency_count > 0
            ? Math.round(
                calculateThroughputWithRange({ start: startMs, end: endMs, value: latency_count }) *
                  1000
              ) / 1000
            : undefined,
      },
    };
  });

  return { connections };
}
