import * as rt from 'io-ts';
import type { metricsExplorerViewRT } from '../../../metrics_explorer_views';
export declare const updateMetricsExplorerViewAttributesRequestPayloadRT: rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
    chartOptions: rt.TypeC<{
        yAxisMode: rt.KeyofC<Record<import("../../../metrics_explorer_views").MetricsExplorerYAxisMode, null>>;
        type: rt.KeyofC<Record<import("../../../metrics_explorer_views").MetricsExplorerChartType, null>>;
        stack: rt.BooleanC;
    }>;
    currentTimerange: rt.TypeC<{
        from: rt.StringC;
        to: rt.StringC;
        interval: rt.StringC;
    }>;
    options: rt.IntersectionC<[rt.TypeC<{
        aggregation: rt.KeyofC<Record<"avg" | "cardinality" | "max" | "min" | "rate" | "sum" | "count" | "custom" | "p99" | "p95" | "last_value", null>>;
        metrics: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
            aggregation: rt.KeyofC<Record<"avg" | "cardinality" | "max" | "min" | "rate" | "sum" | "count" | "custom" | "p99" | "p95" | "last_value", null>>;
        }>, rt.PartialC<{
            field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
            custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
                name: rt.StringC;
                aggregation: rt.KeyofC<Record<import("../..").MetricExplorerCustomMetricAggregations, null>>;
            }>, rt.PartialC<{
                field: rt.StringC;
                filter: rt.StringC;
            }>]>>;
            equation: rt.StringC;
        }>]>, rt.PartialC<{
            rate: rt.BooleanC;
            color: rt.KeyofC<Record<import("../../../color_palette").Color, null>>;
            label: rt.StringC;
        }>]>>;
    }>, rt.PartialC<{
        limit: rt.NumberC;
        groupBy: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
        groupInstance: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
        filterQuery: rt.StringC;
        source: rt.StringC;
        forceInterval: rt.BooleanC;
        dropLastBucket: rt.BooleanC;
    }>]>;
}>, rt.TypeC<{
    name: rt.BrandC<rt.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
}>, rt.PartialC<{
    isDefault: rt.BooleanC;
    isStatic: rt.BooleanC;
}>]>, rt.PartialC<{
    isDefault: rt.UndefinedC;
    isStatic: rt.UndefinedC;
}>]>;
export type UpdateMetricsExplorerViewAttributesRequestPayload = rt.TypeOf<typeof updateMetricsExplorerViewAttributesRequestPayloadRT>;
export declare const updateMetricsExplorerViewRequestPayloadRT: rt.TypeC<{
    attributes: rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
        chartOptions: rt.TypeC<{
            yAxisMode: rt.KeyofC<Record<import("../../../metrics_explorer_views").MetricsExplorerYAxisMode, null>>;
            type: rt.KeyofC<Record<import("../../../metrics_explorer_views").MetricsExplorerChartType, null>>;
            stack: rt.BooleanC;
        }>;
        currentTimerange: rt.TypeC<{
            from: rt.StringC;
            to: rt.StringC;
            interval: rt.StringC;
        }>;
        options: rt.IntersectionC<[rt.TypeC<{
            aggregation: rt.KeyofC<Record<"avg" | "cardinality" | "max" | "min" | "rate" | "sum" | "count" | "custom" | "p99" | "p95" | "last_value", null>>;
            metrics: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
                aggregation: rt.KeyofC<Record<"avg" | "cardinality" | "max" | "min" | "rate" | "sum" | "count" | "custom" | "p99" | "p95" | "last_value", null>>;
            }>, rt.PartialC<{
                field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
                custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
                    name: rt.StringC;
                    aggregation: rt.KeyofC<Record<import("../..").MetricExplorerCustomMetricAggregations, null>>;
                }>, rt.PartialC<{
                    field: rt.StringC;
                    filter: rt.StringC;
                }>]>>;
                equation: rt.StringC;
            }>]>, rt.PartialC<{
                rate: rt.BooleanC;
                color: rt.KeyofC<Record<import("../../../color_palette").Color, null>>;
                label: rt.StringC;
            }>]>>;
        }>, rt.PartialC<{
            limit: rt.NumberC;
            groupBy: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
            groupInstance: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
            filterQuery: rt.StringC;
            source: rt.StringC;
            forceInterval: rt.BooleanC;
            dropLastBucket: rt.BooleanC;
        }>]>;
    }>, rt.TypeC<{
        name: rt.BrandC<rt.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
    }>, rt.PartialC<{
        isDefault: rt.BooleanC;
        isStatic: rt.BooleanC;
    }>]>, rt.PartialC<{
        isDefault: rt.UndefinedC;
        isStatic: rt.UndefinedC;
    }>]>;
}>;
export type UpdateMetricsExplorerViewResponsePayload = rt.TypeOf<typeof metricsExplorerViewRT>;
