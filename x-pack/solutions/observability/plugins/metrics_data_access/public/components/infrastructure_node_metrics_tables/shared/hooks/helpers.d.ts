import type { MetricsExplorerRow } from '../../../../../common/http_api/metrics_explorer';
export declare function averageOfValues(values: number[]): number;
export declare function makeUnpackMetric<T extends string>(metricByField: Record<T, string>): (row: MetricsExplorerRow, field: T) => number | null;
export declare function scaleUpPercentage(unscaled: number): number;
