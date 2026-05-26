/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P10 — Phase A handler. Cheap, all-hosts (up to `limit`) ranked name list +
// alerts count for the visible page slice. No metric sub-aggregations, no
// metadata enrichment. Server is the source of truth for sort and pagination.
//
// Schema split:
// - semconv → ES|QL `TS` source command (TSDS-native). Sort-by-name uses
//   `STATS BY host.name | SORT host.name`; sort-by-metric uses an extra
//   `*_OVER_TIME` rank expression. Metadata exclusion (e.g. `must_not
//   cloud.provider == "aws"`) is passed to ES via the request's `filter`
//   field — correct per-host for fields that are TSDS dimensions
//   (`cloud.provider`, `host.os.name`, `host.ip` from the OTel
//   hostmetricsreceiver pipeline) and acceptably approximate otherwise.
// - ecs → DSL `terms` with optional `bucket_sort` on a metric sub-agg
//   (metricbeat-* isn't TSDS in customer setups, so `TS` isn't safe).
//
// APM-only hosts come from `apmDataAccessServices.getHostNames` (DSL) and
// are unioned at the tail; they only become visible when there's headroom
// in the limit/page. Alerts are scoped to infra-bearing names on the
// visible page only (P5.6).

import { rangeQuery } from '@kbn/observability-plugin/server';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import type {
  GetHostsListRequestBodyPayload,
  GetHostsListResponsePayload,
  HostsListItem,
  HostsListSort,
  HostsListPage,
  InfraEntityMetricType,
} from '../../../../../common/http_api/infra';
import { DEFAULT_SCHEMA, HOST_NAME_FIELD } from '../../../../../common/constants';
import type { ApmDataAccessServicesWrapper } from '../../../../lib/helpers/get_apm_data_access_client';
import type { InfraAlertsClient } from '../../../../lib/helpers/get_infra_alerts_client';
import type { InfraMetricsClient } from '../../../../lib/helpers/get_infra_metrics_client';
import { getApmHostNames } from './get_apm_hosts';
import { getHostsAlertsCount } from './get_hosts_alerts_count';
import { assertQueryStructure } from '../utils';

const DEFAULT_SORT: HostsListSort = { field: 'host.name', direction: 'asc' };
const DEFAULT_PAGE: HostsListPage = { from: 0, size: 20 };

interface GetHostsListParameters
  extends Omit<GetHostsListRequestBodyPayload, 'query' | 'sort' | 'page'> {
  query?: estypes.QueryDslQueryContainer;
  sort?: HostsListSort;
  page?: HostsListPage;
  infraMetricsClient: InfraMetricsClient;
  alertsClient: InfraAlertsClient;
  apmDataAccessServices?: ApmDataAccessServicesWrapper;
  // P5.6 PoC toggle — when `true`, scope the alerts agg to the full Phase A
  // result (up to `limit`) instead of the visible page. Bypassing the
  // page-bound scope lets reviewers measure how much of Phase A's wall time
  // P5.6 actually saved on real fleets.
  skipAlertScoping?: boolean;
}

