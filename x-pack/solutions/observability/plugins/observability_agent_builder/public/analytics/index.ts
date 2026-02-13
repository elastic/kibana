/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import {
  insightFailedEventSchema,
  insightFeedbackEventSchema,
  insightOpenedEventSchema,
} from './schemas/insight_feedback';

export const registerTelemetryEventTypes = (analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType(insightOpenedEventSchema);
  analytics.registerEventType(insightFailedEventSchema);
  analytics.registerEventType(insightFeedbackEventSchema);
};

export { ObservabilityAgentBuilderTelemetryEventType } from './telemetry_event_type';
export type {
  ConnectorInfo,
  InsightFailedEvent,
  InsightFeedbackEvent,
  InsightOpenedEvent,
  InsightType,
} from './schemas/insight_feedback';
