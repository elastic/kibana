import type * as rt from 'io-ts';
import type { Color } from '../color_palette';
export declare const inventorySortOptionRT: rt.TypeC<{
    by: rt.KeyofC<{
        name: null;
        value: null;
    }>;
    direction: rt.KeyofC<{
        asc: null;
        desc: null;
    }>;
}>;
export declare enum MetricsExplorerChartType {
    line = "line",
    area = "area",
    bar = "bar"
}
export declare enum MetricsExplorerYAxisMode {
    fromZero = "fromZero",
    auto = "auto"
}
export declare const metricsExplorerChartOptionsRT: rt.TypeC<{
    yAxisMode: rt.KeyofC<Record<MetricsExplorerYAxisMode, null>>;
    type: rt.KeyofC<Record<MetricsExplorerChartType, null>>;
    stack: rt.BooleanC;
}>;
export declare const metricsExplorerTimeOptionsRT: rt.TypeC<{
    from: rt.StringC;
    to: rt.StringC;
    interval: rt.StringC;
}>;
declare const metricsExplorerOptionsMetricRT: rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
    aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
}>, rt.PartialC<{
    field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
    custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        name: rt.StringC;
        aggregation: rt.KeyofC<Record<import("../http_api/metrics_explorer").MetricExplorerCustomMetricAggregations, null>>;
    }>, rt.PartialC<{
        field: rt.StringC;
        filter: rt.StringC;
    }>]>>;
    equation: rt.StringC;
}>]>, rt.PartialC<{
    rate: rt.BooleanC;
    color: rt.KeyofC<Record<Color, null>>;
    label: rt.StringC;
}>]>;
export declare const metricExplorerOptionsRequiredRT: rt.TypeC<{
    aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
    metrics: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
        aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
    }>, rt.PartialC<{
        field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
        custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            name: rt.StringC;
            aggregation: rt.KeyofC<Record<import("../http_api/metrics_explorer").MetricExplorerCustomMetricAggregations, null>>;
        }>, rt.PartialC<{
            field: rt.StringC;
            filter: rt.StringC;
        }>]>>;
        equation: rt.StringC;
    }>]>, rt.PartialC<{
        rate: rt.BooleanC;
        color: rt.KeyofC<Record<Color, null>>;
        label: rt.StringC;
    }>]>>;
}>;
export declare const metricExplorerOptionsOptionalRT: rt.PartialC<{
    limit: rt.NumberC;
    groupBy: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
    kuery: rt.StringC;
    source: rt.StringC;
    forceInterval: rt.BooleanC;
    dropLastBucket: rt.BooleanC;
}>;
export declare const metricsExplorerOptionsRT: rt.IntersectionC<[rt.TypeC<{
    aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
    metrics: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
        aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
    }>, rt.PartialC<{
        field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
        custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            name: rt.StringC;
            aggregation: rt.KeyofC<Record<import("../http_api/metrics_explorer").MetricExplorerCustomMetricAggregations, null>>;
        }>, rt.PartialC<{
            field: rt.StringC;
            filter: rt.StringC;
        }>]>>;
        equation: rt.StringC;
    }>]>, rt.PartialC<{
        rate: rt.BooleanC;
        color: rt.KeyofC<Record<Color, null>>;
        label: rt.StringC;
    }>]>>;
}>, rt.PartialC<{
    limit: rt.NumberC;
    groupBy: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
    kuery: rt.StringC;
    source: rt.StringC;
    forceInterval: rt.BooleanC;
    dropLastBucket: rt.BooleanC;
}>]>;
export declare const metricExplorerViewStateRT: rt.TypeC<{
    chartOptions: rt.TypeC<{
        yAxisMode: rt.KeyofC<Record<MetricsExplorerYAxisMode, null>>;
        type: rt.KeyofC<Record<MetricsExplorerChartType, null>>;
        stack: rt.BooleanC;
    }>;
    currentTimerange: rt.TypeC<{
        from: rt.StringC;
        to: rt.StringC;
        interval: rt.StringC;
    }>;
    options: rt.IntersectionC<[rt.TypeC<{
        aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
        metrics: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
            aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
        }>, rt.PartialC<{
            field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
            custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
                name: rt.StringC;
                aggregation: rt.KeyofC<Record<import("../http_api/metrics_explorer").MetricExplorerCustomMetricAggregations, null>>;
            }>, rt.PartialC<{
                field: rt.StringC;
                filter: rt.StringC;
            }>]>>;
            equation: rt.StringC;
        }>]>, rt.PartialC<{
            rate: rt.BooleanC;
            color: rt.KeyofC<Record<Color, null>>;
            label: rt.StringC;
        }>]>>;
    }>, rt.PartialC<{
        limit: rt.NumberC;
        groupBy: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
        kuery: rt.StringC;
        source: rt.StringC;
        forceInterval: rt.BooleanC;
        dropLastBucket: rt.BooleanC;
    }>]>;
}>;
export declare const metricsExplorerViewBasicAttributesRT: rt.TypeC<{
    name: rt.BrandC<rt.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
}>;
export declare const metricsExplorerViewAttributesRT: rt.IntersectionC<[rt.TypeC<{
    chartOptions: rt.TypeC<{
        yAxisMode: rt.KeyofC<Record<MetricsExplorerYAxisMode, null>>;
        type: rt.KeyofC<Record<MetricsExplorerChartType, null>>;
        stack: rt.BooleanC;
    }>;
    currentTimerange: rt.TypeC<{
        from: rt.StringC;
        to: rt.StringC;
        interval: rt.StringC;
    }>;
    options: rt.IntersectionC<[rt.TypeC<{
        aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
        metrics: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
            aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
        }>, rt.PartialC<{
            field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
            custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
                name: rt.StringC;
                aggregation: rt.KeyofC<Record<import("../http_api/metrics_explorer").MetricExplorerCustomMetricAggregations, null>>;
            }>, rt.PartialC<{
                field: rt.StringC;
                filter: rt.StringC;
            }>]>>;
            equation: rt.StringC;
        }>]>, rt.PartialC<{
            rate: rt.BooleanC;
            color: rt.KeyofC<Record<Color, null>>;
            label: rt.StringC;
        }>]>>;
    }>, rt.PartialC<{
        limit: rt.NumberC;
        groupBy: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
        kuery: rt.StringC;
        source: rt.StringC;
        forceInterval: rt.BooleanC;
        dropLastBucket: rt.BooleanC;
    }>]>;
}>, rt.TypeC<{
    name: rt.BrandC<rt.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
}>, rt.PartialC<{
    isDefault: rt.BooleanC;
    isStatic: rt.BooleanC;
}>]>;
export declare const metricsExplorerViewRT: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    attributes: rt.IntersectionC<[rt.TypeC<{
        chartOptions: rt.TypeC<{
            yAxisMode: rt.KeyofC<Record<MetricsExplorerYAxisMode, null>>;
            type: rt.KeyofC<Record<MetricsExplorerChartType, null>>;
            stack: rt.BooleanC;
        }>;
        currentTimerange: rt.TypeC<{
            from: rt.StringC;
            to: rt.StringC;
            interval: rt.StringC;
        }>;
        options: rt.IntersectionC<[rt.TypeC<{
            aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
            metrics: rt.ArrayC<rt.IntersectionC<[rt.IntersectionC<[rt.TypeC<{
                aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
            }>, rt.PartialC<{
                field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
                custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
                    name: rt.StringC;
                    aggregation: rt.KeyofC<Record<import("../http_api/metrics_explorer").MetricExplorerCustomMetricAggregations, null>>;
                }>, rt.PartialC<{
                    field: rt.StringC;
                    filter: rt.StringC;
                }>]>>;
                equation: rt.StringC;
            }>]>, rt.PartialC<{
                rate: rt.BooleanC;
                color: rt.KeyofC<Record<Color, null>>;
                label: rt.StringC;
            }>]>>;
        }>, rt.PartialC<{
            limit: rt.NumberC;
            groupBy: rt.UnionC<[rt.StringC, rt.ArrayC<rt.StringC>]>;
            kuery: rt.StringC;
            source: rt.StringC;
            forceInterval: rt.BooleanC;
            dropLastBucket: rt.BooleanC;
        }>]>;
    }>, rt.TypeC<{
        name: rt.BrandC<rt.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
    }>, rt.PartialC<{
        isDefault: rt.BooleanC;
        isStatic: rt.BooleanC;
    }>]>;
}>, rt.PartialC<{
    updatedAt: rt.Type<number, string, unknown>;
    version: rt.StringC;
}>]>>;
export declare const singleMetricsExplorerViewRT: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    attributes: rt.ExactC<rt.IntersectionC<[rt.TypeC<{
        name: rt.BrandC<rt.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
    }>, rt.PartialC<{
        isDefault: rt.BooleanC;
        isStatic: rt.BooleanC;
    }>]>>;
}>, rt.PartialC<{
    updatedAt: rt.Type<number, string, unknown>;
    version: rt.StringC;
}>]>>;
export type MetricsExplorerChartOptions = rt.TypeOf<typeof metricsExplorerChartOptionsRT>;
export type MetricsExplorerOptions = rt.TypeOf<typeof metricsExplorerOptionsRT>;
export type MetricsExplorerOptionsMetric = rt.TypeOf<typeof metricsExplorerOptionsMetricRT>;
export type MetricsExplorerViewState = rt.TypeOf<typeof metricExplorerViewStateRT>;
export type MetricsExplorerTimeOptions = rt.TypeOf<typeof metricsExplorerTimeOptionsRT>;
export type MetricsExplorerViewAttributes = rt.TypeOf<typeof metricsExplorerViewAttributesRT>;
export type MetricsExplorerView = rt.TypeOf<typeof metricsExplorerViewRT>;
export {};
