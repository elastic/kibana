import type { UMElasticsearchQueryFn } from '../adapters';
import type { MonitorDurationResult } from '../../../../common/types';
export interface GetMonitorChartsParams {
    /** @member monitorId ID value for the selected monitor */
    monitorId: string;
    /** @member dateStart timestamp bounds */
    dateStart: string;
    /** @member dateRangeEnd timestamp bounds */
    dateEnd: string;
}
/**
 * Fetches data used to populate monitor charts
 */
export declare const getMonitorDurationChart: UMElasticsearchQueryFn<GetMonitorChartsParams, MonitorDurationResult>;
