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
    // A task that was created < 8.10 will go through this "up" migration
    // to ensure it matches the v1 schema.
    up: (state: Record<string, unknown>) => ({
      lastSuccessfulReport: state.lastSuccessfulReport || null,
    }),
    schema: schema.object({
      lastSuccessfulReport: schema.nullable(schema.string()),
    }),
  },
  2: {
    // A task that was created < 9.0 will go through this "up" migration
    // to ensure it matches the v2 schema.
    up: (state: Record<string, unknown>) => ({
      lastSuccessfulReport: state.lastSuccessfulReport || null,
      backfillRecords: state.backfillRecords || [],
    }),
    schema: schema.object({
      lastSuccessfulReport: schema.nullable(schema.string()),
      backfillRecords: schema.arrayOf(
        schema.object({
          id: schema.string(),
          usage_timestamp: schema.string(),
          creation_timestamp: schema.string(),
          usage: schema.object({
            type: schema.string(),
            sub_type: schema.maybe(schema.string()),
            quantity: schema.number(),
            period_seconds: schema.maybe(schema.number()),
            cause: schema.maybe(schema.string()),
            metadata: schema.maybe(schema.recordOf(schema.string(), schema.string())),
          }),
          source: schema.object({
            id: schema.string(),
            instance_group_id: schema.string(),
            metadata: schema.maybe(
              schema.object({
                tier: schema.maybe(schema.string()),
              })
            ),
          }),
        })
      ),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[2].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const emptyState: LatestTaskStateSchema = {
  lastSuccessfulReport: null,
  backfillRecords: [],
};
