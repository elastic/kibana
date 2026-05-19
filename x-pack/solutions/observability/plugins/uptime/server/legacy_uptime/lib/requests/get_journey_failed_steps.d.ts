import type { UMElasticsearchQueryFn } from '../adapters/framework';
import type { JourneyStep } from '../../../../common/runtime_types/ping/synthetics';
export interface GetJourneyStepsParams {
    checkGroups: string[];
}
export declare const getJourneyFailedSteps: UMElasticsearchQueryFn<GetJourneyStepsParams, JourneyStep[]>;
