import type { UMElasticsearchQueryFn } from '../adapters/framework';
import type { SyntheticsJourneyApiResponse } from '../../../../common/runtime_types/ping/synthetics';
export interface GetJourneyDetails {
    checkGroup: string;
}
export declare const getJourneyDetails: UMElasticsearchQueryFn<GetJourneyDetails, SyntheticsJourneyApiResponse['details']>;
