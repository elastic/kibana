/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

// ISO 8601 timestamps are at most 30 chars; generous upper bound for any well-formed timestamp
const ISO_TIMESTAMP_MAX_LENGTH = 64;
// Kibana namespace follows Elasticsearch index name limits; 1024 is comfortably generous
const NAMESPACE_MAX_LENGTH = 1024;
// Enum-like field: "host" | "user" | "service" | "generic"
const ENTITY_TYPE_MAX_LENGTH = 64;

/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version (ex: 2, 3, 4).
 * This is required to support zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * As you add a new schema version, don't forget to change latestTaskStateSchema variable to reference the latest schema.
 * For example, changing stateSchemaByVersion[1].schema to stateSchemaByVersion[2].schema.
 */
export const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      lastExecutionTimestamp: state.lastExecutionTimestamp || undefined,
      lastSnapshotTookSeconds: state.lastSnapshotTook || 0,
      runs: state.runs || 0,
      namespace: typeof state.namespace === 'string' ? state.namespace : 'default',
      entityType: state.entityType || undefined,
    }),
    schema: schema.object({
      lastExecutionTimestamp: schema.maybe(schema.string({ maxLength: ISO_TIMESTAMP_MAX_LENGTH })),
      lastSnapshotTookSeconds: schema.number(),
      runs: schema.number(),
      namespace: schema.string({ maxLength: NAMESPACE_MAX_LENGTH }),
      entityType: schema.maybe(schema.string({ maxLength: ENTITY_TYPE_MAX_LENGTH })),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const defaultState: LatestTaskStateSchema = {
  lastExecutionTimestamp: undefined,
  lastSnapshotTookSeconds: 0,
  runs: 0,
  namespace: 'default',
  entityType: undefined,
};
