import type { ApmDocumentType } from '@kbn/apm-data-access-plugin/common';
export type DocumentType = ApmDocumentType.ServiceTransactionMetric | ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent;
export type LatencyAggregationType = 'avg' | 'p99' | 'p95';
export declare function getLatencyAggregation({ latencyAggregationType, hasDurationSummaryField, documentType, }: {
    latencyAggregationType: LatencyAggregationType;
    hasDurationSummaryField: boolean;
    documentType: DocumentType;
}): {
    latency: {
        avg: {
            field: string;
        };
    } | {
        percentiles: {
            field: string;
            percents: number[];
        };
    };
};
export declare function getLatencyValue({ latencyAggregationType, aggregation, }: {
    latencyAggregationType: LatencyAggregationType;
    aggregation: {
        value: number | null;
    } | {
        values: Record<string, number | null>;
    };
}): number | null;
export declare function getFailureRateAggregation(documentType: DocumentType): {
    failure_rate: {
        bucket_script: {
            buckets_path: {
                successful_or_failed: string;
                success: string;
            };
            script: {
                source: string;
            };
        };
    };
    successful_or_failed: {
        value_count: import("@elastic/elasticsearch/lib/api/types").AggregationsValueCountAggregation;
    } | {
        filter: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer;
    };
    successful: {
        sum: import("@elastic/elasticsearch/lib/api/types").AggregationsSumAggregation;
    } | {
        filter: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer;
    };
};
export declare function getThroughputAggregation(durationAsMinutes: number): {
    throughput: {
        bucket_script: {
            buckets_path: {
                count: string;
            };
            script: {
                source: string;
                params: {
                    durationAsMinutes: number;
                };
            };
        };
    };
};
