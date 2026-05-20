import type { ECS_CONTAINER_CPU_USAGE_LIMIT_PCT, ECS_CONTAINER_MEMORY_USAGE_BYTES, SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT, SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION, SEMCONV_CONTAINER_CPU_USAGE, SEMCONV_CONTAINER_MEMORY_WORKING_SET } from '../shared/constants';
type ContainerMetricsFieldEcs = typeof ECS_CONTAINER_CPU_USAGE_LIMIT_PCT | typeof ECS_CONTAINER_MEMORY_USAGE_BYTES;
type ContainerMetricsFieldSemconvDocker = typeof SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION | typeof SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT;
type ContainerMetricsFieldSemconvK8s = typeof SEMCONV_CONTAINER_CPU_USAGE | typeof SEMCONV_CONTAINER_MEMORY_WORKING_SET;
export declare const metricByFieldEcs: Record<ContainerMetricsFieldEcs, string>;
export declare const unpackMetricEcs: (row: import("../../../../common/http_api").MetricsExplorerRow, field: ContainerMetricsFieldEcs) => number | null;
export declare const unpackMetricSemconvDocker: (row: import("../../../../common/http_api").MetricsExplorerRow, field: ContainerMetricsFieldSemconvDocker) => number | null;
export declare const metricByFieldSemconvK8s: Record<ContainerMetricsFieldSemconvK8s, string>;
export declare const unpackMetricSemconvK8s: (row: import("../../../../common/http_api").MetricsExplorerRow, field: ContainerMetricsFieldSemconvK8s) => number | null;
/** @deprecated Use metricByFieldEcs for ECS; use unpack from getUnpackMetricsForSchema for transform */
export declare const metricByField: Record<ContainerMetricsFieldEcs, string>;
export declare function getOptionsForSchema(isOtel: boolean, isK8sContainer?: boolean, kuery?: string): {
    options: {
        aggregation: "min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99";
        metrics: ({
            aggregation: "min" | "max" | "custom" | "count" | "sum" | "avg" | "cardinality" | "rate" | "p95" | "p99";
        } & {
            field?: string | undefined;
            custom_metrics?: ({
                name: string;
                aggregation: import("../../../../common/http_api").MetricExplorerCustomMetricAggregations;
            } & {
                field?: string | undefined;
                filter?: string | undefined;
            })[] | undefined;
            equation?: string | undefined;
        } & {
            rate?: boolean | undefined;
            color?: import("../../../../common/color_palette").Color | undefined;
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
export {};
