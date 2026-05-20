import type { MetricExpressionCustomMetric } from '../../common/alerting/metrics';
import type { MetricsExplorerCustomMetric } from '../../common/http_api';
export declare const createCustomMetricsAggregations: (id: string, customMetrics: Array<MetricsExplorerCustomMetric | MetricExpressionCustomMetric>, equation?: string) => {};
