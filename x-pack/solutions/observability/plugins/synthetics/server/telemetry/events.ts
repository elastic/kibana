/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, EventTypeOpts, RootSchema } from '@kbn/core/server';
import {
  MONITOR_CURRENT_EVENT_TYPE,
  MONITOR_ERROR_EVENT_TYPE,
  MONITOR_UPDATE_EVENT_TYPE,
} from './constants';
import { registerShardingEventTypes } from './sharding_events';
import type { MonitorErrorEvent, MonitorUpdateEvent } from './types';

const monitorUpdateSchema: RootSchema<MonitorUpdateEvent> = {
  updatedAt: {
    type: 'date',
    _meta: { description: 'When the monitor was last updated, or deleted', optional: true },
  },
  lastUpdatedAt: {
    type: 'date',
    _meta: { description: 'When the monitor was updated before this event', optional: true },
  },
  durationSinceLastUpdated: {
    type: 'long',
    _meta: { description: 'Milliseconds since the previous update', optional: true },
  },
  deletedAt: {
    type: 'date',
    _meta: {
      description: 'When the monitor was deleted; unset for create and update',
      optional: true,
    },
  },
  type: {
    type: 'keyword',
    _meta: { description: 'Monitor type: http, tcp, icmp or browser' },
  },
  stackVersion: {
    type: 'keyword',
    _meta: { description: 'Kibana version' },
  },
  monitorNameLength: {
    type: 'long',
    _meta: { description: 'Length of the monitor name; the name itself is not collected' },
  },
  monitorInterval: {
    type: 'long',
    _meta: { description: 'Monitor schedule in milliseconds' },
  },
  locations: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Service-managed location id, or "other" for private locations' },
    },
    _meta: { description: 'Locations the monitor runs from' },
  },
  locationsCount: {
    type: 'long',
    _meta: { description: 'Number of locations the monitor runs from' },
  },
  scriptType: {
    type: 'keyword',
    _meta: {
      description: 'Browser monitor script source: inline, recorder, zip or project',
      optional: true,
    },
  },
  revision: {
    type: 'long',
    _meta: { description: 'Monitor revision', optional: true },
  },
  errors: {
    type: 'array',
    items: {
      properties: {
        locationId: {
          type: 'keyword',
          _meta: { description: 'Location the sync error occurred for' },
        },
        error: {
          properties: {
            status: {
              type: 'long',
              _meta: {
                description: 'HTTP status returned by the synthetics service',
                optional: true,
              },
            },
            reason: {
              type: 'text',
              _meta: {
                description: 'Failure reason returned by the synthetics service',
                optional: true,
              },
            },
          },
        },
      },
    },
    _meta: { description: 'Per-location errors from syncing the monitor', optional: true },
  },
  configId: {
    type: 'keyword',
    _meta: { description: 'SHA-256 hash of the monitor saved object id' },
  },
  issuedTo: {
    type: 'keyword',
    _meta: { description: 'License holder of the cluster', optional: true },
  },
};

const monitorErrorSchema: RootSchema<MonitorErrorEvent> = {
  type: {
    type: 'keyword',
    _meta: { description: 'Error category' },
  },
  message: {
    type: 'text',
    _meta: { description: 'Error message' },
  },
  reason: {
    type: 'text',
    _meta: { description: 'Error reason', optional: true },
  },
  code: {
    type: 'keyword',
    _meta: { description: 'Error code', optional: true },
  },
  status: {
    type: 'long',
    _meta: { description: 'HTTP status of the failed request', optional: true },
  },
  url: {
    type: 'keyword',
    _meta: { description: 'URL of the failed request', optional: true },
  },
  stackVersion: {
    type: 'keyword',
    _meta: { description: 'Kibana version' },
  },
  issuedTo: {
    type: 'keyword',
    _meta: { description: 'License holder of the cluster', optional: true },
  },
};

export const monitorUpdateEventType: EventTypeOpts<MonitorUpdateEvent> = {
  eventType: MONITOR_UPDATE_EVENT_TYPE,
  schema: monitorUpdateSchema,
};

export const monitorCurrentEventType: EventTypeOpts<MonitorUpdateEvent> = {
  eventType: MONITOR_CURRENT_EVENT_TYPE,
  schema: monitorUpdateSchema,
};

export const monitorErrorEventType: EventTypeOpts<MonitorErrorEvent> = {
  eventType: MONITOR_ERROR_EVENT_TYPE,
  schema: monitorErrorSchema,
};

export const registerSyntheticsEventTypes = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType(monitorUpdateEventType);
  analytics.registerEventType(monitorCurrentEventType);
  analytics.registerEventType(monitorErrorEventType);
  registerShardingEventTypes(analytics);
};
