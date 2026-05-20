import * as rt from 'io-ts';
export declare const METRIC_EXPLORER_AGGREGATIONS: readonly ["avg", "max", "min", "cardinality", "rate", "count", "sum", "p95", "p99", "custom"];
export declare const OMITTED_AGGREGATIONS_FOR_CUSTOM_METRICS: string[];
export declare const metricsExplorerAggregationRT: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
export type MetricExplorerCustomMetricAggregations = Exclude<MetricsExplorerAggregation, 'custom' | 'rate' | 'p95' | 'p99'>;
export declare const metricsExplorerCustomMetricAggregationRT: rt.KeyofC<Record<MetricExplorerCustomMetricAggregations, null>>;
export declare const metricsExplorerMetricRequiredFieldsRT: rt.TypeC<{
    aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
}>;
export declare const metricsExplorerCustomMetricRT: rt.IntersectionC<[rt.TypeC<{
    name: rt.StringC;
    aggregation: rt.KeyofC<Record<MetricExplorerCustomMetricAggregations, null>>;
}>, rt.PartialC<{
    field: rt.StringC;
    filter: rt.StringC;
}>]>;
export type MetricsExplorerCustomMetric = rt.TypeOf<typeof metricsExplorerCustomMetricRT>;
export declare const metricsExplorerMetricOptionalFieldsRT: rt.PartialC<{
    field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
    custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        name: rt.StringC;
        aggregation: rt.KeyofC<Record<MetricExplorerCustomMetricAggregations, null>>;
    }>, rt.PartialC<{
        field: rt.StringC;
        filter: rt.StringC;
    }>]>>;
    equation: rt.StringC;
}>;
export declare const metricsExplorerMetricRT: rt.IntersectionC<[rt.TypeC<{
    aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
}>, rt.PartialC<{
    field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
    custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        name: rt.StringC;
        aggregation: rt.KeyofC<Record<MetricExplorerCustomMetricAggregations, null>>;
    }>, rt.PartialC<{
        field: rt.StringC;
        filter: rt.StringC;
    }>]>>;
    equation: rt.StringC;
}>]>;
export declare const timeRangeRT: rt.TypeC<{
    from: rt.NumberC;
    to: rt.NumberC;
    interval: rt.StringC;
}>;
export declare const metricsExplorerRequestBodyRequiredFieldsRT: rt.TypeC<{
    timerange: rt.TypeC<{
        from: rt.NumberC;
        to: rt.NumberC;
        interval: rt.StringC;
    }>;
    indexPattern: rt.StringC;
    metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
    }>, rt.PartialC<{
        field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
        custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            name: rt.StringC;
            aggregation: rt.KeyofC<Record<MetricExplorerCustomMetricAggregations, null>>;
        }>, rt.PartialC<{
            field: rt.StringC;
            filter: rt.StringC;
        }>]>>;
        equation: rt.StringC;
    }>]>>;
}>;
export declare const afterKeyObjectRT: rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NullC]>>;
export declare const metricsExplorerRequestBodyOptionalFieldsRT: rt.PartialC<{
    groupBy: rt.UnionC<[rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC]>, rt.ArrayC<rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC]>>]>;
    groupInstance: rt.UnionC<[rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC]>, rt.ArrayC<rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC]>>]>;
    afterKey: rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NullC]>>]>;
    limit: rt.UnionC<[rt.NumberC, rt.NullC, rt.UndefinedC]>;
    kuery: rt.StringC;
    forceInterval: rt.BooleanC;
    dropLastBucket: rt.BooleanC;
}>;
export declare const metricsExplorerRequestBodyRT: rt.IntersectionC<[rt.TypeC<{
    timerange: rt.TypeC<{
        from: rt.NumberC;
        to: rt.NumberC;
        interval: rt.StringC;
    }>;
    indexPattern: rt.StringC;
    metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        aggregation: rt.KeyofC<Record<"min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99", null>>;
    }>, rt.PartialC<{
        field: rt.UnionC<[rt.StringC, rt.UndefinedC]>;
        custom_metrics: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            name: rt.StringC;
            aggregation: rt.KeyofC<Record<MetricExplorerCustomMetricAggregations, null>>;
        }>, rt.PartialC<{
            field: rt.StringC;
            filter: rt.StringC;
        }>]>>;
        equation: rt.StringC;
    }>]>>;
}>, rt.PartialC<{
    groupBy: rt.UnionC<[rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC]>, rt.ArrayC<rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC]>>]>;
    groupInstance: rt.UnionC<[rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC]>, rt.ArrayC<rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC]>>]>;
    afterKey: rt.UnionC<[rt.StringC, rt.NullC, rt.UndefinedC, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NullC]>>]>;
    limit: rt.UnionC<[rt.NumberC, rt.NullC, rt.UndefinedC]>;
    kuery: rt.StringC;
    forceInterval: rt.BooleanC;
    dropLastBucket: rt.BooleanC;
}>]>;
export declare const metricsExplorerPageInfoRT: rt.TypeC<{
    total: rt.NumberC;
    afterKey: rt.UnionC<[rt.StringC, rt.NullC, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NullC]>>]>;
}>;
export declare const metricsExplorerColumnTypeRT: rt.KeyofC<{
    date: null;
    number: null;
    string: null;
}>;
export declare const metricsExplorerColumnRT: rt.TypeC<{
    name: rt.StringC;
    type: rt.KeyofC<{
        date: null;
        number: null;
        string: null;
    }>;
}>;
export declare const metricsExplorerRowRT: rt.IntersectionC<[rt.TypeC<{
    timestamp: rt.NumberC;
}>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>;
export declare const metricsExplorerSeriesRT: rt.IntersectionC<[rt.TypeC<{
    id: rt.StringC;
    columns: rt.ArrayC<rt.TypeC<{
        name: rt.StringC;
        type: rt.KeyofC<{
            date: null;
            number: null;
            string: null;
        }>;
    }>>;
    rows: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        timestamp: rt.NumberC;
    }>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>>;
}>, rt.PartialC<{
    keys: rt.ArrayC<rt.StringC>;
}>]>;
export declare const metricsExplorerResponseRT: rt.TypeC<{
    series: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
        id: rt.StringC;
        columns: rt.ArrayC<rt.TypeC<{
            name: rt.StringC;
            type: rt.KeyofC<{
                date: null;
                number: null;
                string: null;
            }>;
        }>>;
        rows: rt.ArrayC<rt.IntersectionC<[rt.TypeC<{
            timestamp: rt.NumberC;
        }>, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NumberC, rt.NullC, rt.UndefinedC, rt.ArrayC<rt.ObjectC>]>>]>>;
    }>, rt.PartialC<{
        keys: rt.ArrayC<rt.StringC>;
    }>]>>;
    pageInfo: rt.TypeC<{
        total: rt.NumberC;
        afterKey: rt.UnionC<[rt.StringC, rt.NullC, rt.RecordC<rt.StringC, rt.UnionC<[rt.StringC, rt.NullC]>>]>;
    }>;
}>;
export type AfterKey = rt.TypeOf<typeof afterKeyObjectRT>;
export type MetricsExplorerAggregation = rt.TypeOf<typeof metricsExplorerAggregationRT>;
export type MetricsExplorerColumnType = rt.TypeOf<typeof metricsExplorerColumnTypeRT>;
export type MetricsExplorerMetric = rt.TypeOf<typeof metricsExplorerMetricRT>;
export type MetricsExplorerPageInfo = rt.TypeOf<typeof metricsExplorerPageInfoRT>;
export type MetricsExplorerColumn = rt.TypeOf<typeof metricsExplorerColumnRT>;
export type MetricsExplorerRow = rt.TypeOf<typeof metricsExplorerRowRT>;
export type MetricsExplorerSeries = rt.TypeOf<typeof metricsExplorerSeriesRT>;
export type MetricsExplorerRequestBody = rt.TypeOf<typeof metricsExplorerRequestBodyRT>;
export type MetricsExplorerResponse = rt.TypeOf<typeof metricsExplorerResponseRT>;
