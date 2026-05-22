/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P16 — single-request Metrics-tab handler.
//
// Replaces the eleven Lens-driven xy charts on the Hosts Metrics tab with one
// server request that returns every metric × host × time bucket the table is
// currently showing. The eleven legacy round-trips each scanned the same
// time range with the same `host.name in (...)` filter and a per-metric
// aggregation; this handler issues one query that the engine can evaluate
// against a single bitset, then post-processes counters in Node.
//
// Two-query alternative considered: `FROM` for non-counter metrics + per-
// direction `TS` queries for counter metrics. `TS` would let us use `RATE()`
// for proper counter-reset detection, but it rejects filter-in-aggregation
// inside `STATS` (same constraint Phase B hit) so we'd need four extra
// queries (one per direction). The single-query path computes the rate
// client-side as `(MAX(t_n) - MAX(t_{n-1})) / span_s` — identical semantics
// to Lens's `counter_rate(max(...))` formula, which compiles down to a `max`
// aggregation followed by a `derivative` pipeline. Counter resets surface as
// negative diffs and are clamped to `null` so the chart renders a gap rather
// than a downward spike.
//
// Schema split:
// - semconv → single ES|QL `FROM` query, filter-in-aggregation per state /
//   direction slice. One round-trip.
// - ecs → DSL `terms(host.name, size: names.length) + date_histogram` with
//   per-metric sub-aggregations. Same query shape Lens emits today, just
//   collapsed into one search instead of eleven.
//
// On any failure inside the ES|QL path (missing field, version skew,
// unsupported function on the running stack) the handler falls back to DSL
// so the tab still renders.

import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import { DEFAULT_SCHEMA, HOST_NAME_FIELD } from '../../../../../common/constants';
import type {
  GetHostsMetricsTimeseriesResponsePayload,
  HostsTimeseriesMetric,
  HostsTimeseriesSeries,
} from '../../../../../common/http_api/infra';
import { ALL_HOSTS_TIMESERIES_METRICS } from '../../../../../common/http_api/infra';
import type { InfraMetricsClient } from '../../../../lib/helpers/get_infra_metrics_client';

interface GetHostsMetricsTimeseriesParameters {
  infraMetricsClient: InfraMetricsClient;
  query?: estypes.QueryDslQueryContainer;
  names: string[];
  metrics?: HostsTimeseriesMetric[];
  from: number;
  to: number;
  schema?: DataSchemaFormat;
  bucketSpan?: string;
}

// The set of metrics that need server-side rate derivation. Kept here next to
// the handler so the "is this a counter?" decision lives with the SQL it
// drives (rather than in the public contract, where the distinction is an
// implementation detail).
const COUNTER_METRICS = new Set<HostsTimeseriesMetric>([
  'diskIORead',
  'diskIOWrite',
  'diskReadThroughput',
  'diskWriteThroughput',
  'rx',
  'tx',
]);

export async function getHostsMetricsTimeseries({
  infraMetricsClient,
  query,
  names,
  metrics,
  from,
  to,
  schema = DEFAULT_SCHEMA,
  bucketSpan,
}: GetHostsMetricsTimeseriesParameters): Promise<GetHostsMetricsTimeseriesResponsePayload> {
  if (names.length === 0) {
    return { entityType: 'host', series: [], bucketSpan: bucketSpan ?? autoBucketSpan(from, to) };
  }

  const requestedMetrics = metrics?.length ? metrics : [...ALL_HOSTS_TIMESERIES_METRICS];
  const span = bucketSpan ?? autoBucketSpan(from, to);
  const spanSeconds = parseSpanToSeconds(span);

  if (schema === 'semconv') {
    try {
      return await fetchSemconvTimeseries({
        infraMetricsClient,
        names,
        metrics: requestedMetrics,
        from,
        to,
        span,
        spanSeconds,
        query,
      });
    } catch {
      // ES|QL primitive gap → DSL fallback. Matches Phase B / KPI behaviour.
    }
  }

  return fetchTimeseriesDsl({
    infraMetricsClient,
    names,
    metrics: requestedMetrics,
    from,
    to,
    span,
    spanSeconds,
    query,
    schema,
  });
}

// ---------------------------------------------------------------------------
// Bucket-span selection
// ---------------------------------------------------------------------------

