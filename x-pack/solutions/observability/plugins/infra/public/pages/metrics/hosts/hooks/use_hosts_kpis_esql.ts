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

// ES|QL fails the whole query when a referenced column is absent, so each KPI
// is gated on its source field(s) being mapped; a missing field drops that one
// tile instead of blanking all four.
const STATE_FIELD = 'state';
const SEMCONV_CPU_FIELD = 'metrics.system.cpu.utilization';
const SEMCONV_LOAD_FIELD = 'metrics.system.cpu.load_average.1m';
const SEMCONV_CORES_FIELD = 'metrics.system.cpu.logical.count';
const SEMCONV_MEMORY_FIELD = 'system.memory.utilization';
export const SEMCONV_DISK_FIELD = 'metrics.system.filesystem.usage';
const ECS_CPU_FIELD = 'system.cpu.total.norm.pct';
const ECS_LOAD_FIELD = 'system.load.1';
const ECS_CORES_FIELD = 'system.load.cores';
const ECS_MEMORY_FIELD = 'system.memory.actual.used.pct';
export const ECS_DISK_FIELD = 'system.filesystem.used.pct';

type KpiKey = keyof HostsKpis;

interface KpiClause {
  key: KpiKey;
  // Per-host `STATS` expression(s) (reduced again across hosts by `fleet`).
  perHost: string[];
  // Optional `EVAL` deriving `host_<key>` from the per-host stats above.
  evalExpr?: string;
  // Fleet-wide `STATS` expression producing the `<key>` KEEP column.
  fleet: string;
}

// Coerce to a safe integer literal before interpolating into the query string.
const sanitizeLimit = (limit: number): number =>
  Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;

// Cast to `double` so a field mapped with mixed numeric types across clusters
// (CCS union type) resolves instead of failing the whole query.
const asDouble = (field: string): string => `${field}::double`;
const quotedAsDouble = (field: string): string => `\`${field}\`::double`;

