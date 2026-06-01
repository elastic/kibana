/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Single-request KPI handler.
//
// Replaces four parallel Lens-driven DSL queries (one per KPI tile) with one
// server-side request that returns the four headline scalars + the host
// count for the subtitle. The Hosts page's KPI strip has no trendline, so
// with no `date_histogram` to bucket against the engine-side cost collapses
// from `O(hosts × buckets × per-state slices)` to `O(hosts × per-state
// slices)` — well below the 1 GB Serverless circuit-breaker for any
// realistic fleet size.
//
// Scope: the entire filter-matched fleet.
// The four KPIs are computed over every host matching the user's KQL and
// date range — no per-host `LIMIT` is applied server-side, no `names` list
// is threaded in from the client. Two consequences:
//
//   1. The endpoint can fire in parallel with the legacy `/host` endpoint
//      (`useHostsKpis` does NOT depend on `hostNodes`). This eliminates
//      the serial dependency that dominated user-perceived KPI strip
//      latency at scale (~40 s saved at 5000 hosts).
//   2. The KPI scope is "fleet" rather than "the first N hosts the table
//      happened to render". The legacy Lens-DSL path scoped KPIs to the
//      table's host set via `buildCombinedAssetFilter`; that coupling was
//      only meaningful when `limit` ≥ fleet, and degenerated into an
//      alphabetical sample otherwise (not a meaningful sampling rule).
//      The new shape is the fleet-level summary the UI label promises.
//      The "of {N} hosts" subtitle is computed client-side as
//      `min(hostCount, limit)` so it stays consistent with the table.
//
// Schema split:
// - semconv → ES|QL pipeline: `WHERE state IN (...) OR state IS NULL`
//   (lets the engine prune via the inverted index on `state` *before* the
//   filter-in-aggregation operator scans rows — confirmed ~3× wall-time
//   improvement at 5000 hosts on the deploy bench) → single-stage `STATS`
//   with filter-in-agg per metric/state → `EVAL` to derive the four KPI
//   ratios. `FROM` (not `TS`) because filter-in-aggregation is rejected
//   inside `TS` pipelines today.
// - ecs → DSL search with four sibling aggregations + a `bucket_script`
//   for the normalised-load ratio. One round trip, no Lens / formula
//   compiler.

import { rangeQuery } from '@kbn/observability-plugin/server';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import { DEFAULT_SCHEMA, HOST_NAME_FIELD } from '../../../../../common/constants';
import type { GetHostsKpisResponsePayload, HostsKpis } from '../../../../../common/http_api/infra';
import type { InfraMetricsClient } from '../../../../lib/helpers/get_infra_metrics_client';

interface GetHostsKpisParameters {
  infraMetricsClient: InfraMetricsClient;
  query?: estypes.QueryDslQueryContainer;
  from: number;
  to: number;
  schema?: DataSchemaFormat;
}

export async function getHostsKpis({
  infraMetricsClient,
  query,
  from,
  to,
  schema = DEFAULT_SCHEMA,
}: GetHostsKpisParameters): Promise<GetHostsKpisResponsePayload> {
  if (schema === 'semconv') {
    try {
      return await fetchSemconvKpis({ infraMetricsClient, query, from, to });
    } catch {
      // ES|QL primitive gap (missing field, version skew, unsupported
      // function on the running stack) → fall through to DSL so the
      // tiles still render. DSL always works because it's the legacy
      // formula shape, just reshaped from per-host buckets to a
      // fleet-level aggregation.
    }
  }

  return fetchKpisDsl({ infraMetricsClient, query, from, to, schema });
}

// ---------------------------------------------------------------------------
// Semconv path — single-stage ES|QL STATS over the full filter-matched fleet
// ---------------------------------------------------------------------------

interface SemconvFetchArgs {
  infraMetricsClient: InfraMetricsClient;
  query?: estypes.QueryDslQueryContainer;
  from: number;
  to: number;
}

