import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
type CorrelationsMetric = 'latency' | 'failure_rate';
export declare function getToolHandler({ core, plugins, logger, esClient, start, end, kqlFilter: kqlFilterValue, metric, percentileThreshold, fieldCandidates, limit, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
    esClient: IScopedClusterClient;
    start: string;
    end: string;
    kqlFilter?: string;
    metric: CorrelationsMetric;
    percentileThreshold: number;
    fieldCandidates?: string[];
    limit: number;
}): Promise<{
    metric: CorrelationsMetric;
    timeRange: {
        start: string;
        end: string;
    };
    kqlFilter: string | undefined;
    totalTransactions: number;
    subset: {
        totalTransactions: number;
        definition: {
            metric: string;
            percentileThreshold: number;
            durationThresholdUs: undefined;
        } | {
            metric: string;
            percentileThreshold?: undefined;
            durationThresholdUs?: undefined;
        };
    };
    correlations: never[];
} | {
    metric: CorrelationsMetric;
    timeRange: {
        start: string;
        end: string;
    };
    kqlFilter: string | undefined;
    totalTransactions: number;
    subset: {
        totalTransactions: number;
        definition: {
            metric: "latency";
            percentileThreshold: number;
            durationThresholdUs: number;
        } | {
            metric: "failure_rate";
        };
    };
    correlations: {
        field: string;
        values: unknown[];
    }[];
}>;
export {};
