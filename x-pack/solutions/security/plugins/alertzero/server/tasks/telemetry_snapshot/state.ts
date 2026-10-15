/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

const stateSchemaV1 = schema.object({
  /** The UTC day (`YYYY-MM-DD`) of the last reported snapshot. */
  lastSnapshotDay: schema.maybe(schema.string({ maxLength: 10, minLength: 10 })),
});

export type TelemetrySnapshotTaskState = TypeOf<typeof stateSchemaV1>;

/** Keeps only the known state keys, so a malformed persisted state never reaches a run. */
export const toTelemetrySnapshotTaskState = (
  state: Record<string, unknown>
): TelemetrySnapshotTaskState =>
  typeof state.lastSnapshotDay === 'string' ? { lastSnapshotDay: state.lastSnapshotDay } : {};

export const TELEMETRY_SNAPSHOT_STATE_SCHEMA_BY_VERSION = {
  1: { schema: stateSchemaV1, up: toTelemetrySnapshotTaskState },
};

export const EMPTY_TELEMETRY_SNAPSHOT_STATE: TelemetrySnapshotTaskState = {};
