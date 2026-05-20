import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ISloTelemetryClient, SloDetailsFlyoutTabChangedParams, SloCreateFlyoutViewedParams } from './types';
export declare class SloTelemetryClient implements ISloTelemetryClient {
    private readonly analytics;
    constructor(analytics: AnalyticsServiceStart);
    reportSloDetailsFlyoutViewed: () => void;
    reportSloDetailsFlyoutTabChanged: (params: SloDetailsFlyoutTabChangedParams) => void;
    reportSloCreateFlyoutViewed: (params: SloCreateFlyoutViewedParams) => void;
}