export async function getHostsList({
  infraMetricsClient,
  apmDataAccessServices,
  alertsClient,
  query,
  from,
  to,
  limit,
  schema = DEFAULT_SCHEMA,
  skipAlertScoping = false,
  sort = DEFAULT_SORT,
  page = DEFAULT_PAGE,
}: GetHostsListParameters): Promise<GetHostsListResponsePayload> {
  assertQueryStructure(query);

  const apmDocumentSources = await apmDataAccessServices?.getDocumentSources({
    start: from,
    end: to,
  });

  // Phase A.1 + A.2 in parallel: infra ranking + APM-only names.
  const [infraHostNames, apmHostNames] = await Promise.all([
    schema === 'semconv'
      ? rankInfraHostsEsql({ infraMetricsClient, from, to, limit, query, sort, schema })
      : rankInfraHostsDsl({ infraMetricsClient, from, to, limit, query, sort, schema }),
    apmDataAccessServices && apmDocumentSources
      ? getApmHostNames({
          apmDataAccessServices,
          apmDocumentSources,
          query,
          from,
          to,
          limit,
          schema,
        })
      : Promise.resolve<string[]>([]),
  ]);

  // Union, dedup, preserve ranking. APM-only names appended at the tail and
  // sorted by name so the page slice is deterministic even when ranking by
  // a metric (APM-only hosts have no metric value, so they belong at the end
  // for desc and at the start for asc — but that's a future polish; PoC
  // keeps them at the tail).
  //
  // The cap to `limit` is critical: both `rankInfraHostsEsql` and
  // `rankInfraHostsDsl` honour `limit` themselves, but `apmHostNames` is
  // fetched independently and can overflow when an APM-only host isn't
  // already in the infra ranking. Without this slice the merged list
  // grows past the user-selected limit (e.g. 1001 hosts when the limit is
  // 1000) and downstream consumers — KPI/metrics-timeseries endpoints
  // that scope by `allHostNames` — would silently scan more hosts than
  // the table is paginating across.
  const infraNamesInOrder = infraHostNames;
  const infraSet = new Set(infraNamesInOrder);
  const apmOnly = apmHostNames.filter((n) => !infraSet.has(n)).sort();
  const merged = [...infraNamesInOrder, ...apmOnly].slice(0, limit);
  const totalHosts = merged.length;

  // Page slice (Kibana-side because ES|QL `TS` has no OFFSET).
  const pageSlice = merged.slice(page.from, page.from + page.size);

  // P5.6 — alerts scoped to infra-bearing names on the visible page.
  // APM-only hosts can't bucket into the alerts query the same way, and
  // bounding to the page keeps the alerts agg O(20) by construction.
  //
  // PoC: when `skipAlertScoping` is `true`, widen back to the whole Phase A
  // result. The page still only displays counts for visible hosts (we look
  // them up by name from the response below) but ES does the work for the
  // full fleet, replicating the pre-P5.6 cost.
  const alertScopeNames = skipAlertScoping
    ? infraNamesInOrder
    : pageSlice.filter((n) => infraSet.has(n));

  const alertsResponse = alertScopeNames.length
    ? await getHostsAlertsCount({
        alertsClient,
        hostNames: alertScopeNames,
        from,
        to,
        limit: alertScopeNames.length,
      })
    : [];

  const alertsByName = new Map(alertsResponse.map((a) => [a.name, a.alertsCount]));

  const nodes: HostsListItem[] = pageSlice.map((name) => {
    const alertsCount = alertsByName.get(name);
    return alertsCount !== undefined ? { name, alertsCount } : { name };
  });

  return {
    entityType: 'host',
    nodes,
    totalHosts,
    // Full ranked list (≤ limit). Consumers downstream — notably the new
    // KPI endpoint (P15b) — need exactly the same set the table is
    // paginating across, not just the visible page slice. Returning it
    // here lets the client pass it through verbatim without re-running
    // the rank query.
    allHostNames: merged,
  };
}

interface RankInfraHostsParams {
  infraMetricsClient: InfraMetricsClient;
  from: number;
  to: number;
  limit: number;
  query?: estypes.QueryDslQueryContainer;
  sort: HostsListSort;
  schema: DataSchemaFormat;
}

