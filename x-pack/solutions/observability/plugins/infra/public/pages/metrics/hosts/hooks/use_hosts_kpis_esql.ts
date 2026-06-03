/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Client-side KPI fetch over the data plugin's ES|QL search strategy.
//
// Computes the four headline scalars in a single ES|QL request issued straight
// from the browser via `data.search` — no custom server route. Two query
// variants are picked from `searchCriteria.preferredSchema` (semconv OTel vs
// ECS); the formulas mirror `metrics_data_access/.../formulas/{cpu,memory,disk}.ts`.
// Both variants read from the configured metrics indices (the resolved metrics
// data view, same as the table/count) and scope to the right docs via the
// inventory model's schema `nodeFilter` — no hardcoded index pattern.
//
// Each variant aggregates per `host.name`, keeps the first `limit` hosts
// (`SORT host.name ASC | LIMIT`, matching the table's `terms` host resolution),
// then averages across those hosts. The result is therefore a genuine
// "average of min(hostCount, limit) hosts", consistent with the tile subtitle
// and the host set the table renders. The query fires from the shared
// `useHostsPageReady` gate in parallel with the `/host` request, so KPI
// latency is `max(/host, kpis)`, not the sum.

import { useMemo } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { HOST_NAME_FIELD, TIMESTAMP_FIELD } from '../../../../../common/constants';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useMetricsDataViewContext } from '../../../../containers/metrics_source';
import { useUnifiedSearchContext } from './use_unified_search';
import { useHostsPageReady } from './use_hosts_page_ready';
import { useReadyMark } from './use_ready_mark';

// `observability:searchExcludedDataTiers`. Read as a string literal (mirroring
// `logs_overview_fetchers.ts`) so the public bundle doesn't take a new package
// dependency just to reference the key constant.
const SEARCH_EXCLUDED_DATA_TIERS_SETTING = 'observability:searchExcludedDataTiers';

// Four headline scalars. `null` is the "no data" outcome — kept distinct
// from `0` so the tile renders "–" rather than "0%".
export interface HostsKpis {
  cpuUsage: number | null;
  normalizedLoad1m: number | null;
  memoryUsage: number | null;
  diskUsage: number | null;
}

const EMPTY_KPIS: HostsKpis = {
  cpuUsage: null,
  normalizedLoad1m: null,
  memoryUsage: null,
  diskUsage: null,
};

export interface UseHostsKpisResult {
  kpis: HostsKpis;
  loading: boolean;
  error: ReturnType<typeof useFetcher>['error'];
}

// `searchCriteria.limit` comes from a fixed selector (50/100/500); coerce to a
// safe integer literal before interpolating it into the query string.
const sanitizeLimit = (limit: number): number =>
  Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;

export const buildSemconvQuery = (
  indexPattern: string,
  limit: number
): string => `FROM ${indexPattern}
| WHERE state IN ("idle", "used", "free") OR state IS NULL
| STATS
    cpu_idle = AVG(metrics.system.cpu.utilization) WHERE state == "idle",
    load1m = AVG(\`metrics.system.cpu.load_average.1m\`),
    cores = MAX(metrics.system.cpu.logical.count),
    mem_used = AVG(system.memory.utilization) WHERE state == "used",
    disk_free = SUM(metrics.system.filesystem.usage) WHERE state == "free",
    disk_total = SUM(metrics.system.filesystem.usage)
    BY ${HOST_NAME_FIELD}
| EVAL
    host_cpuUsage = 1 - cpu_idle,
    host_normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL),
    host_memoryUsage = mem_used,
    host_diskUsage = CASE(disk_total > 0, 1 - TO_DOUBLE(disk_free) / TO_DOUBLE(disk_total), NULL)
| SORT ${HOST_NAME_FIELD} ASC
| LIMIT ${limit}
| STATS
    cpuUsage = AVG(host_cpuUsage),
    normalizedLoad1m = AVG(host_normalizedLoad1m),
    memoryUsage = AVG(host_memoryUsage),
    diskUsage = AVG(host_diskUsage)
| KEEP cpuUsage, normalizedLoad1m, memoryUsage, diskUsage`;

export const buildEcsQuery = (indexPattern: string, limit: number): string => `FROM ${indexPattern}
| STATS
    host_cpuUsage = AVG(system.cpu.total.norm.pct),
    load1m = AVG(\`system.load.1\`),
    cores = MAX(system.load.cores),
    host_memoryUsage = AVG(system.memory.actual.used.pct),
    host_diskUsage = MAX(system.filesystem.used.pct)
    BY ${HOST_NAME_FIELD}
| EVAL
    host_normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL)
| SORT ${HOST_NAME_FIELD} ASC
| LIMIT ${limit}
| STATS
    cpuUsage = AVG(host_cpuUsage),
    normalizedLoad1m = AVG(host_normalizedLoad1m),
    memoryUsage = AVG(host_memoryUsage),
    diskUsage = AVG(host_diskUsage)
| KEEP cpuUsage, normalizedLoad1m, memoryUsage, diskUsage`;

