import type { CoreSetup, IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderPluginSetupDependencies, ObservabilityAgentBuilderPluginStart, ObservabilityAgentBuilderPluginStartDependencies } from '../../types';
import { type DataStreamInfo } from './get_data_streams_handler';
export interface IndexPatternsResult {
    indexPatterns: {
        apm: {
            transaction: string;
            span: string;
            error: string;
            metric: string;
        };
        logs: string[];
        metrics: string[];
        alerts: string[];
    };
    /** Discovered data streams for targeted field discovery */
    dataStreams: DataStreamInfo[];
}
/**
 * Returns observability index patterns and discovered data streams.
 * The data streams help identify what specific datasets exist in the cluster,
 * enabling more targeted field discovery (e.g., query metrics-system.memory-* for memory fields).
 */
export declare function getIndexPatternsHandler({ core, plugins, esClient, logger, }: {
    core: CoreSetup<ObservabilityAgentBuilderPluginStartDependencies, ObservabilityAgentBuilderPluginStart>;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    esClient: IScopedClusterClient;
    logger: Logger;
}): Promise<IndexPatternsResult>;
