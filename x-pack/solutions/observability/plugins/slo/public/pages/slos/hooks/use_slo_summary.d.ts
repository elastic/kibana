import type { IBasePath } from '@kbn/core-http-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
export declare const useSloFormattedSummary: (slo: SLOWithSummaryResponse) => {
    sloDetailsUrl: string;
    sliValue: string;
    sloTarget: string;
    errorBudgetRemaining: string;
};
export declare const getSloFormattedSummary: (slo: SLOWithSummaryResponse, uiSettings: IUiSettingsClient, basePath: IBasePath) => {
    sloDetailsUrl: string;
    sliValue: string;
    sloTarget: string;
    errorBudgetRemaining: string;
};
export declare const useSloFormattedSLIValue: (sliValue?: number) => string | null;
