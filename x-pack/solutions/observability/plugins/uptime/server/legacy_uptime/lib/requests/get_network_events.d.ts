import type { UMElasticsearchQueryFn } from '../adapters/framework';
import type { NetworkEvent } from '../../../../common/runtime_types';
export interface GetNetworkEventsParams {
    checkGroup: string;
    stepIndex: string;
}
export declare const secondsToMillis: (seconds: number) => number;
export declare const getNetworkEvents: UMElasticsearchQueryFn<GetNetworkEventsParams, {
    events: NetworkEvent[];
    total: number;
    isWaterfallSupported: boolean;
    hasNavigationRequest: boolean;
}>;
