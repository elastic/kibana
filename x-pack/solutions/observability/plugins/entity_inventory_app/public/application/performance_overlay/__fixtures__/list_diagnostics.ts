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
  SourceError,
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

// A request that threw carries no stats.
const NO_STATS = {
  took: null,
  documentsFound: null,
  valuesLoaded: null,
  rowsEmitted: null,
  cpuNanos: null,
  driverNanos: null,
  bytesRead: null,
  shards: null,
  isPartial: null,
};

const TRACES_FORBIDDEN =
  'security_exception: action [indices:data/read/esql] is unauthorized for user [elastic] on indices [traces-*]';

/** A concrete index that is not time series: the probe fails verification, so only FROM runs. */
export const NO_TIME_SERIES_PROBE: ListProbeDiagnostic = {
  indexPattern: 'logs-app',
  esql: 'TS logs-app | LIMIT 1',
  params: [],
  outcome: 'no_time_series',
  wallMs: 2.5,
  ...NO_STATS,
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
  },
  {
    indexPattern: 'traces-*',
    esql: 'TS traces-* | LIMIT 1',
    params: [],
    outcome: 'failed',
    wallMs: 1.5,
    ...NO_STATS,
  },
  NO_TIME_SERIES_PROBE,
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
  },
];

export const ERRORS_FIXTURE: SourceError[] = [
  { indexPattern: 'logs-*', status: 400, reason: 'Unknown column [host.name]' },
  { indexPattern: 'traces-*', status: 403, reason: TRACES_FORBIDDEN },
  { indexPattern: 'apm-*', status: 503, reason: 'Cluster unavailable' },
];

export const TIMINGS_FIXTURE: ListTimings = {
  definitionMs: 0.42,
  planningMs: 6.1,
  probesMs: 4.4,
  queriesMs: 42.3,
  processingMs: 3.2,
  totalMs: 52.02,
};
