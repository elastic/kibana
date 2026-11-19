/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ListProbeDiagnostic,
  ListQueryDiagnostic,
  ListTimings,
} from '@kbn/entity-inventory-plugin/common';

const STATS = {
  documentsFound: 1500,
  valuesLoaded: 4200,
  rowsEmitted: 3100,
  cpuNanos: 12_345_678,
  driverNanos: 45_600_000,
  bytesRead: 2048,
  shards: { total: 3, successful: 3, skipped: 0, failed: 0 },
  isPartial: false,
};

export const PROBES_FIXTURE: ListProbeDiagnostic[] = [
  {
    ...STATS,
    indexPattern: 'metrics-*',
    esql: 'TS metrics-* | LIMIT 1',
    params: [],
    outcome: 'time_series',
    wallMs: 4.25,
    took: 3,
    error: null,
  },
];

export const QUERIES_FIXTURE: ListQueryDiagnostic[] = [
  {
    ...STATS,
    indexPattern: 'metrics-*',
    engine: 'TS',
    esql: 'TS metrics-* | STATS BY host.name',
    params: [{ from: '2026-11-19T10:00:00.000Z' }],
    rowCount: 120,
    wallMs: 41.5,
    took: 38,
    error: null,
  },
  {
    indexPattern: 'logs-*',
    engine: 'FROM',
    esql: 'FROM logs-* | STATS BY host.name',
    params: [],
    rowCount: 0,
    wallMs: 12.75,
    took: null,
    documentsFound: null,
    valuesLoaded: null,
    rowsEmitted: null,
    cpuNanos: null,
    driverNanos: null,
    bytesRead: null,
    shards: null,
    isPartial: null,
    error: { status: 400, reason: 'Unknown column [host.name]' },
  },
];

export const TIMINGS_FIXTURE: ListTimings = {
  definitionMs: 0.42,
  planningMs: 6.1,
  probesMs: 4.4,
  queriesMs: 42.3,
  processingMs: 3.2,
  totalMs: 52.02,
};
