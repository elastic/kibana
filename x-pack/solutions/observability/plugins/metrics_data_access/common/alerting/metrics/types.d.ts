export declare enum Aggregators {
    COUNT = "count",
    AVERAGE = "avg",
    SUM = "sum",
    MIN = "min",
    MAX = "max",
    RATE = "rate",
    CARDINALITY = "cardinality",
    P95 = "p95",
    P99 = "p99",
    CUSTOM = "custom"
}
export type CustomMetricAggTypes = Exclude<Aggregators, Aggregators.CUSTOM | Aggregators.RATE | Aggregators.P95 | Aggregators.P99>;
export interface MetricExpressionCustomMetric {
    name: string;
    aggType: CustomMetricAggTypes;
    field?: string;
    filter?: string;
}
