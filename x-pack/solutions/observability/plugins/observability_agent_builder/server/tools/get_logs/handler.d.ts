import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare function getDefaultBucketSize(startMs: number, endMs: number): string;
interface GetLogsParams {
    start: string;
    end: string;
    index: string;
    kqlFilter?: string;
    limit: number;
    bucketSize: string;
    groupBy?: string;
    fields: string[];
}
export interface GetLogsResult {
    histogram: Array<{
        bucket: string;
        count: number;
        group?: string;
    }>;
    totalCount: number;
    samples: Array<{
        _id?: string;
        _index?: string;
        [key: string]: unknown;
    }>;
    categories: Array<{
        type: 'log' | 'exception';
        pattern: string;
        count: number;
        sample: {
            _id?: string;
            _index?: string;
            [key: string]: unknown;
        };
    }>;
    topValues: Record<string, Array<{
        value: string;
        count: number;
    }>>;
}
export declare function getLogsHandler({ esClient, params, }: {
    esClient: ElasticsearchClient;
    params: GetLogsParams;
}): Promise<GetLogsResult>;
export {};
