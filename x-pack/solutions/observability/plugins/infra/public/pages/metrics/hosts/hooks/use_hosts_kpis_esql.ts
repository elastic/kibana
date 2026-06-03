/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Fetches the four headline KPI scalars in a single client-side ES|QL request
// (one variant per schema), gated on `useHostsPageReady` so it runs in parallel
// with the `/host` table fetch. Each variant aggregates per `host.name`, caps
// to the first `limit` hosts (matching the table's `terms` resolution), then
// reduces across them. Formulas mirror
// `metrics_data_access/.../formulas/{cpu,memory,disk}.ts`.

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
// String literal (not the package constant) to avoid a new public-bundle
// dependency, mirroring `logs_overview_fetchers.ts`.
const SEARCH_EXCLUDED_DATA_TIERS_SETTING = 'observability:searchExcludedDataTiers';

// `null` is the "no data" outcome, kept distinct from `0` so tiles render "–".
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

// Filesystem metrics are optional (e.g. an OTel collector without the
// filesystem scraper). ES|QL fails the *whole* query when a referenced column
// is absent from the mapping, so we gate the disk clauses on the field being
// present in the data view rather than letting one missing field blank every KPI.
export const SEMCONV_DISK_FIELD = 'metrics.system.filesystem.usage';
export const ECS_DISK_FIELD = 'system.filesystem.used.pct';

// Coerce to a safe integer literal before interpolating into the query string.
const sanitizeLimit = (limit: number): number =>
  Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;

export const buildSemconvQuery = (
  indexPattern: string,
  limit: number,
  includeDisk: boolean = true
): string => {
  const perHostStats = [
    'cpu_idle = AVG(metrics.system.cpu.utilization) WHERE state == "idle"',
    'load1m = AVG(`metrics.system.cpu.load_average.1m`)',
    'cores = MAX(metrics.system.cpu.logical.count)',
    'mem_used = AVG(system.memory.utilization) WHERE state == "used"',
    ...(includeDisk
      ? [
          `disk_free = SUM(${SEMCONV_DISK_FIELD}) WHERE state == "free"`,
          `disk_total = SUM(${SEMCONV_DISK_FIELD})`,
        ]
      : []),
  ];
  const perHostEval = [
    'host_cpuUsage = 1 - cpu_idle',
    'host_normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL)',
    'host_memoryUsage = mem_used',
    ...(includeDisk
      ? [
          'host_diskUsage = CASE(disk_total > 0, 1 - TO_DOUBLE(disk_free) / TO_DOUBLE(disk_total), NULL)',
        ]
      : []),
  ];
  const fleetStats = [
    'cpuUsage = AVG(host_cpuUsage)',
    'normalizedLoad1m = AVG(host_normalizedLoad1m)',
    'memoryUsage = AVG(host_memoryUsage)',
    ...(includeDisk ? ['diskUsage = AVG(host_diskUsage)'] : []),
  ];
  const keep = [
    'cpuUsage',
    'normalizedLoad1m',
    'memoryUsage',
    ...(includeDisk ? ['diskUsage'] : []),
  ];

  return [
    `FROM ${indexPattern}`,
    '| WHERE state IN ("idle", "used", "free") OR state IS NULL',
    `| STATS ${perHostStats.join(', ')} BY ${HOST_NAME_FIELD}`,
    `| EVAL ${perHostEval.join(', ')}`,
    `| SORT ${HOST_NAME_FIELD} ASC`,
    `| LIMIT ${limit}`,
    `| STATS ${fleetStats.join(', ')}`,
    `| KEEP ${keep.join(', ')}`,
  ].join('\n');
};

