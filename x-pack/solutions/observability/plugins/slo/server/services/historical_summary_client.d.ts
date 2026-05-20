import type { ElasticsearchClient } from '@kbn/core/server';
import type { FetchHistoricalSummaryParams, FetchHistoricalSummaryResponse } from '@kbn/slo-schema';
export declare class HistoricalSummaryClient {
    private esClient;
    constructor(esClient: ElasticsearchClient);
    fetch(params: FetchHistoricalSummaryParams): Promise<FetchHistoricalSummaryResponse>;
}
export declare function getFixedIntervalAndBucketsPerDay(durationInDays: number): {
    fixedInterval: string;
    bucketsPerDay: number;
};
