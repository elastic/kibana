/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P15b — single-request KPI handler.
//
// Replaces four parallel Lens-driven DSL queries (one per KPI tile) with one
// server-side request that returns the four headline scalars in one round
// trip. Builds on P15a's removal of `trendLine: true`: with no
// `date_histogram` to bucket against, the engine-side cost collapses from
// `O(hosts × buckets × per-state slices)` to `O(hosts × per-state slices)`,
// well below Nhat's 1 GB Serverless circuit-breaker threshold for any
// realistic fleet size up to MAX_HOST_COUNT_LIMIT (10 000).
//
// Schema split:
// - semconv → ES|QL `FROM … | STATS … | EVAL`. Filter-in-aggregation per
//   per-state slice (`AVG(...) WHERE state == "idle"`). The `*_OVER_TIME`
//   family isn't used here — these are page-wide aggregates, not time
//   series. `FROM` (not `TS`) because we need filter-in-aggregation, which
//   the engine currently rejects inside `TS` pipelines (same constraint
//   that drives the Phase B query shape).
// - ecs → DSL search with four sibling aggregations + a `bucket_script` for
//   the normalised-load ratio. One round trip, no Lens / formula compiler.
//
// Scope match with the table:
// - The caller passes `names: string[]` (Phase A's result, capped at
//   MAX_HOST_COUNT_LIMIT). The KPI tiles' "Average (of N hosts)" subtitle
//   means exactly the N hosts the table is rendering. We don't re-run the
//   ranking; the client owns the contract.
// - The same KQL `query` is applied so any "exclude cloud.provider=aws"
//   filter the user typed is honoured.

import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import { DEFAULT_SCHEMA, HOST_NAME_FIELD } from '../../../../../common/constants';
import type { GetHostsKpisResponsePayload, HostsKpis } from '../../../../../common/http_api/infra';
import type { InfraMetricsClient } from '../../../../lib/helpers/get_infra_metrics_client';

interface GetHostsKpisParameters {
  infraMetricsClient: InfraMetricsClient;
  query?: estypes.QueryDslQueryContainer;
  names?: string[];
  from: number;
  to: number;
  schema?: DataSchemaFormat;
}

export async function getHostsKpis({
  infraMetricsClient,
  query,
  names,
  from,
  to,
  schema = DEFAULT_SCHEMA,
}: GetHostsKpisParameters): Promise<GetHostsKpisResponsePayload> {
  const scopedNames = names && names.length > 0 ? names : undefined;

  if (schema === 'semconv') {
    try {
      return await fetchSemconvKpis({
        infraMetricsClient,
        query,
        names: scopedNames,
        from,
        to,
      });
    } catch {
      // ES|QL primitive gap (missing field, version skew, unsupported
      // function on the running stack) → fall through to DSL so the tiles
      // still render. DSL always works because it's the legacy formula
      // shape, just reshaped from per-host buckets to a fleet-level
      // aggregation.
    }
  }

  return fetchKpisDsl({
    infraMetricsClient,
    query,
    names: scopedNames,
    from,
    to,
    schema,
  });
}

// ---------------------------------------------------------------------------
// Semconv path — ES|QL
// ---------------------------------------------------------------------------

interface SemconvFetchArgs {
  infraMetricsClient: InfraMetricsClient;
  query?: estypes.QueryDslQueryContainer;
  names?: string[];
  from: number;
  to: number;
}

