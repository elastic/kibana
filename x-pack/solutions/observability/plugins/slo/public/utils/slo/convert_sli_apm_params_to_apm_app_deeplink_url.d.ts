import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export declare function convertSliApmParamsToApmAppDeeplinkUrl(slo: SLOWithSummaryResponse, timeRangeOverride?: {
    from: string;
    to: string;
}): string | undefined;