async function fetchSemconvKpis({
  infraMetricsClient,
  query,
  from,
  to,
}: SemconvFetchArgs): Promise<GetHostsKpisResponsePayload> {
  // Pre-STATS `WHERE state IN (…) OR state IS NULL` prunes ~80 % of the
  // input stream via the inverted index on `state` *before* the
  // filter-in-aggregation operator (`AVG(…) WHERE state == "idle"`) has
  // to scan row by row. `OR state IS NULL` preserves docs that don't
  // carry a `state` attribute (load_average, logical.count) so the
  // cores/load slices stay in the pipeline.
  //
  // No `BY host.name`, no `LIMIT`: the four headline values are
  // doc-weighted averages over the entire filtered fleet, and the
  // single `STATS` operator collapses straight to one row. Three runs at
  // 5000 hosts cold-cache landed at ~47 s wall, ~35 s `took` (vs ~89 s
  // for the two-stage `STATS BY host.name | LIMIT | STATS` variant on the
  // same fleet).
  const esqlQuery = `FROM metrics-hostmetricsreceiver.otel-*
| WHERE state IN ("idle", "used", "free") OR state IS NULL
| STATS
    cpu_idle = AVG(metrics.system.cpu.utilization) WHERE state == "idle",
    load1m = AVG(\`metrics.system.cpu.load_average.1m\`),
    cores = MAX(metrics.system.cpu.logical.count),
    mem_used = AVG(system.memory.utilization) WHERE state == "used",
    disk_free = SUM(metrics.system.filesystem.usage) WHERE state == "free",
    disk_total = SUM(metrics.system.filesystem.usage),
    host_count = COUNT_DISTINCT(${HOST_NAME_FIELD})
| EVAL
    cpuUsage = 1 - cpu_idle,
    normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL),
    memoryUsage = mem_used,
    diskUsage = CASE(disk_total > 0, 1 - TO_DOUBLE(disk_free) / TO_DOUBLE(disk_total), NULL)
| KEEP cpuUsage, normalizedLoad1m, memoryUsage, diskUsage, host_count`;

  const filterClauses: estypes.QueryDslQueryContainer[] = [
    ...rangeQuery(from, to),
    ...(query ? [query] : []),
  ];

  type SemconvKpiRow = {
    cpuUsage?: number | null;
    normalizedLoad1m?: number | null;
    memoryUsage?: number | null;
    diskUsage?: number | null;
    host_count?: number | null;
  } & Record<string, unknown>;

  const { rows } = await infraMetricsClient.esql<SemconvKpiRow>(
    {
      query: esqlQuery,
      filter: filterClauses.length ? { bool: { filter: filterClauses } } : undefined,
    },
    'host kpis (esql)'
  );

  // Single `STATS` collapses to one row. Defend against an empty result
  // (no docs in range) — return all nulls with `hostCount: 0` so the UI
  // renders "–" tiles rather than throwing.
  const row = rows[0];

  return {
    entityType: 'host',
    kpis: {
      cpuUsage: numberOrNull(row?.cpuUsage),
      normalizedLoad1m: numberOrNull(row?.normalizedLoad1m),
      memoryUsage: numberOrNull(row?.memoryUsage),
      diskUsage: numberOrNull(row?.diskUsage),
    },
    hostCount: typeof row?.host_count === 'number' ? row.host_count : 0,
  };
}

// ---------------------------------------------------------------------------
// ECS / fallback path — DSL
// ---------------------------------------------------------------------------

interface DslFetchArgs {
  infraMetricsClient: InfraMetricsClient;
  query?: estypes.QueryDslQueryContainer;
  from: number;
  to: number;
  schema: DataSchemaFormat;
}

