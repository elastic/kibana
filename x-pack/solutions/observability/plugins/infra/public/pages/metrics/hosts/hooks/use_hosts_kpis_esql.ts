/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Client-side KPI fetch over the data plugin's ES|QL search strategy.
//
// Computes the four headline scalars (CPU Usage, Normalized Load, Memory
// Usage, Disk Usage) + the fleet host count in a single ES|QL `STATS`
// request, issued straight from the browser via `data.search` — no custom
// `/api/metrics/infra/host/kpis` server route in the middle. Same shape as
// the old endpoint hook (`{ kpis, hostCount, loading, error }`) so the tile
// component is agnostic to where the numbers come from.
//
// Two query variants, picked from `searchCriteria.preferredSchema`:
//   - semconv → OTel host metrics in `metrics-hostmetricsreceiver.otel-*`.
//     `WHERE state IN (…) OR state IS NULL` prunes via the inverted index on
//     `state` before the filter-in-aggregation operator scans rows, then a
//     single-stage `STATS` derives the ratios.
//   - ecs → standard ECS host metrics in the configured metrics indices
//     (`metricsView.getIndexPattern()`). The four formulas mirror
//     `metrics_data_access/.../formulas/{cpu,memory,disk}.ts`:
//       cpuUsage         = avg(system.cpu.total.norm.pct)
//       normalizedLoad1m = avg(system.load.1) / max(system.load.cores)
//       memoryUsage      = avg(system.memory.actual.used.pct)
//       diskUsage        = max(system.filesystem.used.pct)
//
// Parallel fetch: the query has no `BY host.name`, no `LIMIT`, and does NOT
// depend on the table's host set, so it fires from the shared
// `useHostsPageReady` gate in parallel with the `/host` request. User
// perceived KPI latency is `max(/host, kpis)` rather than `/host + kpis`.

import { useEffect, useMemo, useRef } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { DEFAULT_SCHEMA, HOST_NAME_FIELD, TIMESTAMP_FIELD } from '../../../../../common/constants';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useMetricsDataViewContext } from '../../../../containers/metrics_source';
import { markOnce, measureSince } from '../utils/perf_marks';
import { useUnifiedSearchContext } from './use_unified_search';
import { useHostsPageReady } from './use_hosts_page_ready';

const SEMCONV_INDEX_PATTERN = 'metrics-hostmetricsreceiver.otel-*';

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
  hostCount: number;
  loading: boolean;
  error: ReturnType<typeof useFetcher>['error'];
}

const buildSemconvQuery = (): string => `FROM ${SEMCONV_INDEX_PATTERN}
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

const buildEcsQuery = (indexPattern: string): string => `FROM ${indexPattern}
| STATS
    cpuUsage = AVG(system.cpu.total.norm.pct),
    load1m = AVG(\`system.load.1\`),
    cores = MAX(system.load.cores),
    memoryUsage = AVG(system.memory.actual.used.pct),
    diskUsage = MAX(system.filesystem.used.pct),
    host_count = COUNT_DISTINCT(${HOST_NAME_FIELD})
| EVAL
    normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL)
| KEEP cpuUsage, normalizedLoad1m, memoryUsage, diskUsage, host_count`;

// The single `STATS` collapses to one row; pull each KEEP column by name so
// we don't rely on positional ordering. Returns all-nulls / `hostCount: 0`
// for an empty result (no docs in range) so the tiles render "–".
const parseKpiRow = (response: ESQLSearchResponse): { kpis: HostsKpis; hostCount: number } => {
  const row = response.values[0];
  if (!row) {
    return { kpis: EMPTY_KPIS, hostCount: 0 };
  }

  const indexOf = (name: string) => response.columns.findIndex((column) => column.name === name);
  const valueAt = (name: string): number | null => {
    const idx = indexOf(name);
    return idx === -1 ? null : numberOrNull(row[idx]);
  };

  return {
    kpis: {
      cpuUsage: valueAt('cpuUsage'),
      normalizedLoad1m: valueAt('normalizedLoad1m'),
      memoryUsage: valueAt('memoryUsage'),
      diskUsage: valueAt('diskUsage'),
    },
    hostCount: valueAt('host_count') ?? 0,
  };
};

export const useHostsKpisEsql = (): UseHostsKpisResult => {
  const {
    services: { data },
  } = useKibanaContextForPlugin();
  const { metricsView } = useMetricsDataViewContext();
  const { buildQuery, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const isReady = useHostsPageReady();

  const schema: DataSchemaFormat = searchCriteria?.preferredSchema || DEFAULT_SCHEMA;
  const ecsIndexPattern = schema === 'semconv' ? undefined : metricsView?.indices;

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
    // The ECS `FROM metrics-*,metricbeat-*` pattern is broad enough to also
    // match the semconv OTel data stream in a mixed deployment. Scope it to
    // ECS system docs via the inventory model's node filter so the fleet
    // stats / host count don't bleed in semconv hosts. The semconv path's
    // `FROM` is already pinned to `metrics-hostmetricsreceiver.otel-*`, so
    // it needs no extra discriminator.
    if (schema === 'ecs') {
      clauses.push(...(findInventoryModel('host').nodeFilter?.({ schema }) ?? []));
    }
    return { bool: { filter: clauses } };
  }, [buildQuery, parsedDateRange.from, parsedDateRange.to, schema]);

  const esqlQuery = useMemo(() => {
    if (schema === 'semconv') {
      return buildSemconvQuery();
    }
    return ecsIndexPattern ? buildEcsQuery(ecsIndexPattern) : undefined;
  }, [schema, ecsIndexPattern]);

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
      // returns the same column/value `rawResponse` shape.
      const { rawResponse } = await data.search.esql({ query: esqlQuery, filter });
      return parseKpiRow(rawResponse as unknown as ESQLSearchResponse);
    })();
  }, [isReady, esqlQuery, filter, data.search]);

  const loading = isPending(status);
  const hasMarkedKpiReadyRef = useRef(false);
  const prevLoadingRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (prevLoadingRef.current === true && !loading && !hasMarkedKpiReadyRef.current) {
      markOnce('infra.hosts.kpiReady');
      measureSince('infra.hosts.kpiReadyDuration', 'infra.hosts.navigationStart');
      hasMarkedKpiReadyRef.current = true;
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  return {
    kpis: result?.kpis ?? EMPTY_KPIS,
    hostCount: result?.hostCount ?? 0,
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
