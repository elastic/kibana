import type { EventTypeOpts } from '@kbn/core/public';
import type { ConnectorInfo } from '../../../common';
import type { Feedback } from '../../components/ai_insight/feedback_buttons';
export type InsightType = 'log' | 'alert' | 'error';
export type { ConnectorInfo };
export interface InsightResponseGeneratedEvent {
    insightType: InsightType;
    connector: ConnectorInfo;
}
export interface InsightFeedbackEvent {
    insightType: InsightType;
    feedback: Feedback;
    connector: ConnectorInfo;
}
export interface InsightFailedEvent {
    insightType: InsightType;
    errorMessage: string;
    connector?: ConnectorInfo;
}
export declare const insightResponseGeneratedEventSchema: EventTypeOpts<InsightResponseGeneratedEvent>;
export declare const insightFailedEventSchema: EventTypeOpts<InsightFailedEvent>;
export declare const insightFeedbackEventSchema: EventTypeOpts<InsightFeedbackEvent>;
