/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import {
  insightFailedEventSchema,
  insightFeedbackEventSchema,
  insightResponseGeneratedEventSchema,
} from './schemas/ai_insight_events';
import type {
  InsightFailedEvent,
  InsightFeedbackEvent,
  InsightResponseGeneratedEvent,
} from './schemas/ai_insight_events';
import type { ObservabilityAgentBuilderTelemetryEventType } from './telemetry_event_type';

export const registerTelemetryEventTypes = (analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType(insightResponseGeneratedEventSchema);
  analytics.registerEventType(insightFailedEventSchema);
  analytics.registerEventType(insightFeedbackEventSchema);
};

export type TelemetryEvent =
  | {
      type: ObservabilityAgentBuilderTelemetryEventType.AiInsightResponseGenerated;
      payload: InsightResponseGeneratedEvent;
    }
  | {
      type: ObservabilityAgentBuilderTelemetryEventType.AiInsightFailed;
      payload: InsightFailedEvent;
    }
  | {
      type: ObservabilityAgentBuilderTelemetryEventType.AiInsightFeedback;
      payload: InsightFeedbackEvent;
    };

export function reportTelemetryEvent(
  analytics: AnalyticsServiceStart,
  event: TelemetryEvent
): void {
  try {
    analytics.reportEvent(event.type, event.payload);
  } catch {
    // do nothing
  }
}

export { ObservabilityAgentBuilderTelemetryEventType } from './telemetry_event_type';
export type {
  ConnectorInfo,
  InsightFailedEvent,
  InsightFeedbackEvent,
  InsightResponseGeneratedEvent,
  InsightType,
} from './schemas/ai_insight_events';
