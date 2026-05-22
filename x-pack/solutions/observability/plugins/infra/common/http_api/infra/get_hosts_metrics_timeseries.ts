/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P16 — Hosts UI Metrics tab time-series contract.
//
// The Metrics tab today renders 11 Lens-embedded `xy` charts, each firing its
// own DSL search with `terms({ field: 'host.name', size: 20 })` +
// `date_histogram` + a per-metric aggregation. Eleven independent round-trips,
// eleven embeddable mounts, and eleven copies of effectively the same
// `range` + `host.name in (...)` filter set evaluated separately on ES.
//
// This contract collapses those eleven calls into one round-trip that returns
// the time-series for every metric × every host the table is currently
// showing. The server-side handler issues two ES|QL queries in parallel — one
// `FROM … STATS … BY host.name, BUCKET(@timestamp, span)` for non-counter
// metrics (which need filter-in-aggregation for state slices) and one `TS …`
// for the counter metrics that need `RATE()` semantics. Both share the same
// host page, time range, and KQL filter so the engine can cache the same
// underlying scan.
//
// Scope match with the table:
// - `names: string[]` is the visible page (≤ MAX_HOSTS_PER_METRICS_REQUEST).
//   Same constant Phase B uses — if the UI page-size dropdown adds a "50
//   rows per page" option later, both caps widen automatically.
// - `from`/`to` and `query` mirror the table's unified search state so the
//   charts show the same window and the same filters as the rows above.

import { isoToEpochRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { MAX_HOSTS_PER_METRICS_REQUEST } from '../../constants';
import { EntityTypeRT, DataSchemaFormatRT } from '../shared';

// The catalogue of metrics the Metrics tab knows how to render. Matches —
// chart-for-chart — `useMetricsCharts.ts` so the new endpoint can replace the
// legacy Lens-per-chart fan-out 1:1.
export const HostsTimeseriesMetricRT = rt.union([
  rt.literal('cpuUsage'),
  rt.literal('normalizedLoad1m'),
  rt.literal('memoryUsage'),
  rt.literal('memoryFree'),
  rt.literal('diskSpaceAvailable'),
  rt.literal('diskIORead'),
  rt.literal('diskIOWrite'),
  rt.literal('diskReadThroughput'),
  rt.literal('diskWriteThroughput'),
  rt.literal('rx'),
  rt.literal('tx'),
]);

export type HostsTimeseriesMetric = rt.TypeOf<typeof HostsTimeseriesMetricRT>;

// Sentinel for "all eleven, please". The UI's default path needs every chart,
// but the contract still accepts a subset so the same endpoint can power
// future single-metric views (host details flyout, etc.) without a second
// route.
export const ALL_HOSTS_TIMESERIES_METRICS: readonly HostsTimeseriesMetric[] = [
  'cpuUsage',
  'normalizedLoad1m',
  'memoryUsage',
  'memoryFree',
  'diskSpaceAvailable',
  'diskIORead',
  'diskIOWrite',
  'diskReadThroughput',
  'diskWriteThroughput',
  'rx',
  'tx',
] as const;

export const GetHostsMetricsTimeseriesRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
    schema: DataSchemaFormatRT,
    metrics: rt.array(HostsTimeseriesMetricRT),
    // Optional explicit bucket span (e.g. "10m"). When omitted, the server
    // picks a span that keeps bucket count ≤ ~100 over the requested range,
    // mirroring Lens's auto-interval default and keeping the response payload
    // bounded regardless of `to - from`.
    bucketSpan: rt.string,
  }),
  rt.type({
    // The visible page's host names. Capped at the same per-page constant as
    // Phase B — the route validator rejects anything longer. See
    // `MAX_HOSTS_PER_METRICS_REQUEST` for the rationale (page-bounded query
    // cost; UI page-size dropdown is the source of truth).
    names: rt.array(rt.string),
    from: isoToEpochRt,
    to: isoToEpochRt,
  }),
]);

// One time-bucketed point per host per metric. `value: null` distinguishes
// "bucket exists, no data reported" (rendered as a gap in the line) from
// `value: 0` (rendered as a zero datapoint). Without this distinction sparse
// counter metrics — disk IO on an idle host, network on a host that hasn't
// served traffic in the window — would render as a flat zero floor.
export const HostsTimeseriesBucketRT = rt.type({
  // Epoch millis at the bucket's start edge. Charts plot the centre of the
  // bucket; we ship the start edge because it matches the date_histogram
  // contract clients are already used to (`buckets[i].key`).
  x: rt.number,
  y: rt.union([rt.number, rt.null]),
});

export const HostsTimeseriesSeriesRT = rt.type({
  host: rt.string,
  metric: HostsTimeseriesMetricRT,
  data: rt.array(HostsTimeseriesBucketRT),
});

export const GetHostsMetricsTimeseriesResponsePayloadRT = rt.intersection([
  EntityTypeRT,
  rt.type({
    // Flat list of (host, metric, data[]) triples. Flat instead of nested by
    // metric so the client can route each chart's slice with a single
    // `series.filter(s => s.metric === id)` — same shape `@elastic/charts`
    // wants for its `<LineSeries split=… />` consumers.
    series: rt.array(HostsTimeseriesSeriesRT),
    // The bucket span the server actually used (echoes the request when
    // present, otherwise reports the auto-selected span as an ISO duration
    // string like "10m"). The UI displays this in the chart tooltip so the
    // user knows "each point is a 10-minute average".
    bucketSpan: rt.string,
  }),
]);

export type GetHostsMetricsTimeseriesRequestBodyPayload = rt.TypeOf<
  typeof GetHostsMetricsTimeseriesRequestBodyPayloadRT
>;
export type GetHostsMetricsTimeseriesRequestBodyPayloadClient = rt.OutputOf<
  typeof GetHostsMetricsTimeseriesRequestBodyPayloadRT
>;
export type GetHostsMetricsTimeseriesResponsePayload = rt.TypeOf<
  typeof GetHostsMetricsTimeseriesResponsePayloadRT
>;
export type HostsTimeseriesSeries = rt.TypeOf<typeof HostsTimeseriesSeriesRT>;
export type HostsTimeseriesBucket = rt.TypeOf<typeof HostsTimeseriesBucketRT>;

// Public re-export so callers can both validate `names.length` client-side
// and drive their UI-level slicing from the same constant the server caps on.
export { MAX_HOSTS_PER_METRICS_REQUEST };
