import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { ChangePointType } from '@kbn/es-types/src';
import type { ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginStart, ObservabilityAgentBuilderPluginStartDependencies } from '../../types';
import type { ChangePointDetails } from '../../utils/get_change_points';
import { type LatencyAggregationType } from '../../utils/trace_metrics_aggregations';
interface Bucket {
    key: string | number;
    key_as_string?: string;
    doc_count: number;
}
interface ChangePointResult {
    type: Record<ChangePointType, ChangePointDetails>;
    bucket?: Bucket;
}
interface BucketChangePoints extends Bucket {
    changes_latency: ChangePointResult;
    changes_throughput: ChangePointResult;
    changes_failure_rate: ChangePointResult;
    latency_type: LatencyAggregationType;
    time_series: Array<{
        group: string;
        latency: number | null;
        throughput: number | null;
        failure_rate: number | null;
    }>;
}
export declare function getToolHandler({ core, plugins, request, logger, start, end, kqlFilter, groupBy, latencyType, }: {
    core: CoreSetup<ObservabilityAgentBuilderPluginStartDependencies, ObservabilityAgentBuilderPluginStart>;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    request: KibanaRequest;
    logger: Logger;
    start: string;
    end: string;
    kqlFilter?: string;
    groupBy: string;
    latencyType: LatencyAggregationType | undefined;
}): Promise<BucketChangePoints[]>;
export {};
