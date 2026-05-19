import type { UMElasticsearchQueryFn } from '../adapters/framework';
import type { JourneyStep } from '../../../../common/runtime_types/ping/synthetics';
export interface GetJourneyStepsParams {
    checkGroup: string;
    syntheticEventTypes?: string | string[];
}
export declare const formatSyntheticEvents: (eventTypes?: string | string[]) => string[];
export declare const getJourneySteps: UMElasticsearchQueryFn<GetJourneyStepsParams, JourneyStep[]>;
