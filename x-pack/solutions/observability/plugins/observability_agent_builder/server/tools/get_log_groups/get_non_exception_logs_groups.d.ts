import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/types';
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
export declare function getNonExceptionLogGroups({ core, logger, esClient, index, startMs, endMs, kqlFilter: kuery, fields, size, }: {
    core: ObservabilityAgentBuilderCoreSetup;
    logger: Logger;
    esClient: IScopedClusterClient;
    index?: string;
    startMs: number;
    endMs: number;
    kqlFilter?: string;
    fields: string[];
    size: number;
}): Promise<{
    type: "log" | "logException";
    pattern: string;
    count: number;
    lastSeen: string | undefined;
    sample: Record<string, unknown>;
}[]>;
export declare function getNonExceptionLogGroupsWithQuery({ esClient, logsIndices, boolQuery, logger, size, fields, }: {
    esClient: IScopedClusterClient;
    logsIndices: string[];
    boolQuery: QueryDslBoolQuery;
    logger: Logger;
    size: number;
    fields: string[];
}): Promise<{
    type: "log" | "logException";
    pattern: string;
    count: number;
    lastSeen: string | undefined;
    sample: Record<string, unknown>;
}[] | undefined>;
