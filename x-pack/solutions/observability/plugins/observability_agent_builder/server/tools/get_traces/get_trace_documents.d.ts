import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
export interface ServiceAggregate {
    serviceName: string;
    count: number;
    errorCount: number;
}
export declare function getTraceDocuments({ esClient, traceIds, index, startTime, endTime, maxDocsPerTrace, fields, }: {
    esClient: IScopedClusterClient;
    traceIds: string[];
    index: string[];
    startTime: number;
    endTime: number;
    maxDocsPerTrace: number;
    fields?: string[];
}): Promise<{
    traceId: string;
    items: Record<string, unknown>[];
    services: ServiceAggregate[];
    error?: string;
    isTruncated: boolean;
    isOutputTruncated?: boolean;
    message?: string;
}[]>;
