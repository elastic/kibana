import { euiPaletteColorBlind } from '@elastic/eui';
import type { InferSearchResponseOf } from '@kbn/es-types';
import { ProfilingESField } from '@kbn/profiling-utils';
import type { StackFrameMetadata } from '@kbn/profiling-utils';
export declare const OTHER_BUCKET_LABEL: string;
export interface CountPerTime {
    Timestamp: number;
    Percentage: number;
    Count: number | null;
}
export interface TopNSample extends CountPerTime {
    Category: string;
    Percentage: number;
}
export interface TopNSamples {
    TopN: TopNSample[];
}
export interface TopNResponse extends TopNSamples {
    TotalCount: number;
    Metadata: Record<string, StackFrameMetadata[]>;
    Labels: Record<string, string>;
}
export interface TopNSamplesHistogramResponse {
    sum_other_doc_count: number;
    buckets: Array<{
        key: string | number;
        doc_count: number;
        count: {
            value: number | null;
        };
        over_time: {
            buckets: Array<{
                doc_count: number;
                key: string | number;
                count: {
                    value: number | null;
                };
            }>;
        };
    }>;
}
export declare function getTopNAggregationRequest({ searchField, highCardinality, fixedInterval, }: {
    searchField: string;
    highCardinality: boolean;
    fixedInterval: string;
}): {
    group_by: {
        terms: {
            field: string;
            order: {
                count: "desc";
            };
            size: number;
            execution_hint: "map" | "global_ordinals";
        };
        aggs: {
            over_time: {
                date_histogram: {
                    field: ProfilingESField;
                    fixed_interval: string;
                };
                aggs: {
                    count: {
                        sum: {
                            field: ProfilingESField;
                            missing: number;
                        };
                    };
                };
            };
            count: {
                sum: {
                    field: ProfilingESField;
                    missing: number;
                };
            };
            sample?: {
                top_metrics: {
                    metrics: [{
                        field: ProfilingESField.HostName;
                    }, {
                        field: ProfilingESField.HostIP;
                    }];
                    sort: {
                        '@timestamp': "desc";
                    };
                };
            } | undefined;
        };
    };
    over_time: {
        date_histogram: {
            field: ProfilingESField;
            fixed_interval: string;
        };
        aggs: {
            count: {
                sum: {
                    field: ProfilingESField;
                    missing: number;
                };
            };
        };
    };
    total_count: {
        sum_bucket: {
            buckets_path: string;
        };
    };
};
export declare function createTopNSamples(response: Required<InferSearchResponseOf<unknown, {
    aggs: ReturnType<typeof getTopNAggregationRequest>;
}>>['aggregations'], startMilliseconds: number, endMilliseconds: number, bucketWidth: number): TopNSample[];
export interface TopNSubchart {
    Category: string;
    Label: string;
    Percentage: number;
    Series: CountPerTime[];
    Color: string;
    Index: number;
    Metadata: StackFrameMetadata[];
}
export declare function getCategoryColor({ category, subChartSize, colors, }: {
    category: string;
    subChartSize: number;
    colors: ReturnType<typeof euiPaletteColorBlind>;
}): string;
export declare function groupSamplesByCategory(topNResponse: TopNResponse): {
    charts: TopNSubchart[];
};