// Aim for ~100 buckets across the range — same heuristic Lens uses when its
// xy chart has `interval: 'auto'`. 100 points renders smoothly at the typical
// chart width and keeps the response payload bounded:
//   100 buckets × 20 hosts × 11 metrics ≈ 22 000 numbers ≈ 350 KB JSON.
function autoBucketSpan(from: number, to: number): string {
  const rangeMs = Math.max(0, to - from);
  const targetBucketMs = Math.max(60_000, Math.round(rangeMs / 100));
  // Round to the nearest "human" interval so tooltip labels read cleanly.
  // Order matters: descending so we pick the largest <= target.
  const STEPS = [
    { ms: 24 * 60 * 60_000, label: '1d' },
    { ms: 12 * 60 * 60_000, label: '12h' },
    { ms: 6 * 60 * 60_000, label: '6h' },
    { ms: 60 * 60_000, label: '1h' },
    { ms: 30 * 60_000, label: '30m' },
    { ms: 10 * 60_000, label: '10m' },
    { ms: 5 * 60_000, label: '5m' },
    { ms: 60_000, label: '1m' },
  ];
  for (const step of STEPS) {
    if (targetBucketMs >= step.ms) return step.label;
  }
  return '1m';
}

function parseSpanToSeconds(span: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(span);
  if (!match) return 60;
  const value = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 60;
  }
}

// ---------------------------------------------------------------------------
// Semconv path — ES|QL
// ---------------------------------------------------------------------------

interface SemconvFetchArgs {
  infraMetricsClient: InfraMetricsClient;
  names: string[];
  metrics: HostsTimeseriesMetric[];
  from: number;
  to: number;
  span: string;
  spanSeconds: number;
  query?: estypes.QueryDslQueryContainer;
}

