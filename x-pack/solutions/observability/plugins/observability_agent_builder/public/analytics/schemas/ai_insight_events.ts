/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/public';
import type { ConnectorInfo } from '../../../common';
import type { Feedback } from '../../components/ai_insight/feedback_buttons';
import { ObservabilityAgentBuilderTelemetryEventType } from '../telemetry_event_type';

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

const insightTypeSchema = {
  type: 'keyword' as const,
  _meta: {
    description: 'Type of AI insight: log, alert, or error',
  },
};

const connectorSchema = {
  properties: {
    connectorId: {
      type: 'keyword' as const,
      _meta: {
        description: 'The ID of the connector used',
      },
    },
    name: {
      type: 'keyword' as const,
      _meta: {
        description: 'The name of the connector used',
      },
    },
    type: {
      type: 'keyword' as const,
      _meta: {
        description: 'The action type of the connector used',
      },
    },
    modelFamily: {
      type: 'keyword' as const,
      _meta: {
        description: 'The model family of the connector used',
      },
    },
    modelProvider: {
      type: 'keyword' as const,
      _meta: {
        description: 'The model provider of the connector used',
      },
    },
    modelId: {
      type: 'keyword' as const,
      _meta: {
        description: 'The specific model ID of the connector used',
      },
    },
  },
  _meta: {
    description: 'Information about the connector used for the insight',
  },
};

export const insightResponseGeneratedEventSchema: EventTypeOpts<InsightResponseGeneratedEvent> = {
  eventType: ObservabilityAgentBuilderTelemetryEventType.AiInsightResponseGenerated,
  schema: {
    insightType: insightTypeSchema,
    connector: connectorSchema,
  },
};

export const insightFailedEventSchema: EventTypeOpts<InsightFailedEvent> = {
  eventType: ObservabilityAgentBuilderTelemetryEventType.AiInsightFailed,
  schema: {
    insightType: insightTypeSchema,
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'The error message from the failed insight generation',
      },
    },
    connector: {
      ...connectorSchema,
      _meta: {
        ...connectorSchema._meta,
        optional: true,
      },
    },
  },
};

export const insightFeedbackEventSchema: EventTypeOpts<InsightFeedbackEvent> = {
  eventType: ObservabilityAgentBuilderTelemetryEventType.AiInsightFeedback,
  schema: {
    insightType: insightTypeSchema,
    feedback: {
      type: 'keyword',
      _meta: {
        description: 'Whether the user found the insight helpful: positive or negative',
      },
    },
    connector: connectorSchema,
  },
};
