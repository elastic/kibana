/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, EventTypeOpts } from '@kbn/core/server';
import type { EntityMaintainerTelemetryEventType } from '../tasks/entity_maintainers/types';

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

interface StoreUsageEventPayload {
  storeSize: number;
  entityType: string;
  namespace: string;
}

interface EntityStoreHealthComponentPayload {
  id: string;
  resource: string;
  installed: boolean;
  status?: string;
  lastError?: string;
}

interface EntityStoreHealthEnginePayload {
  type: string;
  status: string;
  components: EntityStoreHealthComponentPayload[];
}

interface EntityStoreHealthReportPayload {
  namespace: string;
  engines: EntityStoreHealthEnginePayload[];
}

/**
 * Per-run summary of the Knowledge Indicators (KI) extraction loop emitted
 * from the generic-type extract task. Used to surface stream-derived
 * entity extraction health across a deployment without requiring an
 * operator to inspect task state SOs.
 */
interface KnowledgeIndicatorsLoopEventPayload {
  namespace: string;
  groupsTotal: number;
  groupsProcessed: number;
  groupsSucceeded: number;
  groupsFailed: number;
  groupsSkippedNoIndexPatterns: number;
  groupsSkippedMissingSubtype: number;
  groupsTruncated: number;
}

interface EntityMaintainerEvent {
  id: string;
  namespace?: string;
  type: EntityMaintainerTelemetryEventType;
  errorMessage?: string;
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

export const ENTITY_STORE_USAGE_EVENT = {
  eventType: 'entity_store_usage',
  schema: {
    storeSize: {
      type: 'long',
      _meta: {
        description: 'Number of entities stored in the entity store by type and namespace',
      },
    },
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
} as const satisfies EventTypeOpts<StoreUsageEventPayload>;

export const ENTITY_MAINTAINER_EVENT = {
  eventType: 'entity_store_entity_maintainer',
  schema: {
    id: {
      type: 'keyword',
      _meta: {
        description: 'Entity maintainer identifier',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the maintainer runs (e.g. "default")',
        optional: true,
      },
    },
    type: {
      type: 'keyword',
      _meta: {
        description:
          'Entity maintainer telemetry event type (register, abort, setup, run, error, stop, start, delete)',
      },
    },
    errorMessage: {
      type: 'keyword',
      _meta: {
        description: 'Optional error message for error events',
        optional: true,
      },
    },
  },
} as const satisfies EventTypeOpts<EntityMaintainerEvent>;

export const ENTITY_STORE_HEALTH_REPORT_EVENT = {
  eventType: 'entity_store_health_report',
  schema: {
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Namespace where the entity store health is reported (e.g. "default")',
      },
    },
    engines: {
      type: 'array',
      items: {
        properties: {
          type: {
            type: 'keyword',
            _meta: { description: 'Engine type (e.g "host" or "generic")' },
          },
          status: {
            type: 'keyword',
            _meta: {
              description: 'Overall engine status',
            },
          },
          components: {
            type: 'array',
            items: {
              properties: {
                id: {
                  type: 'keyword',
                  _meta: { description: 'Component identifier' },
                },
                resource: {
                  type: 'keyword',
                  _meta: {
                    description: 'Type of the component (e.g. "index" or "task")',
                  },
                },
                installed: {
                  type: 'boolean',
                  _meta: { description: 'Whether the component is installed' },
                },
                status: {
                  type: 'keyword',
                  _meta: {
                    optional: true,
                    description: 'Task component status when the component is a task',
                  },
                },
                lastError: {
                  type: 'keyword',
                  _meta: {
                    optional: true,
                    description: 'Task component last error message, when present',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies EventTypeOpts<EntityStoreHealthReportPayload>;

export const ENTITY_STORE_KI_LOOP_EVENT = {
  eventType: 'entity_store_ki_loop',
  schema: {
    namespace: {
      type: 'keyword',
      _meta: { description: 'Namespace where the KI extraction loop ran (e.g. "default")' },
    },
    groupsTotal: {
      type: 'long',
      _meta: {
        description:
          'Total number of (stream, subtype) groups discovered in entity Knowledge Indicators above the configured min confidence',
      },
    },
    groupsProcessed: {
      type: 'long',
      _meta: {
        description:
          'Number of groups that completed an extraction attempt (succeeded or failed); excludes skipped groups',
      },
    },
    groupsSucceeded: {
      type: 'long',
      _meta: { description: 'Number of groups that successfully extracted entities' },
    },
    groupsFailed: {
      type: 'long',
      _meta: {
        description:
          'Number of groups whose extraction step threw and was isolated; their prior cursor was preserved',
      },
    },
    groupsSkippedNoIndexPatterns: {
      type: 'long',
      _meta: {
        description:
          'Groups skipped because the source stream resolved to zero index patterns (likely deleted)',
      },
    },
    groupsSkippedMissingSubtype: {
      type: 'long',
      _meta: { description: 'Features dropped because they lacked a subtype' },
    },
    groupsTruncated: {
      type: 'long',
      _meta: {
        description:
          'Groups that exceeded the aggregationGroupCap and were not processed this run (sorted-deterministic truncation)',
      },
    },
  },
} as const satisfies EventTypeOpts<KnowledgeIndicatorsLoopEventPayload>;

// ------------------------------------
// Registration
// ------------------------------------

const events = [
  ENTITY_STORE_INITIALIZATION_EVENT,
  ENTITY_STORE_INITIALIZATION_FAILURE_EVENT,
  ENTITY_STORE_DELETION_EVENT,
  ENTITY_STORE_USAGE_EVENT,
  ENTITY_STORE_HEALTH_REPORT_EVENT,
  ENTITY_MAINTAINER_EVENT,
  ENTITY_STORE_KI_LOOP_EVENT,
] as const;

export const registerTelemetry = (analytics: AnalyticsServiceSetup) =>
  events.forEach((eventConfig: EventTypeOpts<{}>) => analytics.registerEventType(eventConfig));

// ------------------------------------
// Type-safe reporting
// ------------------------------------

interface TelemetryEventMap {
  [ENTITY_STORE_INITIALIZATION_EVENT.eventType]: InitializationEvent;
  [ENTITY_STORE_DELETION_EVENT.eventType]: DeletionEvent;
  [ENTITY_STORE_INITIALIZATION_FAILURE_EVENT.eventType]: InitializationFailureEvent;
  [ENTITY_STORE_USAGE_EVENT.eventType]: StoreUsageEventPayload;
  [ENTITY_STORE_HEALTH_REPORT_EVENT.eventType]: EntityStoreHealthReportPayload;
  [ENTITY_MAINTAINER_EVENT.eventType]: EntityMaintainerEvent;
  [ENTITY_STORE_KI_LOOP_EVENT.eventType]: KnowledgeIndicatorsLoopEventPayload;
}

export type TelemetryReporter = ReturnType<typeof createReportEvent>;

export const createReportEvent = (analytics: AnalyticsServiceSetup) => ({
  reportEvent: <T extends (typeof events)[number]>(
    event: T,
    eventData: TelemetryEventMap[T['eventType']]
  ) => analytics.reportEvent(event.eventType, eventData),
});
