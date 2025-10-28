/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

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
      lastExecutionTimestamp: schema.maybe(schema.string()),
      lastSnapshotTookSeconds: schema.number(),
      runs: schema.number(),
      namespace: schema.string(),
      entityType: schema.maybe(schema.string()),
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
