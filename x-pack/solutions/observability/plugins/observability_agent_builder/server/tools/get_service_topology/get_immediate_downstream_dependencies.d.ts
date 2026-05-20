import type { KibanaRequest } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { ServiceTopologyResponse } from './types';
/**
 * Fast path for depth=1 downstream: uses getConnectionStats which queries
 * pre-aggregated service_destination metrics (1m rollups) plus destination map
 * for service.name resolution, with proper deduplication when multiple
 * span.destination.service.resource values resolve to the same service.
 *
 * This is O(1) aggregation cost regardless of trace volume — dramatically
 * faster for customers with billions of traces or traces with 20,000+ spans.
 */
export declare function getImmediateDownstreamDependencies({ dataRegistry, request, serviceName, startMs, endMs, }: {
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    request: KibanaRequest;
    serviceName: string;
    startMs: number;
    endMs: number;
}): Promise<ServiceTopologyResponse>;
