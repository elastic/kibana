/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { EventTypeOpts } from '@kbn/core/server';

// ------------------------------------
// Payload interfaces
// ------------------------------------

interface InitializationEventPayload {
  entityType: string;
  namespace: string;
  error?: string;
}

interface DeletionEventPayload {
  entityType: string;
  namespace: string;
}

// ------------------------------------
// Event definitions
// ------------------------------------

export const ENTITY_STORE_INITIALIZATION_EVENT = {
  eventType: 'entity_store_initialization',
  schema: {
    entityType: {
      type: 'keyword',
      _meta: {
        description: 'Type of entities stored (e.g. "host")',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entities are stored (e.g. "default")',
      },
    },
    error: {
      type: 'keyword',
      _meta: {
        optional: true,
        description: 'Error message for initialization failure',
      },
    },
  },
} as const satisfies EventTypeOpts<InitializationEventPayload>;

export const ENTITY_STORE_DELETION_EVENT = {
  eventType: 'entity_store_deletion',
  schema: {
    entityType: {
      type: 'keyword',
      _meta: {
        description: 'Type of entities stored (e.g. "host")',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entities are stored (e.g. "default")',
      },
    },
  },
} as const satisfies EventTypeOpts<DeletionEventPayload>;

// ------------------------------------
// Registration
// ------------------------------------

const ENTITY_STORE_TELEMETRY_EVENTS = [
  ENTITY_STORE_INITIALIZATION_EVENT,
  ENTITY_STORE_DELETION_EVENT,
] as const;

export const registerTelemetry = (analytics: AnalyticsServiceSetup) => {
  ENTITY_STORE_TELEMETRY_EVENTS.forEach((eventConfig) => {
    analytics.registerEventType(eventConfig);
  });
};

// ------------------------------------
// Type-safe reporting
// ------------------------------------

interface TelemetryEventMap {
  [ENTITY_STORE_INITIALIZATION_EVENT.eventType]: InitializationEventPayload;
  [ENTITY_STORE_DELETION_EVENT.eventType]: DeletionEventPayload;
}

export type TelemetryReporter = ReturnType<typeof reportEvent>;

export const reportEvent =
  (analytics: AnalyticsServiceSetup) =>
  <T extends (typeof ENTITY_STORE_TELEMETRY_EVENTS)[number]>(
    event: T,
    eventData: TelemetryEventMap[T['eventType']]
  ) =>
    analytics.reportEvent(event.eventType, eventData);