// The final `STATS` collapses to one row; pull each KEEP column by name so we
// don't rely on positional ordering. Returns all-nulls for an empty/absent
// response (no docs in range, or columns/values missing) so tiles render "–".
export const parseKpiRow = (response: estypes.EsqlAsyncQueryResponse): HostsKpis => {
  const columns = response.columns ?? [];
  const row = response.values?.[0];
  if (!row || columns.length === 0) {
    return EMPTY_KPIS;
  }

  const valueAt = (name: string): number | null => {
    const idx = columns.findIndex((column) => column.name === name);
    return idx === -1 ? null : numberOrNull(row[idx]);
  };

  return {
    cpuUsage: valueAt('cpuUsage'),
    normalizedLoad1m: valueAt('normalizedLoad1m'),
    memoryUsage: valueAt('memoryUsage'),
    diskUsage: valueAt('diskUsage'),
  };
};

export const useHostsKpisEsql = (): UseHostsKpisResult => {
  const {
    services: { data, uiSettings },
  } = useKibanaContextForPlugin();
  const { metricsView } = useMetricsDataViewContext();
  const { buildQuery, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const isReady = useHostsPageReady();

  // Only run once the preferred schema is settled. A missing schema means an
  // empty/degraded cluster (no metrics data) — guessing a schema would issue a
  // query against indices that don't exist, so we surface a terminal "–" state.
  const schema: DataSchemaFormat | undefined = searchCriteria?.preferredSchema ?? undefined;
  // Both schemas read from the configured metrics indices (the resolved
  // metrics data view) rather than a hardcoded pattern, so non-standard source
  // setups keep working. The schema-specific `nodeFilter` (below) discriminates
  // OTel vs ECS docs, so a broad pattern is safe.
  const indexPattern = metricsView?.indices;
  const limit = sanitizeLimit(searchCriteria.limit);

  const excludedDataTiers = useMemo<DataTier[]>(
    () => uiSettings.get<DataTier[]>(SEARCH_EXCLUDED_DATA_TIERS_SETTING) ?? [],
    [uiSettings]
  );

  const filter = useMemo<estypes.QueryDslQueryContainer>(() => {
    const clauses: estypes.QueryDslQueryContainer[] = [
      {
        range: {
          [TIMESTAMP_FIELD]: {
            gte: new Date(parsedDateRange.from).valueOf(),
            lte: new Date(parsedDateRange.to).valueOf(),
            format: 'epoch_millis',
          },
        },
      },
    ];
    const userQuery = buildQuery() as estypes.QueryDslQueryContainer | undefined;
    if (userQuery) {
      clauses.push(userQuery);
    }
    // Honor the `searchExcludedDataTiers` advanced setting, mirroring the
    // `/host` and `/host/count` server routes so KPIs scan the same tiers.
    if (excludedDataTiers.length) {
      clauses.push({ bool: { must_not: [{ terms: { _tier: excludedDataTiers } }] } });
    }
    // The configured metrics indices pattern (`metrics-*,metricbeat-*` by
    // default) is broad enough to match both OTel and ECS docs in a mixed
    // deployment. Scope to the right docs via the inventory model's
    // schema-specific node filter (OTel `data_stream.dataset` for semconv, the
    // system integration `event.module`/`metricset.module` for ECS) so the
    // fleet stats don't bleed across schemas.
    if (schema) {
      clauses.push(...(findInventoryModel('host').nodeFilter?.({ schema }) ?? []));
    }
    return { bool: { filter: clauses } };
  }, [buildQuery, parsedDateRange.from, parsedDateRange.to, schema, excludedDataTiers]);

  const esqlQuery = useMemo(() => {
    if (!limit || !indexPattern) return undefined;
    if (schema === 'semconv') {
      return buildSemconvQuery(indexPattern, limit);
    }
    if (schema === 'ecs') {
      return buildEcsQuery(indexPattern, limit);
    }
    return undefined;
  }, [schema, indexPattern, limit]);

  const {
    data: result,
    status,
    error,
  } = useFetcher(() => {
    // Return `undefined` (not a Promise) until prerequisites settle so
    // `useFetcher` skips the initial double-fire. See `useHostsPageReady`.
    if (!isReady || !esqlQuery) return;
    return (async () => {
      // Typed `data.search.esql` (search-methods service) over the raw
      // `esql_async` strategy: it natively accepts the DSL `filter` and
      // returns a typed `EsqlAsyncQueryResponse` (column/value shape).
      const { rawResponse } = await data.search.esql({ query: esqlQuery, filter });
      return parseKpiRow(rawResponse);
    })();
  }, [isReady, esqlQuery, filter, data.search]);

  const loading = isPending(status);

  useReadyMark({
    mark: 'infra.hosts.kpiReady',
    measure: 'infra.hosts.kpiReadyDuration',
    loading,
    succeeded: !!result && !error,
  });

  return {
    kpis: result ?? EMPTY_KPIS,
    loading,
    error,
  };
};

function numberOrNull(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
