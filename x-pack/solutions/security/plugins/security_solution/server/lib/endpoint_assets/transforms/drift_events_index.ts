/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Drift Events Index Configuration
 *
 * Index: endpoint-drift-events-{namespace}
 * Purpose: Store individual drift events extracted from osquery differential results
 *
 * This index stores granular drift events that are:
 * 1. Extracted from osquery differential query results (osquery_meta.action field)
 * 2. Enriched with drift metadata (category, severity, item details)
 * 3. Aggregated to endpoint.drift fields in asset documents
 */

export const DRIFT_EVENTS_INDEX_PREFIX = 'endpoint-drift-events';

export const getDriftEventsIndexPattern = (namespace: string): string =>
  `${DRIFT_EVENTS_INDEX_PREFIX}-${namespace}`;

export const getDriftEventsIndexMapping = () => ({
  mappings: {
    dynamic: 'false',
    properties: {
      '@timestamp': { type: 'date' },

      host: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'keyword' },
          os: {
            properties: {
              platform: { type: 'keyword' },
            },
          },
        },
      },

      agent: {
        properties: {
          id: { type: 'keyword' },
        },
      },

      drift: {
        properties: {
          category: { type: 'keyword' },
          action: { type: 'keyword' },
          severity: { type: 'keyword' },
          item: {
            properties: {
              type: { type: 'keyword' },
              name: { type: 'keyword' },
              value: { type: 'keyword' },
              previous_value: { type: 'keyword' },
            },
          },
          query_id: { type: 'keyword' },
          query_name: { type: 'keyword' },
        },
      },

      osquery: {
        type: 'object',
        enabled: true,
      },

      event: {
        properties: {
          kind: { type: 'keyword' },
          category: { type: 'keyword' },
          type: { type: 'keyword' },
          action: { type: 'keyword' },
        },
      },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
    'index.lifecycle.name': 'logs',
    'index.lifecycle.rollover_alias': `${DRIFT_EVENTS_INDEX_PREFIX}`,
  },
});