async function fetchSemconvTimeseries({
  infraMetricsClient,
  names,
  metrics,
  from,
  to,
  span,
  spanSeconds,
  query,
}: SemconvFetchArgs): Promise<GetHostsMetricsTimeseriesResponsePayload> {
  const nameList = names.map((n) => JSON.stringify(n)).join(', ');
  const needs = new Set(metrics);

  // STATS expressions are emitted only for the columns we actually need.
  // Skipping unused expressions cuts ES work proportionally — a single-metric
  // caller (host details flyout, future) pays for one expression, not eleven.
  const stats: string[] = [];
  const evals: string[] = [];
  const keeps: string[] = [HOST_NAME_FIELD, 'bucket'];

  if (needs.has('cpuUsage')) {
    stats.push(`  cpu_idle = AVG(metrics.system.cpu.utilization) WHERE state == "idle"`);
    evals.push(`cpuUsage = 1 - cpu_idle`);
    keeps.push('cpuUsage');
  }
  if (needs.has('normalizedLoad1m')) {
    stats.push(`  load1m = AVG(\`metrics.system.cpu.load_average.1m\`)`);
    stats.push(`  cores = MAX(metrics.system.cpu.logical.count)`);
    evals.push(`normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL)`);
    keeps.push('normalizedLoad1m');
  }
  if (needs.has('memoryUsage')) {
    stats.push(`  mem_used = AVG(system.memory.utilization) WHERE state == "used"`);
    evals.push(`memoryUsage = mem_used`);
    keeps.push('memoryUsage');
  }
  if (needs.has('memoryFree')) {
    // Mirrors `memoryFree` semconv formula:
    //   (max(usage WHERE state=free) + max(usage WHERE state=cached))
    //   - (avg(usage WHERE state=slab_unreclaimable) + avg(usage WHERE state=slab_reclaimable))
    stats.push(`  mem_free_max = MAX(metrics.system.memory.usage) WHERE state == "free"`);
    stats.push(`  mem_cached_max = MAX(metrics.system.memory.usage) WHERE state == "cached"`);
    stats.push(
      `  mem_slab_un_avg = AVG(metrics.system.memory.usage) WHERE state == "slab_unreclaimable"`
    );
    stats.push(
      `  mem_slab_re_avg = AVG(metrics.system.memory.usage) WHERE state == "slab_reclaimable"`
    );
    evals.push(
      `memoryFree = (mem_free_max + mem_cached_max) - (mem_slab_un_avg + mem_slab_re_avg)`
    );
    keeps.push('memoryFree');
  }
  if (needs.has('diskSpaceAvailable')) {
    stats.push(`  disk_free_avg = AVG(system.filesystem.usage) WHERE state == "free"`);
    evals.push(`diskSpaceAvailable = disk_free_avg`);
    keeps.push('diskSpaceAvailable');
  }

  // Counter metrics emit a raw `MAX(field)` per bucket — the rate is derived
  // server-side after the ES|QL response lands (see `deriveCounterRates`).
  // Naming convention `<metric>_max` is matched by the post-processor.
  if (needs.has('diskIORead')) {
    stats.push(
      `  diskIORead_max = MAX(system.disk.operations) WHERE attributes.direction == "read"`
    );
    keeps.push('diskIORead_max');
  }
  if (needs.has('diskIOWrite')) {
    stats.push(
      `  diskIOWrite_max = MAX(system.disk.operations) WHERE attributes.direction == "write"`
    );
    keeps.push('diskIOWrite_max');
  }
  if (needs.has('diskReadThroughput')) {
    stats.push(
      `  diskReadThroughput_max = MAX(system.disk.io) WHERE attributes.direction == "read"`
    );
    keeps.push('diskReadThroughput_max');
  }
  if (needs.has('diskWriteThroughput')) {
    stats.push(
      `  diskWriteThroughput_max = MAX(system.disk.io) WHERE attributes.direction == "write"`
    );
    keeps.push('diskWriteThroughput_max');
  }
  if (needs.has('rx')) {
    stats.push(`  rx_max = MAX(metrics.system.network.io) WHERE attributes.direction == "receive"`);
    keeps.push('rx_max');
  }
  if (needs.has('tx')) {
    stats.push(
      `  tx_max = MAX(metrics.system.network.io) WHERE attributes.direction == "transmit"`
    );
    keeps.push('tx_max');
  }

  const statsClause = stats.join(',\n');
  const evalClause = evals.length ? `\n| EVAL ${evals.join(', ')}` : '';
  const keepClause = keeps.join(', ');

  const esqlQuery = `FROM metrics-hostmetricsreceiver.otel-*
| WHERE ${HOST_NAME_FIELD} IN (${nameList})
| STATS
${statsClause}
  BY ${HOST_NAME_FIELD}, bucket = BUCKET(@timestamp, ${span})${evalClause}
| KEEP ${keepClause}
| SORT ${HOST_NAME_FIELD}, bucket`;

  const filterClauses: estypes.QueryDslQueryContainer[] = [
    ...rangeQuery(from, to),
    ...(query ? [query] : []),
  ];

  type SemconvRow = {
    [HOST_NAME_FIELD]: string;
    bucket: number | string;
  } & Record<string, unknown>;

  const { rows } = await infraMetricsClient.esql<SemconvRow>(
    {
      query: esqlQuery,
      filter: filterClauses.length ? { bool: { filter: filterClauses } } : undefined,
    },
    'host metrics timeseries (esql)'
  );

  const series = buildSeriesFromRows({ rows, names, metrics, spanSeconds });

  return { entityType: 'host', series, bucketSpan: span };
}

// ---------------------------------------------------------------------------
// Counter-rate derivation
// ---------------------------------------------------------------------------

interface RowLike {
  [key: string]: unknown;
  [HOST_NAME_FIELD]?: string;
  bucket?: number | string;
}

