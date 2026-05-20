import type { IScopedClusterClient } from '@kbn/core/server';
import type { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/types';
export declare function getSamplingProbability({ esClient, index, boolQuery, }: {
    esClient: IScopedClusterClient;
    index: string[];
    boolQuery: QueryDslBoolQuery;
}): Promise<{
    samplingProbability: number;
    totalHits: number;
}>;
export declare function getCategorizedLogs({ esClient, index, boolQuery, samplingProbability, size, fields, messageField, type, }: {
    esClient: IScopedClusterClient;
    index: string[];
    boolQuery: QueryDslBoolQuery;
    samplingProbability: number;
    size: number;
    fields: string[];
    messageField: string;
    type: 'log' | 'logException';
}): Promise<{
    type: "log" | "logException";
    pattern: string;
    count: number;
    lastSeen: string | undefined;
    sample: Record<string, unknown>;
}[]>;
