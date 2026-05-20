import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
export declare function getLogExceptionGroups({ core, esClient, index, startMs, endMs, kqlFilter: kqlFilterValue, size, logger, fields, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    esClient: IScopedClusterClient;
    index: string | undefined;
    startMs: number;
    endMs: number;
    kqlFilter: string | undefined;
    size: number;
    logger: Logger;
    fields: string[];
}): Promise<{
    type: "log" | "logException";
    pattern: string;
    count: number;
    lastSeen: string | undefined;
    sample: Record<string, unknown>;
}[]>;