// Disk usage reduces across hosts with MAX (not AVG), mirroring the ECS
// `max(system.filesystem.used.pct)` formula — a fleet-wide worst disk.
export const buildEcsQuery = (
  indexPattern: string,
  limit: number,
  includeDisk: boolean = true
): string => {
  const perHostStats = [
    'host_cpuUsage = AVG(system.cpu.total.norm.pct)',
    'load1m = AVG(`system.load.1`)',
    'cores = MAX(system.load.cores)',
    'host_memoryUsage = AVG(system.memory.actual.used.pct)',
    ...(includeDisk ? [`host_diskUsage = MAX(${ECS_DISK_FIELD})`] : []),
  ];
  const fleetStats = [
    'cpuUsage = AVG(host_cpuUsage)',
    'normalizedLoad1m = AVG(host_normalizedLoad1m)',
    'memoryUsage = AVG(host_memoryUsage)',
    ...(includeDisk ? ['diskUsage = MAX(host_diskUsage)'] : []),
  ];
  const keep = [
    'cpuUsage',
    'normalizedLoad1m',
    'memoryUsage',
    ...(includeDisk ? ['diskUsage'] : []),
  ];

  return [
    `FROM ${indexPattern}`,
    `| STATS ${perHostStats.join(', ')} BY ${HOST_NAME_FIELD}`,
    '| EVAL host_normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL)',
    `| SORT ${HOST_NAME_FIELD} ASC`,
    `| LIMIT ${limit}`,
    `| STATS ${fleetStats.join(', ')}`,
    `| KEEP ${keep.join(', ')}`,
  ].join('\n');
};

// Pull each KEEP column by name (not position); all-nulls for an empty response.
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

  // A missing schema (empty/degraded cluster) leaves `esqlQuery` undefined
  // rather than guessing and querying non-existent indices.
  const schema: DataSchemaFormat | undefined = searchCriteria?.preferredSchema ?? undefined;
  // Configured metrics indices (not a hardcoded pattern); the schema `nodeFilter`
  // below scopes to the right docs, so the broad pattern is safe.
  // These are infra-metric KPIs, so the query only sees hosts with metrics docs.
  // In a mixed fleet the table can also list APM-only hosts (no metrics), so the
  // averaged host set can be a subset of the table's — this matches the behaviour
  // before this change (the KPIs always read the metrics indices) and is fine.
  const indexPattern = metricsView?.indices;
  const limit = sanitizeLimit(searchCriteria.limit);

  // The disk KPI references an optional filesystem field; only query it when the
  // metrics data view actually maps it (see `SEMCONV_DISK_FIELD`/`ECS_DISK_FIELD`).
  const availableFields = useMemo(
    () => new Set((metricsView?.fields ?? []).map((field) => field.name)),
    [metricsView?.fields]
  );

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
    // Mirror the `/host` and `/host/count` routes' tier exclusion.
    if (excludedDataTiers.length) {
      clauses.push({ bool: { must_not: [{ terms: { _tier: excludedDataTiers } }] } });
    }
    // Schema-specific node filter keeps OTel/ECS stats from bleeding across
    // schemas on the shared metrics index pattern.
    if (schema) {
      clauses.push(...(findInventoryModel('host').nodeFilter?.({ schema }) ?? []));
    }
    return { bool: { filter: clauses } };
  }, [buildQuery, parsedDateRange.from, parsedDateRange.to, schema, excludedDataTiers]);

  const esqlQuery = useMemo(() => {
    if (!limit || !indexPattern) return undefined;
    if (schema === 'semconv') {
      return buildSemconvQuery(indexPattern, limit, availableFields.has(SEMCONV_DISK_FIELD));
    }
    if (schema === 'ecs') {
      return buildEcsQuery(indexPattern, limit, availableFields.has(ECS_DISK_FIELD));
    }
    return undefined;
  }, [schema, indexPattern, limit, availableFields]);

  const {
    data: result,
    status,
    error,
  } = useFetcher(() => {
    // Returning `undefined` (not a Promise) until ready skips useFetcher's
    // initial double-fire.
    if (!isReady || !esqlQuery) return;
    return (async () => {
      const { rawResponse } = await data.search.esql({ query: esqlQuery, filter });
      return parseKpiRow(rawResponse);
    })();
  }, [isReady, esqlQuery, filter, data.search]);

  const loading = isPending(status);

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