// Semconv path — ES|QL `TS`. Returns up to `limit` host names sorted by the
// requested field. Falls back to DSL silently if ES|QL execution fails, so a
// PoC misconfiguration on a customer cluster doesn't break the page.
async function rankInfraHostsEsql({
  infraMetricsClient,
  from,
  to,
  limit,
  query,
  sort,
  schema,
}: RankInfraHostsParams): Promise<string[]> {
  const inventoryModel = findInventoryModel('host');
  const nodeFilter = inventoryModel.nodeFilter?.({ schema }) ?? [];

  // Combine node filter, user query, and time range as the `filter` argument
  // of esql.query. ES applies it before the `TS` pipeline runs.
  const filterClauses: estypes.QueryDslQueryContainer[] = [
    ...rangeQuery(from, to),
    ...nodeFilter,
    ...(query ? [query] : []),
  ];

  const sortByName = sort.field === 'host.name';

  // For sort-by-name we omit any metric rank computation entirely — just
  // bucket by host and sort lexicographically. For sort-by-metric we add a
  // single rank column derived from the inventory model.
  // Source choice:
  // - Sort-by-name uses `TS` because the source command is dramatically
  //   faster than `FROM` for that shape (per-`_tsid` shard routing collapses
  //   each time series down to a single row before the `STATS BY host.name`
  //   bucketing). Verified ~120 ms for 84k docs across 50 hosts in the
  //   TSDS fixture.
  // - Sort-by-metric uses `FROM` because the inventory model's snapshot
  //   formulas (cpuV2, memory, …) need per-state filters inside the
  //   aggregation, and ES|QL currently rejects filter-in-aggregation
  //   expressions inside a `TS` pipeline ("unexpected inline filter in
  //   time-series aggregation"). The TSDS dimension layout still helps
  //   `FROM` via the underlying `_tsid` shard routing — we just can't use
  //   the `_OVER_TIME` family on top of it.
  const esqlQuery = sortByName
    ? `TS metrics-hostmetricsreceiver.otel-*
| STATS BY ${HOST_NAME_FIELD}
| SORT ${HOST_NAME_FIELD} ${sort.direction.toUpperCase()}
| LIMIT ${limit}`
    : `FROM metrics-hostmetricsreceiver.otel-*
| STATS rank = ${buildMetricRankExpression(
        sort.field as InfraEntityMetricType
      )} BY ${HOST_NAME_FIELD}
| SORT rank ${sort.direction.toUpperCase()} NULLS LAST, ${HOST_NAME_FIELD} ASC
| LIMIT ${limit}`;

  try {
    const { rows } = await infraMetricsClient.esql<{ 'host.name': string }>(
      {
        query: esqlQuery,
        filter: filterClauses.length ? { bool: { filter: filterClauses } } : undefined,
      },
      `phase A rank infra hosts (esql, sort=${sort.field})`
    );

    return rows
      .map((r) => r['host.name'])
      .filter((name): name is string => typeof name === 'string');
  } catch {
    // PoC safety net — fall back to DSL ranking on any ES|QL error so a
    // primitive gap (missing TSDS dimension, unsupported field, etc.)
    // degrades to a working page rather than a 500.
    return rankInfraHostsDsl({ infraMetricsClient, from, to, limit, query, sort, schema });
  }
}

// ECS path (and semconv fallback). Same surface as the existing
// `getFilteredHostNames` but with optional `bucket_sort` over a single
// metric sub-agg when sorting by a metric column. Without `bucket_sort`
// this is byte-for-byte equivalent to today's filtered-names query.
async function rankInfraHostsDsl({
  infraMetricsClient,
  from,
  to,
  limit,
  query,
  sort,
  schema,
}: RankInfraHostsParams): Promise<string[]> {
  const inventoryModel = findInventoryModel('host');
  const filter: estypes.QueryDslQueryContainer[] = [
    ...rangeQuery(from, to),
    ...(inventoryModel.nodeFilter?.({ schema }) ?? []),
    ...(query ? [query] : []),
  ];

  // Always sort the terms agg lexicographically; if a metric sort is
  // requested, layer a `bucket_sort` on top of a single metric sub-agg.
  const sortByName = sort.field === 'host.name';

  const rankSubAgg = sortByName
    ? undefined
    : buildDslRankSubAgg(sort.field as InfraEntityMetricType, schema);
  const hasRankAgg = rankSubAgg && Object.keys(rankSubAgg).length > 0;

  // When ranking by metric, set `order: { rank: dir }` directly on the
  // terms agg. This is more robust than layering `bucket_sort` because
  // terms with a sub-agg order falls back to doc_count ordering when the
  // sort key is null for every bucket (the case when the DSL field name
  // doesn't match the underlying data shape — synthtrace's `metrics.`
  // prefix, CCS mismatches, etc.). `bucket_sort` would drop those buckets
  // entirely and the UI would show an empty table.
  const order = sortByName
    ? { _key: sort.direction }
    : hasRankAgg
    ? { rank: sort.direction }
    : { _key: 'asc' as const };

  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {
    rankedHosts: {
      terms: {
        field: HOST_NAME_FIELD,
        size: limit,
        order,
      },
      ...(hasRankAgg ? { aggs: rankSubAgg } : {}),
    },
  };

  const response = await infraMetricsClient.search(
    {
      allow_no_indices: true,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      query: { bool: { filter } },
      aggs,
    },
    `phase A rank infra hosts (dsl, sort=${sort.field})`
  );

  const rankedAgg = response.aggregations?.rankedHosts as
    | { buckets?: Array<{ key: string }> }
    | undefined;
  const buckets = rankedAgg?.buckets ?? [];
  return buckets.map((b) => b.key);
}