// Given `MAX(counter)` per bucket, emit `(value_n - value_{n-1}) / span_s` as
// the rate at bucket `n`. A negative diff is a counter reset (host restart,
// host migration, /metrics endpoint flap) — clamp those to `null` so the
// chart shows a gap instead of a downward spike. A `null` raw value is also
// passed through as `null` (the bucket had no data points).
function buildSeriesFromRows({
  rows,
  names,
  metrics,
  spanSeconds,
}: {
  rows: RowLike[];
  names: string[];
  metrics: HostsTimeseriesMetric[];
  spanSeconds: number;
}): HostsTimeseriesSeries[] {
  // Pre-group rows by host so the rate derivation can walk per-host buckets
  // in order. ESQL emitted them sorted by `(host.name, bucket)` so the
  // grouping reflects that ordering — we don't need a secondary sort.
  const byHost = new Map<string, RowLike[]>();
  for (const row of rows) {
    const host = row[HOST_NAME_FIELD];
    if (typeof host !== 'string') continue;
    const list = byHost.get(host) ?? [];
    list.push(row);
    byHost.set(host, list);
  }

  const result: HostsTimeseriesSeries[] = [];

  for (const host of names) {
    const hostRows = byHost.get(host) ?? [];

    for (const metric of metrics) {
      const isCounter = COUNTER_METRICS.has(metric);
      const sourceKey = isCounter ? `${metric}_max` : metric;

      const data = hostRows.map((row, idx) => {
        const x = toEpochMillis(row.bucket);
        const raw = numberOrNull(row[sourceKey]);

        if (!isCounter) {
          return { x, y: raw };
        }

        // First bucket has no predecessor → no rate to compute. We could
        // backfill with the next bucket's diff but that would smear the
        // history; emitting `null` is the same gap Lens shows for the first
        // point of a `counter_rate` series.
        if (idx === 0) {
          return { x, y: null };
        }

        const prev = numberOrNull(hostRows[idx - 1][sourceKey]);
        if (raw === null || prev === null) {
          return { x, y: null };
        }
        const delta = raw - prev;
        if (delta < 0) {
          return { x, y: null };
        }
        const rate = delta / spanSeconds;
        // rx/tx are network counters in *bytes*; the formula multiplies by 8
        // to expose bits/s, matching the legacy Lens formula's `8 *
        // counter_rate(...)` expression.
        return { x, y: metric === 'rx' || metric === 'tx' ? rate * 8 : rate };
      });

      result.push({ host, metric, data });
    }
  }

  return result;
}

function toEpochMillis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
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

// ---------------------------------------------------------------------------
// ECS / fallback path — DSL
// ---------------------------------------------------------------------------

interface DslFetchArgs {
  infraMetricsClient: InfraMetricsClient;
  names: string[];
  metrics: HostsTimeseriesMetric[];
  from: number;
  to: number;
  span: string;
  spanSeconds: number;
  query?: estypes.QueryDslQueryContainer;
  schema: DataSchemaFormat;
}

