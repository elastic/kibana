import type { UMElasticsearchQueryFn } from '../adapters';
import type { MonitorLocations } from '../../../../common/runtime_types';
/**
 * Fetch data for the monitor page title.
 */
export interface GetMonitorLocationsParams {
    /**
     * @member monitorId the ID to query
     */
    monitorId: string;
    dateStart: string;
    dateEnd: string;
}
export declare const getMonitorLocations: UMElasticsearchQueryFn<GetMonitorLocationsParams, MonitorLocations>;
