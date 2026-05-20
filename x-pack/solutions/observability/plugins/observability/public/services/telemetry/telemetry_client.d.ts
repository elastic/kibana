import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ITelemetryClient } from './types';
export declare class TelemetryClient implements ITelemetryClient {
    private readonly analytics;
    constructor(analytics: AnalyticsServiceStart);
    reportRelatedAlertsLoaded(count: number): void;
    reportAlertDetailsPageView(ruleType: string): void;
    reportAlertAddedToCase(newCaseCreated: boolean, from: string, ruleTypeId: string): void;
    reportLinkedDashboardViewed(ruleTypeId: string): void;
    reportSuggestedDashboardAdded(ruleTypeId: string): void;
}