async function fetchTimeseriesDsl({
  infraMetricsClient,
  names,
  metrics,
  from,
  to,
  span,
  spanSeconds,
  query,
  schema,
}: DslFetchArgs): Promise<GetHostsMetricsTimeseriesResponsePayload> {
  const isSemconv = schema === 'semconv';

  // Per-bucket sub-aggregations for each requested metric. Counter metrics
  // use a `derivative` pipeline aggregation on top of `max` — equivalent to
  // Lens's `counter_rate(max(...))` formula. Non-counter metrics use the
  // appropriate scalar aggregation directly.
  //
  // Some metrics have schema-specific fields/filters; the helper folds those
  // differences here so the top-level handler stays compact.
  const requested = new Set(metrics);
  const subAggs: Record<string, estypes.AggregationsAggregationContainer> = {};

  type AggBundle = Record<string, estypes.AggregationsAggregationContainer>;

  const metricBuilders: Array<{
    metric: HostsTimeseriesMetric;
    build: () => AggBundle;
  }> = [
    {
      metric: 'cpuUsage',
      build: (): AggBundle =>
        isSemconv
          ? {
              cpu_idle: {
                filter: { term: { state: 'idle' } },
                aggs: { value: { avg: { field: 'metrics.system.cpu.utilization' } } },
              },
              cpuUsage: {
                bucket_script: {
                  buckets_path: { idle: 'cpu_idle>value' },
                  // `params.idle` is null when the bucket has no `state:idle`
                  // doc — surface as null so the chart leaves a gap rather
                  // than plotting "1 - null = NaN".
                  script: 'params.idle != null ? 1 - params.idle : null',
                },
              },
            }
          : { cpuUsage: { avg: { field: 'system.cpu.total.norm.pct' } } },
    },
    {
      metric: 'normalizedLoad1m',
      build: (): AggBundle => ({
        load1m: {
          avg: {
            field: isSemconv ? 'metrics.system.cpu.load_average.1m' : 'system.load.1',
          },
        },
        cores: {
          max: {
            field: isSemconv ? 'metrics.system.cpu.logical.count' : 'system.load.cores',
          },
        },
        normalizedLoad1m: {
          bucket_script: {
            buckets_path: { load: 'load1m', cores: 'cores' },
            script: 'params.cores > 0 ? params.load / params.cores : null',
          },
        },
      }),
    },
    {
      metric: 'memoryUsage',
      build: (): AggBundle =>
        isSemconv
          ? {
              mem_used: {
                filter: { term: { state: 'used' } },
                aggs: { value: { avg: { field: 'system.memory.utilization' } } },
              },
              memoryUsage: {
                bucket_script: {
                  buckets_path: { used: 'mem_used>value' },
                  script: 'params.used',
                },
              },
            }
          : { memoryUsage: { avg: { field: 'system.memory.actual.used.pct' } } },
    },
    {
      metric: 'memoryFree',
      build: (): AggBundle =>
        isSemconv
          ? {
              mem_free: {
                filter: { term: { state: 'free' } },
                aggs: { value: { max: { field: 'metrics.system.memory.usage' } } },
              },
              mem_cached: {
                filter: { term: { state: 'cached' } },
                aggs: { value: { max: { field: 'metrics.system.memory.usage' } } },
              },
              mem_slab_un: {
                filter: { term: { state: 'slab_unreclaimable' } },
                aggs: { value: { avg: { field: 'metrics.system.memory.usage' } } },
              },
              mem_slab_re: {
                filter: { term: { state: 'slab_reclaimable' } },
                aggs: { value: { avg: { field: 'metrics.system.memory.usage' } } },
              },
              memoryFree: {
                bucket_script: {
                  buckets_path: {
                    free: 'mem_free>value',
                    cached: 'mem_cached>value',
                    slabUn: 'mem_slab_un>value',
                    slabRe: 'mem_slab_re>value',
                  },
                  script:
                    '(params.free != null && params.cached != null && params.slabUn != null && params.slabRe != null) ? (params.free + params.cached) - (params.slabUn + params.slabRe) : null',
                },
              },
            }
          : {
              total: { max: { field: 'system.memory.total' } },
              used: { avg: { field: 'system.memory.actual.used.bytes' } },
              memoryFree: {
                bucket_script: {
                  buckets_path: { total: 'total', used: 'used' },
                  script:
                    '(params.total != null && params.used != null) ? params.total - params.used : null',
                },
              },
            },
    },
    {
      metric: 'diskSpaceAvailable',
      build: (): AggBundle =>
        isSemconv
          ? {
              disk_free: {
                filter: { term: { state: 'free' } },
                aggs: { value: { avg: { field: 'system.filesystem.usage' } } },
              },
              diskSpaceAvailable: {
                bucket_script: {
                  buckets_path: { free: 'disk_free>value' },
                  script: 'params.free',
                },
              },
            }
          : { diskSpaceAvailable: { avg: { field: 'system.filesystem.free' } } },
    },
    {
      metric: 'diskIORead',
      build: () => buildCounterAgg('diskIORead', isSemconv, 'read', 'operations', 'count'),
    },
    {
      metric: 'diskIOWrite',
      build: () => buildCounterAgg('diskIOWrite', isSemconv, 'write', 'operations', 'count'),
    },
    {
      metric: 'diskReadThroughput',
      build: () => buildCounterAgg('diskReadThroughput', isSemconv, 'read', 'io', 'bytes'),
    },
    {
      metric: 'diskWriteThroughput',
      build: () => buildCounterAgg('diskWriteThroughput', isSemconv, 'write', 'io', 'bytes'),
    },
    {
      metric: 'rx',
      build: () => buildNetworkAgg('rx', isSemconv, 'receive', 'in'),
    },
    {
      metric: 'tx',
      build: () => buildNetworkAgg('tx', isSemconv, 'transmit', 'out'),
    },
  ];

  for (const { metric, build } of metricBuilders) {
    if (requested.has(metric)) {
      Object.assign(subAggs, build());
    }
  }

  const response = await infraMetricsClient.search(
    {
      allow_no_indices: true,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...rangeQuery(from, to),
            ...termsQuery(HOST_NAME_FIELD, ...names),
            ...(query ? [query] : []),
          ],
        },
      },
      aggs: {
        hosts: {
          // `size: names.length` because we already filtered the host set in
          // the top-level `query` — there is no over-allocation possible.
          terms: { field: HOST_NAME_FIELD, size: names.length },
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: span,
                min_doc_count: 0,
                extended_bounds: { min: from, max: to },
              },
              aggs: subAggs,
            },
          },
        },
      },
    },
    'host metrics timeseries (dsl)'
  );

  const hostBuckets =
    (
      response.aggregations as
        | {
            hosts?: { buckets?: Array<{ key: string; timeseries?: { buckets?: BucketAgg[] } }> };
          }
        | undefined
    )?.hosts?.buckets ?? [];

  const series: HostsTimeseriesSeries[] = [];

  for (const host of names) {
    const hostAgg = hostBuckets.find((b) => b.key === host);
    const tsBuckets = hostAgg?.timeseries?.buckets ?? [];

    for (const metric of metrics) {
      const data = tsBuckets.map((b) => ({
        x: typeof b.key === 'number' ? b.key : 0,
        y: extractMetricValue(b, metric, schema, spanSeconds),
      }));
      series.push({ host, metric, data });
    }
  }

  return { entityType: 'host', series, bucketSpan: span };
}

