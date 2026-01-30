/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/public';
import type { Feedback } from '../../components/ai_insight/feedback_buttons';
import { ObservabilityAgentBuilderTelemetryEventType } from '../telemetry_event_type';

export type InsightType = 'log' | 'alert' | 'error';

export interface InsightFeedback {
  feedback: Feedback;
  insight_type: InsightType;
}

export const insightFeedbackEventSchema: EventTypeOpts<InsightFeedback> = {
  eventType: ObservabilityAgentBuilderTelemetryEventType.AiInsightFeedback,
  schema: {
    feedback: {
      type: 'keyword',
      _meta: {
        description: 'Whether the user found the insight helpful: positive or negative',
      },
    },
    insight_type: {
      type: 'keyword',
      _meta: {
        description: 'Type of AI insight: log, alert, or error',
      },
    },
  },
};
