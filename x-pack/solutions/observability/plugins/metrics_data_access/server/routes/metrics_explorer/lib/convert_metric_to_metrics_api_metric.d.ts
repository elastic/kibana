import type { MetricsAPIMetric, MetricsExplorerMetric } from '../../../../common/http_api';
export declare const convertMetricToMetricsAPIMetric: (metric: MetricsExplorerMetric, index: number) => MetricsAPIMetric | undefined;
