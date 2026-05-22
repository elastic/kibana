/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P10 — Phase B handler. Bounded to ≤ MAX_HOSTS_PER_METRICS_REQUEST host
// names (the visible page). Returns per-host metadata (`host.os.name` / `cloud.provider`
// / `host.ip`), the requested metric values, and `hasSystemMetrics`.
//
// Schema split:
// - semconv → single ES|QL `TS` query combining `LAST_OVER_TIME` for metadata
//   with `*_OVER_TIME` / `RATE` expressions for metrics. One round-trip for
//   the whole page; no per-host fan-out. Metrics whose snapshot inventory
//   shape we haven't ported to ES|QL yet return `null` (rendered as "–" by
//   the table) and are tracked as a follow-up.
// - ecs → DSL `terms({ size: names.length }) + top_hits` for metadata + the
//   existing inventory-model aggregations. Same query shape as today's
//   `getAllHosts` but with the bucket cardinality clamped to ≤ 20 by the
//   `names` filter, so per-bucket sub-agg cost is dwarfed by what it was at
//   `limit=500`.

import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { TimeRangeMetadata } from '@kbn/apm-data-access-plugin/common';
import { BasicMetricValueRT } from '@kbn/metrics-data-access-plugin/server';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import {
  DEFAULT_SCHEMA,
  HOST_NAME_FIELD,
  MAX_HOSTS_PER_METRICS_REQUEST,
} from '../../../../../common/constants';
import type {
  GetHostsMetricsResponsePayload,
  HostsMetricsItem,
  InfraEntityMetadata,
  InfraEntityMetricType,
} from '../../../../../common/http_api/infra';
import type { ApmDataAccessServicesWrapper } from '../../../../lib/helpers/get_apm_data_access_client';
import type { InfraMetricsClient } from '../../../../lib/helpers/get_infra_metrics_client';
import { getDocumentsFilter, getInventoryModelAggregations } from '../helpers/query';

interface GetHostsMetricsParameters {
  infraMetricsClient: InfraMetricsClient;
  apmDataAccessServices?: ApmDataAccessServicesWrapper;
  query?: estypes.QueryDslQueryContainer;
  names: string[];
  metrics: InfraEntityMetricType[];
  from: number;
  to: number;
  schema?: DataSchemaFormat;
  // P12 PoC toggle — when `true`, skip the semconv ES|QL fast path and use
  // the DSL fallback regardless of schema. The fallback already supports
  // both schemas, so this only changes Phase B's evaluation engine, not
  // its result.
  forceDsl?: boolean;
}

export async function getHostsMetrics({
  infraMetricsClient,
  apmDataAccessServices,
  query,
  names,
  metrics,
  from,
  to,
  schema = DEFAULT_SCHEMA,
  forceDsl = false,
}: GetHostsMetricsParameters): Promise<GetHostsMetricsResponsePayload> {
  if (names.length === 0) {
    return { entityType: 'host', nodes: [] };
  }

  // Defence in depth — the route validator already rejects requests with
  // `names.length > MAX_HOSTS_PER_METRICS_REQUEST`, but the page-bounded
  // invariant is load-bearing for the cost model so we re-clamp here.
  // Phase B's query cost is linear in `names.length`: the client decides
  // the page size via the EuiBasicTable "rows per page" selector
  // (`HOSTS_TABLE_PAGE_SIZE_OPTIONS`), the request carries exactly that
  // many names, and ES does exactly that much work — no implicit 20-host
  // floor.
  const boundedNames = names.slice(0, MAX_HOSTS_PER_METRICS_REQUEST);

  const apmDocumentSources = await apmDataAccessServices?.getDocumentSources({
    start: from,
    end: to,
  });

  if (schema === 'semconv' && !forceDsl) {
    try {
      return await fetchSemconvHostsMetrics({
        infraMetricsClient,
        from,
        to,
        names: boundedNames,
        metrics,
        query,
      });
    } catch {
      // ES|QL primitive gap (missing field, unsupported function on the
      // running stack, etc.) → fall through to DSL so the page still
      // renders. The DSL path always works because it's the legacy shape
      // bounded to the page.
    }
  }

  return fetchHostsMetricsDsl({
    infraMetricsClient,
    apmDataAccessServices,
    apmDocumentSources,
    from,
    to,
    names: boundedNames,
    metrics,
    schema,
  });
}

// ---------------------------------------------------------------------------
// Semconv path — ES|QL `TS`
// ---------------------------------------------------------------------------

interface SemconvFetchArgs {
  infraMetricsClient: InfraMetricsClient;
  from: number;
  to: number;
  names: string[];
  metrics: InfraEntityMetricType[];
  query?: estypes.QueryDslQueryContainer;
}