async function fetchSemconvKpis({
  infraMetricsClient,
  query,
  names,
  from,
  to,
}: SemconvFetchArgs): Promise<GetHostsKpisResponsePayload> {
  // Pre-aggregation `WHERE` is inlined into the ES|QL query (the engine
  // applies it on the raw stream before the `STATS` boundary). Post-`STATS`
  // filtering uses the wrapping request `filter` instead — same pattern
  // Phase B uses.
  const nameList = names ? names.map((n) => JSON.stringify(n)).join(', ') : null;

  const esqlQuery = `FROM metrics-hostmetricsreceiver.otel-*${
    nameList ? `\n| WHERE ${HOST_NAME_FIELD} IN (${nameList})` : ''
  }
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
    diskUsage = CASE(disk_total > 0, 1 - disk_free / disk_total, NULL)
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

  // The query has no `BY` clause, so `STATS` collapses to a single row.
  // Defend against an empty result (no docs in range) — return all nulls
  // with `hostCount: 0` so the UI renders "–" tiles rather than throwing.
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
  names?: string[];
  from: number;
  to: number;
  schema: DataSchemaFormat;
}

async function fetchKpisDsl({
  infraMetricsClient,
  query,
  names,
  from,
  to,
  schema,
}: DslFetchArgs): Promise<GetHostsKpisResponsePayload> {
  const inventoryModel = findInventoryModel('host');

  // Mirror the formulas in
  // `metrics_data_access/.../formulas/{cpu,memory,disk}.ts`:
  //
  //   cpuUsage        ECS:     avg(system.cpu.total.norm.pct)
  //                   semconv: 1 - avg(cpu.utilization where state=idle)
  //   normalizedLoad1m ECS:     avg(system.load.1) / max(system.load.cores)
  //                   semconv: avg(load_average.1m) / max(logical.count)
  //   memoryUsage     ECS:     avg(system.memory.actual.used.pct)
  //                   semconv: avg(memory.utilization where state=used)
  //   diskUsage       ECS:     max(system.filesystem.used.pct)
  //                   semconv: 1 - sum(filesystem.usage where state=free)
  //                                / sum(filesystem.usage)
  //
  // The semconv branch is only reached here as the ES|QL fallback. On the
  // semconv path the dominant cost is the per-state `filter` sub-agg
  // (idle / used / free) — still single-digit MB total for ≤ 10 000 hosts.

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

  // We *cannot* use `bucket_script` to derive `diskUsage` and
  // `normalizedLoad1m` here: pipeline aggs require a multi-bucket parent,
  // but at the root of this request all siblings are metric aggs. Returning
  // the raw numerator/denominator and dividing in `extract*` below is one
  // extra division per request — cheaper than wrapping everything in a
  // dummy `filters` bucket just to satisfy the parser.
  const diskAggs: Record<string, estypes.AggregationsAggregationContainer> = isSemconv
    ? {
        disk_free: {
          filter: { term: { state: 'free' } },
          aggs: { value: { sum: { field: 'metrics.system.filesystem.usage' } } },
        },
        disk_total: { sum: { field: 'metrics.system.filesystem.usage' } },
      }
    : {
        diskUsage: { max: { field: 'system.filesystem.used.pct' } },
      };

  const filterClauses: estypes.QueryDslQueryContainer[] = [
    ...rangeQuery(from, to),
    ...(names ? termsQuery(HOST_NAME_FIELD, ...names) : []),
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
        ...diskAggs,
        host_count: { cardinality: { field: HOST_NAME_FIELD } },
      },
    },
    `host kpis (dsl, schema=${schema})`
  );

  const aggs = response.aggregations as Record<string, { value?: number | null }> | undefined;

  const kpis: HostsKpis = {
    cpuUsage: extractCpuUsage(aggs, isSemconv),
    normalizedLoad1m: extractNormalizedLoad(aggs),
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
    // Semconv: `system.filesystem.usage` reports bytes per `state`. Total
    // capacity == sum across all states; `1 - free/total` is the canonical
    // used-ratio formula used everywhere else in the inventory model.
    const free = numberOrNull(
      (aggs.disk_free as { value?: { value?: number | null } } | undefined)?.value?.value
    );
    const total = numberOrNull((aggs.disk_total as { value?: number | null } | undefined)?.value);
    if (free === null || total === null || total <= 0) return null;
    return 1 - free / total;
  }
  return numberOrNull((aggs.diskUsage as { value?: number | null } | undefined)?.value);
}

function extractNormalizedLoad(aggs: Record<string, unknown> | undefined): number | null {
  if (!aggs) return null;
  // load1m and cores have identical shape on both ECS and semconv branches
  // (plain metric aggs); the field names differ but the response shape
  // doesn't, so this branch-free.
  const load = numberOrNull((aggs.load1m as { value?: number | null } | undefined)?.value);
  const cores = numberOrNull((aggs.cores as { value?: number | null } | undefined)?.value);
  if (load === null || cores === null || cores <= 0) return null;
  return load / cores;
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
