import type { estypes } from '@elastic/elasticsearch';
import type { UMElasticsearchQueryFn } from '../adapters/framework';
import type { Ping } from '../../../../common/runtime_types/ping';
export interface GetStepScreenshotParams {
    monitorId: string;
    timestamp: string;
    location?: string;
}
export declare const getLastSuccessfulStepParams: ({ monitorId, timestamp, location, }: GetStepScreenshotParams) => estypes.SearchRequest;
export declare const getLastSuccessfulCheck: UMElasticsearchQueryFn<GetStepScreenshotParams, Ping | null>;
