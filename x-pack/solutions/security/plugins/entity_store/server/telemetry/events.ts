/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { EventTypeOpts } from '@kbn/core/server';

// ------------------------------------
//  Event types
// ------------------------------------

interface InitializationEvent {
  entityType: string;
  namespace: string;
}

interface InitializationFailureEvent {
  error: string;
  namespace: string;
}

interface DeletionEvent {
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
  },
} as const satisfies EventTypeOpts<InitializationEvent>;

export const ENTITY_STORE_INITIALIZATION_FAILURE_EVENT = {
  eventType: 'entity_store_initialization_failure',
  schema: {
    error: {
      type: 'keyword',
      _meta: {
        description: 'Error message for a resource initialization failure',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entities are stored (e.g. "default")',
      },
    },
  },
} as const satisfies EventTypeOpts<InitializationFailureEvent>;

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
} as const satisfies EventTypeOpts<DeletionEvent>;

// ------------------------------------
// Registration
// ------------------------------------

const events = [
  ENTITY_STORE_INITIALIZATION_EVENT,
  ENTITY_STORE_INITIALIZATION_FAILURE_EVENT,
  ENTITY_STORE_DELETION_EVENT,
] as const;

export const registerTelemetry = (analytics: AnalyticsServiceSetup) => {
  events.forEach((eventConfig: EventTypeOpts<{}>) => {
    analytics.registerEventType(eventConfig);
  });
};

// ------------------------------------
// Type-safe reporting
// ------------------------------------

interface TelemetryEventMap {
  [ENTITY_STORE_INITIALIZATION_EVENT.eventType]: InitializationEvent;
  [ENTITY_STORE_DELETION_EVENT.eventType]: DeletionEvent;
  [ENTITY_STORE_INITIALIZATION_FAILURE_EVENT.eventType]: InitializationFailureEvent;
}

export type TelemetryReporter = ReturnType<typeof createReportEvent>;

export const createReportEvent = (analytics: AnalyticsServiceSetup) => ({
  reportEvent: <T extends (typeof events)[number]>(
    event: T,
    eventData: TelemetryEventMap[T['eventType']]
  ) => analytics.reportEvent(event.eventType, eventData),
});
