/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P15b — KPI summary contract.
//
// The Hosts page renders four headline tiles (CPU Usage, Normalized Load,
// Memory Usage, Disk Usage) above the table. On main each tile is a Lens
// `chartType: 'metric'` chart driven by the inventory-model formulas, which
// fans out to four parallel DSL aggregations against the host set returned
// by the legacy host endpoint. P15a already dropped the per-tile
// `date_histogram` (the trend line), so the only remaining work is the
// headline scalar — four numbers. This endpoint collapses those four DSL
// round-trips into one request:
//
// - semconv: a single ES|QL `FROM … | STATS … | EVAL` pipeline with
//   filter-in-aggregation per metric/state and a pre-STATS
//   `WHERE state IN (…)` so the engine prunes via the inverted index on
//   `state` before the filter-in-agg operator runs (massive win on real
//   OTel data where each host emits ~30 docs per interval, one per
//   state).
// - ecs: a single DSL search with four sibling aggregations + a
//   `bucket_script` for the normalised-load ratio.
//
// Scope.
// - KPIs are computed over the *entire* filter-matched fleet. The
//   request body carries `from`, `to`, `query` (KQL), and `schema`;
//   there is no `names` list and no server-side `limit`. The legacy
//   Lens-DSL path scoped KPIs to the table's host set via
//   `buildCombinedAssetFilter` — that coupling was only meaningful when
//   `limit` ≥ fleet, and degenerated to an alphabetical sample
//   otherwise. The new shape is the fleet-level summary the UI label
//   promises; the "of {N} hosts" subtitle is computed client-side as
//   `min(hostCount, searchCriteria.limit)` so it stays consistent with
//   the table.
// - Parallel with `/host`: the client (`useHostsKpis`) does NOT depend
//   on `hostNodes`. Both endpoints fire from the same `useHostsPageReady`
//   gate, so user-perceived KPI strip latency is `max(/host, /kpis)`
//   rather than `/host + /kpis`.
// - No `BUCKET` / `date_histogram` — the trendline is intentionally not
//   produced here. Without time bucketing the ES cell count is
//   `O(hosts × per-state slices)` ≈ single-digit MB on the deploy
//   fixture (5000 hosts × ~4 states), well under any realistic
//   Serverless circuit-breaker budget.

import { isoToEpochRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { EntityTypeRT, DataSchemaFormatRT } from '../shared';

export const GetHostsKpisRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
    schema: DataSchemaFormatRT,
  }),
  rt.type({
    from: isoToEpochRt,
    to: isoToEpochRt,
  }),
]);

// Four headline values. `null` is the "no data" outcome — preserved as a
// distinct state from `0` so the UI can render "–" rather than "0%".
export const HostsKpisRT = rt.type({
  cpuUsage: rt.union([rt.number, rt.null]),
  normalizedLoad1m: rt.union([rt.number, rt.null]),
  memoryUsage: rt.union([rt.number, rt.null]),
  diskUsage: rt.union([rt.number, rt.null]),
});

export const GetHostsKpisResponsePayloadRT = rt.intersection([
  EntityTypeRT,
  rt.type({
    kpis: HostsKpisRT,
    // Total number of distinct hosts the four KPIs were computed over.
    // Drives the client-side subtitle (`Average (of min(hostCount,
    // limit) hosts)`); pegging the displayed count to `min(…, limit)`
    // keeps the wording consistent with what the user sees in the
    // table.
    hostCount: rt.number,
  }),
]);

export type GetHostsKpisRequestBodyPayload = rt.TypeOf<typeof GetHostsKpisRequestBodyPayloadRT>;
export type GetHostsKpisRequestBodyPayloadClient = rt.OutputOf<
  typeof GetHostsKpisRequestBodyPayloadRT
>;
export type GetHostsKpisResponsePayload = rt.TypeOf<typeof GetHostsKpisResponsePayloadRT>;
export type HostsKpis = rt.TypeOf<typeof HostsKpisRT>;
