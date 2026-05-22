/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P15b — KPI summary contract.
//
// The Hosts page renders four headline tiles (CPU Usage, Normalized Load,
// Memory Usage, Disk Usage) above the table. Today each tile is a Lens
// `chartType: 'metric'` chart driven by the inventory-model formulas, which
// fans out to four parallel DSL aggregations against the full host set
// returned by Phase A. P15a already dropped the per-tile `date_histogram`
// (the trend line), so the only remaining work is the headline scalar — four
// numbers. P15b collapses those four DSL roundtrips into one request:
//
// - semconv: a single ES|QL `FROM … | STATS … | EVAL …` query with
//   filter-in-aggregation per metric / per state.
// - ecs: a single DSL search with four sibling aggregations (sub-aggs and
//   `bucket_script` where the formula needs a ratio).
//
// Scope.
// - The endpoint takes the *Phase A name set* (`names: string[]`) plus the
//   same `query` (KQL) the user sees in the table, and computes the four
//   KPIs over the intersection. Sending `names` rather than re-running the
//   ranking server-side keeps the KPI 1:1 consistent with the table (same
//   guarantee `buildCombinedAssetFilter` provides today).
// - `names.length` is capped at MAX_HOST_COUNT_LIMIT (the same ceiling Phase
//   A enforces). Going wider would defeat the user's `limit` selector.
// - No `BUCKET` / `date_histogram` — that's P15c. Without time bucketing the
//   ES cell count is `O(hosts × per-state slices)` ≈ single-digit MB at
//   500 hosts × 4 states, which keeps the query safely under the 1 GB
//   Serverless circuit-breaker that Nhat flagged in Slack #C09AKTEDVMG
//   (25 Apr 2026 reply).

import { createLiteralValueFromUndefinedRT, inRangeRt, isoToEpochRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { MAX_HOST_COUNT_LIMIT } from '../../constants';
import { EntityTypeRT, DataSchemaFormatRT } from '../shared';

export const GetHostsKpisRequestBodyPayloadRT = rt.intersection([
  rt.partial({
    query: rt.UnknownRecord,
    schema: DataSchemaFormatRT,
    // Hard ceiling matches Phase A's `limit`. The route validator rejects
    // anything longer so the cost-model invariant (cells = hosts × states)
    // holds.
    names: rt.array(rt.string),
  }),
  rt.type({
    from: isoToEpochRt,
    to: isoToEpochRt,
    // Mirrored from Phase A purely for the subtitle ("Average (of N hosts)").
    // Defaults to the same 500-host fleet cap so callers that don't pass it
    // still get a sensible "of {limit} hosts" label.
    limit: rt.union([inRangeRt(1, MAX_HOST_COUNT_LIMIT), createLiteralValueFromUndefinedRT(500)]),
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
    // The number of hosts the four KPIs were actually averaged across.
    // Drives the "Average (of N hosts)" subtitle; lets the UI fall back to
    // "Average" with no parenthetical when the value matches the total
    // fleet count (i.e. the user didn't hit `limit`).
    hostCount: rt.number,
  }),
]);

export type GetHostsKpisRequestBodyPayload = rt.TypeOf<typeof GetHostsKpisRequestBodyPayloadRT>;
export type GetHostsKpisRequestBodyPayloadClient = rt.OutputOf<
  typeof GetHostsKpisRequestBodyPayloadRT
>;
export type GetHostsKpisResponsePayload = rt.TypeOf<typeof GetHostsKpisResponsePayloadRT>;
export type HostsKpis = rt.TypeOf<typeof HostsKpisRT>;
