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

export interface ConnectorInfo {
  connectorId: string;
  name: string;
  type: string;
}

export interface InsightFeedback {
  feedback: Feedback;
  insightType: InsightType;
  connector: ConnectorInfo;
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
    insightType: {
      type: 'keyword',
      _meta: {
        description: 'Type of AI insight: log, alert, or error',
      },
    },
    connector: {
      properties: {
        connectorId: {
          type: 'keyword',
          _meta: {
            description: 'The ID of the connector used',
          },
        },
        name: {
          type: 'keyword',
          _meta: {
            description: 'The name of the connector used',
          },
        },
        type: {
          type: 'keyword',
          _meta: {
            description: 'The action type of the connector used',
          },
        },
      },
      _meta: {
        description: 'Information about the connector used for the insight',
      },
    },
  },
};
