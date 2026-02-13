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
  modelFamily: string;
  modelProvider: string;
  modelId: string;
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
        modelFamily: {
          type: 'keyword',
          _meta: {
            description: 'The model family of the connector used',
          },
        },
        modelProvider: {
          type: 'keyword',
          _meta: {
            description: 'The model provider of the connector used',
          },
        },
        modelId: {
          type: 'keyword',
          _meta: {
            description: 'The specific model ID of the connector used',
          },
        },
      },
      _meta: {
        description: 'Information about the connector used for the insight',
      },
    },
  },
};
