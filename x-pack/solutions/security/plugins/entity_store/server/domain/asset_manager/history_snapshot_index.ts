/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityIndexPattern, ENTITY_HISTORY, ENTITY_SCHEMA_VERSION_V2 } from '../constants';

/**
 * Base index pattern for history snapshot indices in a namespace.
 * Actual indices have a date-hour suffix, e.g. ".entities.v2.history.security_default.2025-02-27-14"
 */
const getHistorySnapshotBasePattern = (namespace: string): string =>
  getEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_HISTORY,
    namespace,
  });

/**
 * Returns the history snapshot index name for a given namespace and date (with hour).
 * Format: .entities.v2.history.security_<namespace>.<YYYY-MM-DD>-<HH>
 * Hour is included so sub-daily frequencies (e.g. 12h, 1h) use distinct indices.
 */
export const getHistorySnapshotIndexName = (
  namespace: string,
  historySnapshotDate: Date
): string => {
  const y = historySnapshotDate.getUTCFullYear();
  const m = String(historySnapshotDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(historySnapshotDate.getUTCDate()).padStart(2, '0');
  const h = String(historySnapshotDate.getUTCHours()).padStart(2, '0');
  const dateHourStr = `${y}-${m}-${d}-${h}`;
  return `${getHistorySnapshotBasePattern(namespace)}.${dateHourStr}`;
};

/**
 * Returns the index pattern matching all history snapshot indices for a namespace.
 * Used for delete and status.
 */
export const getHistorySnapshotIndexPattern = (namespace: string): string =>
  `${getHistorySnapshotBasePattern(namespace)}*`;
