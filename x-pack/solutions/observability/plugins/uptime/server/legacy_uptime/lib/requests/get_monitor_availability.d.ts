import type { UMElasticsearchQueryFn } from '../adapters';
import type { GetMonitorAvailabilityParams, Ping } from '../../../../common/runtime_types';
export interface AvailabilityKey {
    monitorId: string;
    location: string;
}
export interface GetMonitorAvailabilityResult {
    monitorId: string;
    up: number;
    down: number;
    location: string;
    availabilityRatio: number | null;
    monitorInfo: Ping;
}
export declare const formatBuckets: (buckets: any[]) => Promise<GetMonitorAvailabilityResult[]>;
export declare const getMonitorAvailability: UMElasticsearchQueryFn<GetMonitorAvailabilityParams, GetMonitorAvailabilityResult[]>;