type BucketAgg = {
  key: string | number;
  doc_count: number;
} & Record<string, unknown>;

// `derivative` runs on top of `max(field)` so each bucket carries the per-
// bucket delta. We translate that delta into a per-second rate to match the
// `counter_rate(...) normalized_by_unit=s` formulas Lens emits. ECS counter
// fields are scoped to e.g. `system.diskio.read.count`; semconv reads from
// either `system.disk.operations` or `system.disk.io` depending on whether
// the metric is IOPS or throughput.
function buildCounterAgg(
  alias: string,
  isSemconv: boolean,
  direction: 'read' | 'write',
  semconvField: 'operations' | 'io',
  ecsKind: 'count' | 'bytes'
): Record<string, estypes.AggregationsAggregationContainer> {
  if (isSemconv) {
    return {
      [`${alias}_max`]: {
        filter: { term: { 'attributes.direction': direction } },
        aggs: { value: { max: { field: `system.disk.${semconvField}` } } },
      },
      [`${alias}_rate`]: {
        derivative: { buckets_path: `${alias}_max>value` },
      },
    };
  }

  // ECS counter fields are direction-scoped — the field name itself encodes
  // the direction so no `filter` sub-agg is needed.
  const field = `system.diskio.${direction}.${ecsKind}`;
  return {
    [`${alias}_max`]: { max: { field } },
    [`${alias}_rate`]: { derivative: { buckets_path: `${alias}_max` } },
  };
}

function buildNetworkAgg(
  alias: 'rx' | 'tx',
  isSemconv: boolean,
  direction: 'receive' | 'transmit',
  ecsLeg: 'in' | 'out'
): Record<string, estypes.AggregationsAggregationContainer> {
  if (isSemconv) {
    return {
      [`${alias}_max`]: {
        filter: { term: { 'attributes.direction': direction } },
        aggs: { value: { max: { field: 'metrics.system.network.io' } } },
      },
      [`${alias}_rate`]: {
        derivative: { buckets_path: `${alias}_max>value` },
      },
    };
  }

  return {
    [`${alias}_max`]: { max: { field: `system.network.${ecsLeg}.bytes` } },
    [`${alias}_rate`]: { derivative: { buckets_path: `${alias}_max` } },
  };
}

// `derivative` emits the raw delta; we normalise to "per second" by dividing
// by the bucket span. The `* 8` factor for network bytes → bits is applied
// here so both the ES|QL and DSL paths hand the client comparable values.
function extractMetricValue(
  bucket: BucketAgg,
  metric: HostsTimeseriesMetric,
  schema: DataSchemaFormat,
  spanSeconds: number
): number | null {
  if (COUNTER_METRICS.has(metric)) {
    const rate = bucket[`${metric}_rate`] as { value?: number | null } | undefined;
    const delta = numberOrNull(rate?.value);
    if (delta === null || delta < 0) return null;
    const perSecond = delta / spanSeconds;
    return metric === 'rx' || metric === 'tx' ? perSecond * 8 : perSecond;
  }

  // Non-counter metrics either expose `.value` (filter+sub-agg or
  // bucket_script) or sit at the top level under their alias. Read both
  // shapes here so the rest of the handler stays uniform.
  const node = bucket[metric] as { value?: number | null } | undefined;
  return numberOrNull(node?.value);
}
