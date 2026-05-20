import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup, ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
export declare function getToolHandler({ core, plugins, request, logger, esClient, index, start, end, kqlFilter, fields, includeStackTrace, includeFirstSeen, size, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    plugins: ObservabilityAgentBuilderPluginSetupDependencies;
    request: KibanaRequest;
    logger: Logger;
    esClient: IScopedClusterClient;
    index?: string;
    start: string;
    end: string;
    kqlFilter?: string;
    fields: string[];
    includeStackTrace: boolean;
    includeFirstSeen: boolean;
    size: number;
}): Promise<({
    type: "log" | "logException";
    pattern: string;
    count: number;
    lastSeen: string | undefined;
    sample: Record<string, unknown>;
} | {
    firstSeen?: string | undefined;
    count: number;
    lastSeen: string | undefined;
    sample: {
        [key: string]: unknown;
        "error.grouping_key": string;
    };
    type: "spanException";
})[]>;
