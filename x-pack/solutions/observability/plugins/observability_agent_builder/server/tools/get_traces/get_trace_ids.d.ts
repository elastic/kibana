import type { IScopedClusterClient, Logger } from '@kbn/core/server';
export declare function getTraceIds({ esClient, indices, startTime, endTime, kqlFilter, logger, maxTraces, }: {
    esClient: IScopedClusterClient;
    indices: string[];
    startTime: number;
    endTime: number;
    kqlFilter: string | undefined;
    logger: Logger;
    maxTraces: number;
}): Promise<string[]>;
