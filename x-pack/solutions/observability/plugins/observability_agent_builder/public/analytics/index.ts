/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { insightFeedbackEventSchema } from './schemas/insight_feedback';

const schemas = [insightFeedbackEventSchema];

export const registerTelemetryEventTypes = (analytics: AnalyticsServiceSetup) => {
  schemas.forEach((schema) => analytics.registerEventType(schema));
};

export { ObservabilityAgentBuilderTelemetryEventType } from './telemetry_event_type';
export type { InsightType, InsightFeedback, ConnectorInfo } from './schemas/insight_feedback';