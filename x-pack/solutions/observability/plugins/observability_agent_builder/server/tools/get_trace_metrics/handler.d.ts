import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginStart, ObservabilityAgentBuilderPluginStartDependencies } from '../../types';
import { type LatencyAggregationType } from '../../utils/trace_metrics_aggregations';
export interface TraceMetricsItem {
    group: string;
    latency: number;
    throughput: number;
    failureRate: number;
}
export declare function getToolHandler({ core, plugins, request, logger, start, end, kqlFilter, groupBy, latencyType, sortBy, }: {
    core: CoreSetup<ObservabilityAgentBuilderPluginStartDependencies, ObservabilityAgentBuilderPluginStart>;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    request: KibanaRequest;
    logger: Logger;
    start: string;
    end: string;
    groupBy: string;
    kqlFilter?: string;
    latencyType: LatencyAggregationType | undefined;
    sortBy: 'latency' | 'throughput' | 'failureRate';
}): Promise<{
    items: TraceMetricsItem[];
    latencyType: LatencyAggregationType;
}>;
