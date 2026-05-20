import type { KibanaRequest } from '@kbn/core/server';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { TraceMetrics } from '../../data_registry/data_registry_types';
import type { ConnectionMetrics, ConnectionWithKey, ServiceTopologyConnection } from './types';
interface MetricsMap {
    [key: string]: ConnectionMetrics;
}
export declare function computeConnectionMetrics(params: TraceMetrics): ConnectionMetrics;
export declare function getConnectionMetrics({ dataRegistry, request, start, end, serviceNames, }: {
    dataRegistry: ObservabilityAgentBuilderDataRegistry;
    request: KibanaRequest;
    start: number;
    end: number;
    serviceNames: string[];
}): Promise<MetricsMap>;
export declare function finalizeConnections(connections: ConnectionWithKey[], metricsMap?: MetricsMap): ServiceTopologyConnection[];
export {};