async function fetchSemconvHostsMetrics({
  infraMetricsClient,
  from,
  to,
  names,
  metrics,
  query,
}: SemconvFetchArgs): Promise<GetHostsMetricsResponsePayload> {
  // Build one combined ES|QL `FROM` query that returns metadata + every
  // requested metric in a single tabular row per host.
  //
  // Source choice: `FROM` (not `TS`). `TS` is the natural fit for the
  // per-time-series `*_OVER_TIME` / `RATE` semantics but the engine
  // currently rejects filter-in-aggregation expressions inside a `TS`
  // pipeline ("unexpected inline filter in time-series aggregation"). The
  // semconv inventory model needs per-state filters for cpuV2 / memory /
  // memoryFree / diskSpaceUsage, so `FROM` + filter-in-agg is the only
  // shape that ports the whole inventory into a single ES|QL query today.
  // The TSDS dimension layout that backs the data stream still pays off
  // (per-`_tsid` shard routing, faster scans) — we just can't use the
  // `_OVER_TIME` family on top of it.

  const buildExpressions = computeSemconvIntermediateExpressions(metrics);

  // Metadata via `VALUES(...)` — returns the distinct values seen for the
  // field per host. For TSDS-dimension fields these collapse to a single
  // value per host; for low-cardinality non-dimension fields we take the
  // first via `MV_FIRST` post-aggregation. `host.ip` is an `ip` type, not
  // a TSDS dimension in the synthtrace template, so `VALUES` returns it
  // as-is (still single-valued per host in practice).
  const metadataExpressions = [
    `  os = VALUES(host.os.name)`,
    `  cloud = VALUES(cloud.provider)`,
    `  ip = VALUES(host.ip)`,
  ];

  const allStatsExpressions = [...metadataExpressions, ...buildExpressions.statsClauses];
  const statsClause = allStatsExpressions.join(',\n');

  // Inline the page's names into a literal `IN (…)` list. At ≤ 20 names
  // this is ~1 KB; the alternative `?names` array param requires the
  // engine to support array binding which isn't documented as stable yet.
  const nameList = names.map((n) => JSON.stringify(n)).join(', ');

  // `EVAL` post-processing recombines the intermediate columns into the
  // final per-host metric values (cpuV2 = 1 - cpu_idle, diskSpaceUsage =
  // 1 - free/all, etc.). Metrics whose intermediate columns and EVAL
  // expression are the same (e.g. `load`) skip this step.
  const evalClause = buildExpressions.evalClauses.length
    ? `\n| EVAL ${buildExpressions.evalClauses.join(', ')}`
    : '';

  const keepClause = [
    HOST_NAME_FIELD,
    'os',
    'cloud',
    'ip',
    ...metrics.map((m) => esqlAlias(m)),
  ].join(', ');

  const esqlQuery = `FROM metrics-hostmetricsreceiver.otel-*
| WHERE ${HOST_NAME_FIELD} IN (${nameList})
| STATS
${statsClause}
  BY ${HOST_NAME_FIELD}${evalClause}
| KEEP ${keepClause}`;

  const filterClauses: estypes.QueryDslQueryContainer[] = [
    ...rangeQuery(from, to),
    ...(query ? [query] : []),
  ];

  type SemconvRow = {
    [HOST_NAME_FIELD]: string;
    os?: string | null;
    cloud?: string | null;
    ip?: string | null;
  } & Record<string, unknown>;

  const { rows } = await infraMetricsClient.esql<SemconvRow>(
    {
      query: esqlQuery,
      filter: filterClauses.length ? { bool: { filter: filterClauses } } : undefined,
    },
    `phase B metrics (esql)`
  );

  // Index rows by name so we can keep the response in the requested order
  // (matches the table's page order) and emit empty placeholders for hosts
  // ES returned no data for (e.g. APM-only on the visible page).
  const rowByName = new Map<string, SemconvRow>();
  for (const r of rows) {
    const n = r[HOST_NAME_FIELD];
    if (typeof n === 'string') rowByName.set(n, r);
  }

  const nodes: HostsMetricsItem[] = names.map((name) => {
    const row = rowByName.get(name);

    const metadata: InfraEntityMetadata[] = [
      { name: 'host.os.name', value: stringOrNull(row?.os) },
      { name: 'cloud.provider', value: stringOrNull(row?.cloud) },
      { name: 'host.ip', value: stringOrNull(row?.ip) },
    ];

    return {
      name,
      metadata,
      metrics: metrics.map((metric) => ({
        name: metric,
        value: numberOrNull(row?.[esqlAlias(metric)]),
      })),
      // Phase B is scoped to `metrics-hostmetricsreceiver.otel-*`, so a row
      // existing here is the definition of "has system metrics" for the
      // semconv schema. APM-only hosts that weren't in the index get no row
      // and naturally land as `false`.
      hasSystemMetrics: row !== undefined,
    };
  });

  return { entityType: 'host', nodes };
}

