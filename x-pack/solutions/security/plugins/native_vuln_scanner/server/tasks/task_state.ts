/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const MAX_STATE_ENTRIES = 500;
export const MAX_STATE_KEY_LENGTH = 128;
export const MAX_STATE_MESSAGE_LENGTH = 2048;

const validateEntryCount = (value: Record<string, unknown>): string | undefined =>
  Object.keys(value).length > MAX_STATE_ENTRIES
    ? `expected at most ${MAX_STATE_ENTRIES} entries`
    : undefined;

const releaseStatus = schema.oneOf([
  schema.literal('matched'),
  schema.literal('unavailable'),
  schema.literal('failed'),
]);

const lastRunSchema = schema.object({
  runId: schema.string({ maxLength: MAX_STATE_KEY_LENGTH }),
  finishedAt: schema.string({ maxLength: MAX_STATE_KEY_LENGTH }),
  status: schema.oneOf([
    schema.literal('success'),
    schema.literal('failed'),
    schema.literal('aborted'),
    schema.literal('no_pack'),
  ]),
  hosts: schema.number(),
  findings: schema.number(),
  releases: schema.recordOf(schema.string({ maxLength: MAX_STATE_KEY_LENGTH }), releaseStatus, {
    validate: validateEntryCount,
  }),
  failures: schema.maybe(
    schema.recordOf(
      schema.string({ maxLength: MAX_STATE_KEY_LENGTH }),
      schema.string({ maxLength: MAX_STATE_MESSAGE_LENGTH }),
      { validate: validateEntryCount }
    )
  ),
  error: schema.maybe(schema.string({ maxLength: MAX_STATE_MESSAGE_LENGTH })),
});

/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version
 * (ex: 2, 3, 4) and point `latestTaskStateSchema` at it. This keeps zero-downtime upgrades and
 * rollbacks working. See https://github.com/elastic/kibana/issues/155764.
 */
export const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({ lastRun: state.lastRun }),
    schema: schema.object({ lastRun: schema.maybe(lastRunSchema) }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const emptyState: LatestTaskStateSchema = {};