// Cheap, schema-agnostic field → DSL rank sub-agg map. Falls back to lex
// sort (no sub-agg) for metrics we haven't mapped yet — the bucket_sort
// then degrades to a no-op and the terms agg's natural `_key` order wins.
function buildDslRankSubAgg(
  metric: InfraEntityMetricType,
  schema: DataSchemaFormat
): Record<string, estypes.AggregationsAggregationContainer> {
  if (schema === 'ecs') {
    switch (metric) {
      case 'cpuV2':
        return { rank: { avg: { field: 'system.cpu.total.norm.pct' } } };
      case 'memory':
        return { rank: { avg: { field: 'system.memory.actual.used.pct' } } };
      case 'memoryFree':
        return { rank: { avg: { field: 'system.memory.actual.free' } } };
      case 'normalizedLoad1m':
        return { rank: { avg: { field: 'system.load.1' } } };
      default:
        return {};
    }
  }
  // semconv — only mapped here for the DSL fallback path; the primary
  // semconv ranking goes through ES|QL above.
  switch (metric) {
    case 'cpuV2':
      // Approximate, single sub-agg. Real value is `1 - sum(state=idle).avg`
      // which we don't replicate here; bucket_sort would need that semantic
      // to match `getAllHosts`. PoC fallback is "rank by mean utilization
      // across all states" which is monotonic with the real metric for the
      // overwhelming majority of fleets.
      return { rank: { avg: { field: 'system.cpu.utilization' } } };
    case 'memory':
      return { rank: { avg: { field: 'system.memory.utilization' } } };
    case 'memoryFree':
      // Use the inverse of utilization as a proxy ranker so the sub-agg
      // shape stays uniform across metrics. Real value is computed in
      // Phase B from `system.memory.usage WHERE state="free"`; the DSL
      // fallback here only needs to be monotonic with that.
      return { rank: { avg: { field: 'system.memory.utilization' } } };
    case 'normalizedLoad1m':
      return { rank: { avg: { field: 'system.cpu.load_average.1m' } } };
    default:
      return {};
  }
}

// Field → ES|QL `FROM` rank expression for semconv. Single column per
// metric, computed once across the requested window via filter-in-agg so
// the SORT key is meaningful. Field names with numeric-leading segments
// (`metrics.system.cpu.load_average.1m`) are backtick-quoted to keep the
// parser from interpreting `.1m` as a time literal.
function buildMetricRankExpression(metric: InfraEntityMetricType): string {
  switch (metric) {
    case 'cpuV2':
      // 1 - mean(idle) of metrics.system.cpu.utilization (per the snapshot
      // inventory model). Highest-cpu hosts get the largest rank value.
      return '1 - AVG(metrics.system.cpu.utilization) WHERE state == "idle"';
    case 'memory':
      return 'AVG(system.memory.utilization) WHERE state == "used"';
    case 'memoryFree':
      // Free bytes per host. The Phase B "memoryFree" formula reads
      // `system.memory.usage WHERE state=="free"` aggregated as a SUM
      // (one document per host carries the per-state bytes); for ranking
      // we want a single scalar per host that is monotonic with that, so
      // AVG works (every per-state slice contributes a constant value
      // within the window).
      return 'AVG(system.memory.usage) WHERE state == "free"';
    case 'normalizedLoad1m':
      // load1m / cores — single divisor per host; expressed as ratio of
      // averages, monotonically equivalent for ranking purposes.
      return 'AVG(`metrics.system.cpu.load_average.1m`) / MAX(metrics.system.cpu.logical.count)';
    case 'diskSpaceUsage':
      // Approximation for ranking only — Phase B computes the precise
      // 1 - free/total value. Ranking by mean filesystem.usage is
      // monotonic-equivalent for the overwhelming majority of fleets.
      return 'AVG(metrics.system.filesystem.usage)';
    case 'rxV2':
      return 'AVG(metrics.system.network.io) WHERE direction == "receive"';
    case 'txV2':
      return 'AVG(metrics.system.network.io) WHERE direction == "transmit"';
    default:
      // Unknown / unmapped metric — emit a constant so the rank column
      // exists but contributes nothing; the SORT then falls back to the
      // secondary `host.name ASC` clause.
      return '0';
  }
}
