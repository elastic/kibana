/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEntityIndexPattern,
  ENTITY_HISTORY,
  ENTITY_SCHEMA_VERSION_V2,
} from '@kbn/entity-store/common';

/**
 * Base pattern for entity-store history snapshot indices in a namespace
 * (`.entities.v2.history.<namespace>`). Mirrors `getHistorySnapshotBasePattern` in the
 * entity-store plugin (`server/domain/asset_manager/history_snapshot_index.ts`) by calling the
 * same public `getEntityIndexPattern`, so the two cannot disagree on the prefix.
 */
export const getHistorySnapshotBasePattern = (namespace: string): string =>
  getEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_HISTORY,
    namespace,
  });

/**
 * Concrete history snapshot index name, `<base>.<YYYY-MM-DD>-<HH>` — the same shape the entity
 * store writes (see `getHistorySnapshotIndexName` in the plugin) and the shape the
 * `.<base>.*` pattern the readers query matches. The stamp is UTC, and `toISOString()` is UTC.
 */
export const getHistorySnapshotIndexName = (namespace: string, timestamp: Date): string =>
  `${getHistorySnapshotBasePattern(namespace)}.${timestamp
    .toISOString()
    .slice(0, 13)
    .replace('T', '-')}`;
