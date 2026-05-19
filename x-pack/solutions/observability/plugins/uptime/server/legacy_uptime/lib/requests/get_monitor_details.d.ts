import type { UMElasticsearchQueryFn } from '../adapters';
import type { MonitorDetails } from '../../../../common/runtime_types';
import type { UptimeEsClient } from '../lib';
export interface GetMonitorDetailsParams {
    monitorId: string;
    dateStart: string;
    dateEnd: string;
    rulesClient: any;
}
export declare const getMonitorAlerts: ({ uptimeEsClient, rulesClient, monitorId, }: {
    uptimeEsClient: UptimeEsClient;
    rulesClient: any;
    monitorId: string;
}) => Promise<any[]>;
export declare const getMonitorDetails: UMElasticsearchQueryFn<GetMonitorDetailsParams, MonitorDetails>;
