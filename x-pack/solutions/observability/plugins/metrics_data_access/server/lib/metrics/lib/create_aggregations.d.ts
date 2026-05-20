import type { AggregationOptionsByType } from '@kbn/es-types';
import type { MetricsAPIRequest } from '../../../../common/http_api/metrics_api';
import { createMetricsAggregations } from './create_metrics_aggregations';
type MetricsAggregation = ReturnType<typeof createMetricsAggregations>;
export declare const createCompositeAggregations: (options: MetricsAPIRequest) => {
    groupings: {
        composite: {
            after?: {
                [x: string]: string | null;
            } | undefined;
            size: number;
            sources: {
                [x: string]: {
                    terms: {
                        field: string | null | undefined;
                    };
                };
            }[];
        };
        aggs: {
            metricsets: {
                terms: {
                    field: string;
                };
            };
        } | {
            metricsets: {
                terms: {
                    field: string;
                };
            };
            histogram: {
                date_histogram: AggregationOptionsByType["date_histogram"];
                aggregations: MetricsAggregation;
            };
        };
    };
};
export declare const createAggregations: (options: MetricsAPIRequest) => {
    metricsets: {
        terms: {
            field: string;
        };
    };
    histogram: {
        date_histogram: AggregationOptionsByType["date_histogram"];
        aggregations: MetricsAggregation;
    };
};
export {};