async function fetchKpisDsl({
  infraMetricsClient,
  query,
  from,
  to,
  schema,
}: DslFetchArgs): Promise<GetHostsKpisResponsePayload> {
  const inventoryModel = findInventoryModel('host');

  // Mirror the formulas in
  // `metrics_data_access/.../formulas/{cpu,memory,disk}.ts`:
  //
  //   cpuUsage         ECS:     avg(system.cpu.total.norm.pct)
  //                    semconv: 1 - avg(cpu.utilization where state=idle)
  //   normalizedLoad1m ECS:     avg(system.load.1) / max(system.load.cores)
  //                    semconv: avg(load_average.1m) / max(logical.count)
  //   memoryUsage      ECS:     avg(system.memory.actual.used.pct)
  //                    semconv: avg(memory.utilization where state=used)
  //   diskUsage        ECS:     max(system.filesystem.used.pct)
  //                    semconv: 1 - sum(filesystem.usage where state=free)
  //                                 / sum(filesystem.usage)
  //
  // The semconv branch is only reached here as the ES|QL fallback. The
  // ECS path always uses DSL. Same fleet-level scope as the ES|QL path:
  // sibling aggs over the filter-matched fleet, no per-host bucketing.

  const isSemconv = schema === 'semconv';

  const cpuAgg: estypes.AggregationsAggregationContainer = isSemconv
    ? {
        filter: { term: { state: 'idle' } },
        aggs: { value: { avg: { field: 'metrics.system.cpu.utilization' } } },
      }
    : { avg: { field: 'system.cpu.total.norm.pct' } };

  const memAgg: estypes.AggregationsAggregationContainer = isSemconv
    ? {
        filter: { term: { state: 'used' } },
        aggs: { value: { avg: { field: 'system.memory.utilization' } } },
      }
    : { avg: { field: 'system.memory.actual.used.pct' } };

  const load1mField = isSemconv ? 'metrics.system.cpu.load_average.1m' : 'system.load.1';
  const coresField = isSemconv ? 'metrics.system.cpu.logical.count' : 'system.load.cores';

  const diskAggs: Record<string, estypes.AggregationsAggregationContainer> = isSemconv
    ? {
        disk_free: {
          filter: { term: { state: 'free' } },
          aggs: { value: { sum: { field: 'metrics.system.filesystem.usage' } } },
        },
        disk_total: { sum: { field: 'metrics.system.filesystem.usage' } },
        diskUsage: {
          bucket_script: {
            buckets_path: { free: 'disk_free>value', total: 'disk_total' },
            // Guard against `total=0` so we don't return `Infinity`.
            script: 'params.total > 0 ? 1 - params.free / params.total : null',
          },
        },
      }
    : {
        diskUsage: { max: { field: 'system.filesystem.used.pct' } },
      };

  const filterClauses: estypes.QueryDslQueryContainer[] = [
    ...rangeQuery(from, to),
    ...(query ? [query] : []),
    ...(inventoryModel.nodeFilter?.({ schema }) ?? []),
  ];

  const response = await infraMetricsClient.search(
    {
      allow_no_indices: true,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: { bool: { filter: filterClauses } },
      aggs: {
        cpu: cpuAgg,
        mem: memAgg,
        load1m: { avg: { field: load1mField } },
        cores: { max: { field: coresField } },
        normalizedLoad1m: {
          bucket_script: {
            buckets_path: { load: 'load1m', cores: 'cores' },
            script: 'params.cores > 0 ? params.load / params.cores : null',
          },
        },
        ...diskAggs,
        host_count: { cardinality: { field: HOST_NAME_FIELD } },
      },
    },
    `host kpis (dsl, schema=${schema})`
  );

  const aggs = response.aggregations as Record<string, { value?: number | null }> | undefined;

  const kpis: HostsKpis = {
    cpuUsage: extractCpuUsage(aggs, isSemconv),
    normalizedLoad1m: numberOrNull(aggs?.normalizedLoad1m?.value),
    memoryUsage: extractMemoryUsage(aggs, isSemconv),
    diskUsage: extractDiskUsage(aggs, isSemconv),
  };

  return {
    entityType: 'host',
    kpis,
    hostCount: numberOrNull(aggs?.host_count?.value) ?? 0,
  };
}

// The `filter+avg` sub-aggregation surfaces the metric value at
// `aggs.cpu.value.value`; the plain `avg` shape surfaces it at
// `aggs.cpu.value`. Encode that difference here so the rest of the handler
// stays uniform.
function extractCpuUsage(
  aggs: Record<string, unknown> | undefined,
  isSemconv: boolean
): number | null {
  if (!aggs) return null;
  if (isSemconv) {
    const nested = (aggs.cpu as { value?: { value?: number | null } } | undefined)?.value?.value;
    const cpuIdle = numberOrNull(nested);
    return cpuIdle === null ? null : 1 - cpuIdle;
  }
  return numberOrNull((aggs.cpu as { value?: number | null } | undefined)?.value);
}

function extractMemoryUsage(
  aggs: Record<string, unknown> | undefined,
  isSemconv: boolean
): number | null {
  if (!aggs) return null;
  if (isSemconv) {
    return numberOrNull(
      (aggs.mem as { value?: { value?: number | null } } | undefined)?.value?.value
    );
  }
  return numberOrNull((aggs.mem as { value?: number | null } | undefined)?.value);
}

function extractDiskUsage(
  aggs: Record<string, unknown> | undefined,
  isSemconv: boolean
): number | null {
  if (!aggs) return null;
  if (isSemconv) {
    return numberOrNull((aggs.diskUsage as { value?: number | null } | undefined)?.value);
  }
  return numberOrNull((aggs.diskUsage as { value?: number | null } | undefined)?.value);
}

function numberOrNull(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
