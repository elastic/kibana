import type { UMElasticsearchQueryFn } from '../adapters';
import type { Ping } from '../../../../common/runtime_types';
export interface GetLatestMonitorParams {
    /** @member dateRangeStart timestamp bounds */
    dateStart: string;
    /** @member dateRangeEnd timestamp bounds */
    dateEnd: string;
    /** @member monitorId optional limit to monitorId */
    monitorId?: string | null;
    observerLocation?: string;
}
export declare const getLatestMonitor: UMElasticsearchQueryFn<GetLatestMonitorParams, Ping>;
