import type { MetricsExplorerOptionsMetric } from '../../../../../common/metrics_explorer_views/types';
export interface MetricsQueryOptions<T extends string> {
    sourceFilter: string;
    groupByField: string | string[];
    metricsMap: MetricsMap<T>;
}
export type MetricsMap<T extends string> = {
    [field in T]: NodeMetricsExplorerOptionsMetric<field>;
};
export interface NodeMetricsExplorerOptionsMetric<Field extends string> extends Omit<MetricsExplorerOptionsMetric, 'field'> {
    field: Field;
}
export declare function metricsToApiOptions<T extends string>(metricsQueryOptions: MetricsQueryOptions<T>, kuery?: string): {
    options: {
        aggregation: "min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99";
        metrics: ({
            aggregation: "min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99";
        } & {
            field?: string | undefined;
            custom_metrics?: ({
                name: string;
                aggregation: import("../../../../../common/http_api").MetricExplorerCustomMetricAggregations;
            } & {
                field?: string | undefined;
                filter?: string | undefined;
            })[] | undefined;
            equation?: string | undefined;
        } & {
            rate?: boolean | undefined;
            color?: import("../../../../../common/color_palette").Color | undefined;
            label?: string | undefined;
        })[];
    } & {
        limit?: number | undefined;
        groupBy?: string | string[] | undefined;
        kuery?: string | undefined;
        source?: string | undefined;
        forceInterval?: boolean | undefined;
        dropLastBucket?: boolean | undefined;
    };
};
export declare function createMetricByFieldLookup<T extends string>(metricMap: MetricsMap<T>): Record<T, string>;
