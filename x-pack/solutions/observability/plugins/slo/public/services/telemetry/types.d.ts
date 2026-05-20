import type { RootSchema } from '@kbn/core/public';
import type { IndicatorType } from '@kbn/slo-schema';
export interface SloDetailsFlyoutTabChangedParams {
    tabId: string;
}
export interface SloCreateFlyoutViewedParams {
    sloType?: IndicatorType;
}
export type SloTelemetryEventParams = SloDetailsFlyoutTabChangedParams | SloCreateFlyoutViewedParams | Record<string, never>;
export interface ISloTelemetryClient {
    reportSloDetailsFlyoutViewed(): void;
    reportSloDetailsFlyoutTabChanged(params: SloDetailsFlyoutTabChangedParams): void;
    reportSloCreateFlyoutViewed(params: SloCreateFlyoutViewedParams): void;
}
export declare enum SloTelemetryEventTypes {
    SLO_DETAILS_FLYOUT_VIEWED = "slo_details_flyout_viewed",
    SLO_DETAILS_FLYOUT_TAB_CHANGED = "slo_details_flyout_tab_changed",
    SLO_CREATE_FLYOUT_VIEWED = "slo_create_flyout_viewed"
}
export interface SloTelemetryEvent {
    eventType: SloTelemetryEventTypes;
    schema: RootSchema<SloTelemetryEventParams> | Record<string, never>;
}
