import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
export declare function getToolHandler({ core, plugins, logger, esClient, start, end, index, kqlFilter, fields, maxTraces, maxDocsPerTrace, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    logger: Logger;
    esClient: IScopedClusterClient;
    start: string;
    end: string;
    index?: string;
    kqlFilter: string;
    fields?: string[];
    maxTraces: number;
    maxDocsPerTrace: number;
}): Promise<{
    traces: {
        traceId: string;
        items: Record<string, unknown>[];
        services: import("./get_trace_documents").ServiceAggregate[];
        error?: string;
        isTruncated: boolean;
        isOutputTruncated?: boolean;
        message?: string;
    }[];
}>;
