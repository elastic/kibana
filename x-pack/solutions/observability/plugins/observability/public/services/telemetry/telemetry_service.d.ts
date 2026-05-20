import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ITelemetryClient } from './types';
export declare class TelemetryService {
    private initialized;
    constructor();
    setup(analytics: AnalyticsServiceSetup): void;
    start(analytics: AnalyticsServiceStart): ITelemetryClient;
}
