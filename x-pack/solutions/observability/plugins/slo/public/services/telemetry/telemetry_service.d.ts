import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ISloTelemetryClient } from './types';
export declare class SloTelemetryService {
    private initialized;
    setup(analytics: AnalyticsServiceSetup): void;
    start(analytics: AnalyticsServiceStart): ISloTelemetryClient;
}
