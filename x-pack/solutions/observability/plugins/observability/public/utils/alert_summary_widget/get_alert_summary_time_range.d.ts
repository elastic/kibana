import type { TimeRange } from '@kbn/es-query';
import type { AlertSummaryTimeRange } from '@kbn/triggers-actions-ui-plugin/public';
export declare const getDefaultAlertSummaryTimeRange: () => AlertSummaryTimeRange;
export declare const getAlertSummaryTimeRange: (timeRange: TimeRange, fixedInterval: string, dateFormat: string) => AlertSummaryTimeRange;