const assembleQuery = (
  indexPattern: string,
  limit: number,
  preFilter: string | undefined,
  clauses: KpiClause[]
): string | undefined => {
  if (clauses.length === 0) return undefined;
  const perHost = clauses.flatMap((clause) => clause.perHost);
  const evals = clauses.map((clause) => clause.evalExpr).filter((e): e is string => Boolean(e));
  const fleet = clauses.map((clause) => clause.fleet);
  const keep = clauses.map((clause) => clause.key);

  return [
    `FROM ${indexPattern}`,
    preFilter,
    `| STATS ${perHost.join(', ')} BY ${HOST_NAME_FIELD}`,
    evals.length ? `| EVAL ${evals.join(', ')}` : undefined,
    `| SORT ${HOST_NAME_FIELD} ASC`,
    `| LIMIT ${limit}`,
    `| STATS ${fleet.join(', ')}`,
    `| KEEP ${keep.join(', ')}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
};

export const buildSemconvQuery = (
  indexPattern: string,
  limit: number,
  hasField: (field: string) => boolean
): string | undefined => {
  const has = (...fields: string[]): boolean => fields.every(hasField);
  const hasState = hasField(STATE_FIELD);
  const clauses: KpiClause[] = [];

  if (hasState && has(SEMCONV_CPU_FIELD)) {
    clauses.push({
      key: 'cpuUsage',
      perHost: [`cpu_idle = AVG(${asDouble(SEMCONV_CPU_FIELD)}) WHERE state == "idle"`],
      evalExpr: 'host_cpuUsage = 1 - cpu_idle',
      fleet: 'cpuUsage = AVG(host_cpuUsage)',
    });
  }
  if (has(SEMCONV_LOAD_FIELD, SEMCONV_CORES_FIELD)) {
    clauses.push({
      key: 'normalizedLoad1m',
      perHost: [
        `load1m = AVG(${quotedAsDouble(SEMCONV_LOAD_FIELD)})`,
        `cores = MAX(${asDouble(SEMCONV_CORES_FIELD)})`,
      ],
      evalExpr: 'host_normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL)',
      fleet: 'normalizedLoad1m = AVG(host_normalizedLoad1m)',
    });
  }
  if (hasState && has(SEMCONV_MEMORY_FIELD)) {
    clauses.push({
      key: 'memoryUsage',
      perHost: [`host_memoryUsage = AVG(${asDouble(SEMCONV_MEMORY_FIELD)}) WHERE state == "used"`],
      fleet: 'memoryUsage = AVG(host_memoryUsage)',
    });
  }
  if (hasState && has(SEMCONV_DISK_FIELD)) {
    clauses.push({
      key: 'diskUsage',
      perHost: [
        `disk_free = SUM(${asDouble(SEMCONV_DISK_FIELD)}) WHERE state == "free"`,
        `disk_total = SUM(${asDouble(SEMCONV_DISK_FIELD)})`,
      ],
      evalExpr:
        'host_diskUsage = CASE(disk_total > 0, 1 - TO_DOUBLE(disk_free) / TO_DOUBLE(disk_total), NULL)',
      fleet: 'diskUsage = AVG(host_diskUsage)',
    });
  }

  // The `WHERE state` pre-filter only matters for the state-scoped metrics.
  const usesState = clauses.some((clause) => clause.key !== 'normalizedLoad1m');
  const preFilter = usesState
    ? '| WHERE state IN ("idle", "used", "free") OR state IS NULL'
    : undefined;

  return assembleQuery(indexPattern, limit, preFilter, clauses);
};

export const buildEcsQuery = (
  indexPattern: string,
  limit: number,
  hasField: (field: string) => boolean
): string | undefined => {
  const has = (...fields: string[]): boolean => fields.every(hasField);
  const clauses: KpiClause[] = [];

  if (has(ECS_CPU_FIELD)) {
    clauses.push({
      key: 'cpuUsage',
      perHost: [`host_cpuUsage = AVG(${asDouble(ECS_CPU_FIELD)})`],
      fleet: 'cpuUsage = AVG(host_cpuUsage)',
    });
  }
  if (has(ECS_LOAD_FIELD, ECS_CORES_FIELD)) {
    clauses.push({
      key: 'normalizedLoad1m',
      perHost: [
        `load1m = AVG(${quotedAsDouble(ECS_LOAD_FIELD)})`,
        `cores = MAX(${asDouble(ECS_CORES_FIELD)})`,
      ],
      evalExpr: 'host_normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL)',
      fleet: 'normalizedLoad1m = AVG(host_normalizedLoad1m)',
    });
  }
  if (has(ECS_MEMORY_FIELD)) {
    clauses.push({
      key: 'memoryUsage',
      perHost: [`host_memoryUsage = AVG(${asDouble(ECS_MEMORY_FIELD)})`],
      fleet: 'memoryUsage = AVG(host_memoryUsage)',
    });
  }
  // Disk reduces across hosts with MAX (not AVG), mirroring the ECS
  // `max(system.filesystem.used.pct)` formula — a fleet-wide worst disk.
  if (has(ECS_DISK_FIELD)) {
    clauses.push({
      key: 'diskUsage',
      perHost: [`host_diskUsage = MAX(${asDouble(ECS_DISK_FIELD)})`],
      fleet: 'diskUsage = MAX(host_diskUsage)',
    });
  }

  return assembleQuery(indexPattern, limit, undefined, clauses);
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
  // Configured metrics indices (not a hardcoded pattern) so non-standard setups
  // keep working.
  const indexPattern = metricsView?.indices;
  const limit = sanitizeLimit(searchCriteria.limit);

  // Each KPI is built only when its source field(s) are mapped, so an optional
  // or not-yet-ingested field drops a single tile instead of failing the query.
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
    const build =
      schema === 'semconv' ? buildSemconvQuery : schema === 'ecs' ? buildEcsQuery : undefined;
    if (!build) return undefined;
    // Fall back to the full query when a stale data view exposes none of the
    // schema's fields, so it returns values (or a real error) rather than
    // leaving the tiles stuck loading.
    return (
      build(indexPattern, limit, (field) => availableFields.has(field)) ??
      build(indexPattern, limit, () => true)
    );
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

  // With no query to run we're only "loading" while the data view resolves;
  // otherwise the fetcher never fires and status would stay pending forever.
  const loading = esqlQuery ? isPending(status) : !indexPattern;

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
