import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare function getToolHandler({ esClient, logger, index, timeFieldName, baseline, deviation, kqlFilter, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    index: string;
    timeFieldName: string;
    baseline: {
        start: string;
        end: string;
    };
    deviation: {
        start: string;
        end: string;
    };
    kqlFilter?: string;
}): Promise<{
    analysisType: import("@kbn/aiops-log-rate-analysis").LogRateAnalysisType;
    items: {
        score: number;
        fieldType: string;
        fieldName: string;
        fieldValue: string;
        message: string;
        change: {
            baseline: number;
            deviation: number;
        };
    }[];
}>;
