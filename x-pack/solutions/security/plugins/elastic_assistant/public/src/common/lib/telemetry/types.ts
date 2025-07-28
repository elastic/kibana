/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';

import type { AssistantEventTypes, AssistantTelemetryEventsMap } from './events/ai_assistant/types';

export * from './events/ai_assistant/types';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

// Combine all event type data
export type TelemetryEventTypeData<T extends TelemetryEventTypes> = T extends AssistantEventTypes
  ? AssistantTelemetryEventsMap[T]
  : never;

export type TelemetryEventTypes = AssistantEventTypes;
