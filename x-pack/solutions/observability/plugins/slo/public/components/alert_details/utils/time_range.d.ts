import type { TimeRange } from '../../slo/error_rate_chart/use_lens_definition';
import type { BurnRateAlert } from '../types';
/**
 * Returns a time range for charting purposes, extending the alert's time range
 * backwards by the duration of the alert's action group window.
 * For example, if the alert was triggered for a 72-hour window (low criticality), we need to show charts with data
 * from 72 hours before the alert's start time to provide context.
 */
export declare function getChartTimeRange(alert: BurnRateAlert): TimeRange;
export declare function getAlertTimeRange(alert: BurnRateAlert): TimeRange;