// `cpuV2` / `rxV2` etc. aren't valid ES|QL identifiers (dotted ok, but the
// caller treats them as bare column names later). Keep the alias as the
// metric name when valid, else mangle.
function esqlAlias(metric: InfraEntityMetricType): string {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(metric) ? metric : `metric_${metric}`;
}

// Translate the requested metrics into:
//   (a) one or more intermediate `STATS` columns (with filter-in-agg where
//       a per-state slice is needed) — produced once per metric and reused
//       across the EVAL stage,
//   (b) a single per-metric `EVAL` clause that recombines the intermediates
//       into the user-facing column (`cpuV2 = 1 - cpu_idle`, etc.).
//
// Field names that include numeric-leading segments (e.g.
// `metrics.system.cpu.load_average.1m`) must be backtick-quoted because
// the ES|QL parser otherwise interprets `.1m` as a time literal and
// rejects the expression.
function computeSemconvIntermediateExpressions(metrics: InfraEntityMetricType[]): {
  statsClauses: string[];
  evalClauses: string[];
} {
  const statsByKey = new Map<string, string>();
  const evalClauses: string[] = [];

  const addStat = (key: string, expression: string) => {
    if (!statsByKey.has(key)) {
      statsByKey.set(key, `  ${key} = ${expression}`);
    }
  };

  for (const metric of metrics) {
    const alias = esqlAlias(metric);
    switch (metric) {
      case 'cpuV2':
        addStat('cpu_idle', 'AVG(metrics.system.cpu.utilization) WHERE state == "idle"');
        evalClauses.push(`${alias} = 1 - cpu_idle`);
        break;
      case 'memory':
        addStat('mem_used', 'AVG(system.memory.utilization) WHERE state == "used"');
        evalClauses.push(`${alias} = mem_used`);
        break;
      case 'memoryFree':
        addStat('mem_cached', 'AVG(system.memory.usage) WHERE state == "cached"');
        addStat('mem_free', 'AVG(system.memory.usage) WHERE state == "free"');
        addStat('mem_slab_unrec', 'AVG(system.memory.usage) WHERE state == "slab_unreclaimable"');
        addStat('mem_slab_rec', 'AVG(system.memory.usage) WHERE state == "slab_reclaimable"');
        evalClauses.push(`${alias} = (mem_cached + mem_free) - (mem_slab_unrec + mem_slab_rec)`);
        break;
      case 'diskSpaceUsage':
        addStat('disk_free', 'SUM(metrics.system.filesystem.usage) WHERE state == "free"');
        addStat('disk_total', 'SUM(metrics.system.filesystem.usage)');
        evalClauses.push(`${alias} = CASE(disk_total > 0, 1 - disk_free / disk_total, 0)`);
        break;
      case 'normalizedLoad1m':
        addStat('load1m', 'AVG(`metrics.system.cpu.load_average.1m`)');
        addStat('cores', 'MAX(metrics.system.cpu.logical.count)');
        evalClauses.push(`${alias} = load1m / cores`);
        break;
      case 'rxV2':
        addStat('rx_io', 'AVG(metrics.system.network.io) WHERE direction == "receive"');
        evalClauses.push(`${alias} = rx_io`);
        break;
      case 'txV2':
        addStat('tx_io', 'AVG(metrics.system.network.io) WHERE direction == "transmit"');
        evalClauses.push(`${alias} = tx_io`);
        break;
      // Legacy ECS-only metrics — under semconv they have no canonical
      // equivalent. Emit a typed NULL so the column still exists in the
      // KEEP projection (the table renders it as "–").
      case 'cpu':
      case 'rx':
      case 'tx':
      default:
        evalClauses.push(`${alias} = TO_DOUBLE(NULL)`);
        break;
    }
  }

  return {
    statsClauses: Array.from(statsByKey.values()),
    evalClauses,
  };
}

// Kept for the existing unit test which asserts the per-metric expression
// fragments. Delegates to the new builder so the two stay in sync.
function buildSemconvMetricExpression(metric: InfraEntityMetricType): string {
  const { statsClauses, evalClauses } = computeSemconvIntermediateExpressions([metric]);
  return [...statsClauses, ...evalClauses].join(' | ');
}

function stringOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    const first = v.find((x) => typeof x === 'string');
    return typeof first === 'string' ? first : null;
  }
  return null;
}

function numberOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// ECS / fallback path — DSL
// ---------------------------------------------------------------------------

interface DslFetchArgs {
  infraMetricsClient: InfraMetricsClient;
  apmDataAccessServices?: ApmDataAccessServicesWrapper;
  apmDocumentSources?: TimeRangeMetadata['sources'];
  from: number;
  to: number;
  names: string[];
  metrics: InfraEntityMetricType[];
  schema: DataSchemaFormat;
}

async function fetchHostsMetricsDsl({
  infraMetricsClient,
  apmDataAccessServices,
  apmDocumentSources,
  from,
  to,
  names,
  metrics,
  schema,
}: DslFetchArgs): Promise<GetHostsMetricsResponsePayload> {
  const inventoryModel = findInventoryModel('host');

  const metricAggregations = await getInventoryModelAggregations('host', metrics, schema);

  const documentsFilter = await getDocumentsFilter({
    apmDataAccessServices,
    apmDocumentSources,
    from,
    to,
    schema,
  });

  const response = await infraMetricsClient.search(
    {
      allow_no_indices: true,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [...termsQuery(HOST_NAME_FIELD, ...names), ...rangeQuery(from, to)],
          should: [...documentsFilter],
        },
      },
      aggs: {
        monitoredHosts: {
          filter: { bool: { filter: [...(inventoryModel.nodeFilter?.({ schema }) ?? [])] } },
          aggs: {
            names: {
              terms: {
                field: HOST_NAME_FIELD,
                size: names.length,
                order: { _key: 'asc' },
              },
            },
          },
        },
        allHostMetrics: {
          terms: {
            field: HOST_NAME_FIELD,
            size: names.length,
            order: { _key: 'asc' },
          },
          aggs: {
            ...(metricAggregations as Record<string, estypes.AggregationsAggregationContainer>),
            // Page-bounded `top_hits` for metadata — P12-shaped. At ≤ 20
            // buckets the single `_source` fetch per bucket is cheaper than
            // 3 × `filter+top_metrics` and returns the same "latest doc per
            // host" semantic.
            metadataLatest: {
              top_hits: {
                size: 1,
                _source: { includes: ['host.os.name', 'cloud.provider', 'host.ip'] },
                sort: [{ '@timestamp': { order: 'desc' } }],
              },
            },
          },
        },
      },
    },
    `phase B metrics (dsl, schema=${schema})`
  );

  const systemIntegrationHosts = new Set(
    response.aggregations?.monitoredHosts?.names?.buckets?.map((p) => p.key as string) ?? []
  );

  const bucketByName = new Map<string, Record<string, unknown>>();
  for (const bucket of response.aggregations?.allHostMetrics?.buckets ?? []) {
    const key = (bucket as Record<string, unknown>).key as string;
    bucketByName.set(key, bucket as Record<string, unknown>);
  }

  const nodes: HostsMetricsItem[] = names.map((name) => {
    const bucket = bucketByName.get(name);
    const latestSource = extractLatestSource(bucket);

    return {
      name,
      metadata: [
        {
          name: 'host.os.name',
          value: stringOrNull(latestSource?.host?.os?.name),
        },
        {
          name: 'cloud.provider',
          value: stringOrNull(latestSource?.cloud?.provider),
        },
        {
          name: 'host.ip',
          value: stringOrNull(latestSource?.host?.ip),
        },
      ] as InfraEntityMetadata[],
      metrics: metrics.map((metric) => ({
        name: metric,
        value: bucket ? getMetricValue(bucket[metric]) ?? null : null,
      })),
      hasSystemMetrics: systemIntegrationHosts.has(name),
    } satisfies HostsMetricsItem;
  });

  return { entityType: 'host', nodes };
}

interface LatestSource {
  host?: { os?: { name?: unknown }; ip?: unknown };
  cloud?: { provider?: unknown };
}

function extractLatestSource(bucket?: Record<string, unknown>): LatestSource | undefined {
  if (!bucket) return undefined;
  const metadataLatest = bucket.metadataLatest as
    | { hits?: { hits?: Array<{ _source?: LatestSource }> } }
    | undefined;
  return metadataLatest?.hits?.hits?.[0]?._source;
}

function getMetricValue(valueObject: unknown): number | null {
  if (BasicMetricValueRT.is(valueObject)) {
    return valueObject.value;
  }
  return (valueObject as number | null) ?? null;
}

// Used in tests; export here so we don't accidentally drift between the two
// schema paths.
export const __testing__ = { buildSemconvMetricExpression, esqlAlias };
