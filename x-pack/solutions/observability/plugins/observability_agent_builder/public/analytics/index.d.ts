import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { InsightFailedEvent, InsightFeedbackEvent, InsightResponseGeneratedEvent } from './schemas/ai_insight_events';
import type { ObservabilityAgentBuilderTelemetryEventType } from './telemetry_event_type';
export declare const registerTelemetryEventTypes: (analytics: AnalyticsServiceSetup) => void;
export type TelemetryEvent = {
    type: ObservabilityAgentBuilderTelemetryEventType.AiInsightResponseGenerated;
    payload: InsightResponseGeneratedEvent;
} | {
    type: ObservabilityAgentBuilderTelemetryEventType.AiInsightFailed;
    payload: InsightFailedEvent;
} | {
    type: ObservabilityAgentBuilderTelemetryEventType.AiInsightFeedback;
    payload: InsightFeedbackEvent;
};
export declare function reportTelemetryEvent(analytics: AnalyticsServiceStart, event: TelemetryEvent): void;
export { ObservabilityAgentBuilderTelemetryEventType } from './telemetry_event_type';
export type { ConnectorInfo, InsightFailedEvent, InsightFeedbackEvent, InsightResponseGeneratedEvent, InsightType, } from './schemas/ai_insight_events';
