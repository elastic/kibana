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
//
// Every column is resolved against the data view's raw Elasticsearch mapping
// types before it is referenced, so no column ES|QL would reject is emitted.

import { useMemo } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { HOST_NAME_FIELD, TIMESTAMP_FIELD } from '../../../../../common/constants';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useMetricsDataViewContext } from '../../../../containers/metrics_source';
import { useTimeRangeMetadataContext } from '../../../../hooks/use_time_range_metadata';
import { useUnifiedSearchContext } from './use_unified_search';
import { useHostsPageReady } from './use_hosts_page_ready';
// String literal (not the package constant) to avoid a new public-bundle
// dependency, mirroring `logs_overview_fetchers.ts`.
const SEARCH_EXCLUDED_DATA_TIERS_SETTING = 'observability:searchExcludedDataTiers';

// `null` is the "no data" outcome, kept distinct from `0` so tiles render "N/A".
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

// ES|QL resolves every referenced column up front and rejects the whole query
// when one is unmapped or mapped to conflicting types across the pattern's
// indices, which blanks all four tiles. Each KPI is therefore gated on the raw
// Elasticsearch mapping types behind its source field(s), which field caps
// reports in `esTypes`. Kibana's own field type is not enough: it collapses a
// field's mapping types to a single name, so the `aggregate_metric_double` of a
// downsampled index and a plain `double` both report as `number`, and a
// `keyword`/`text` `host.name` both as `string`.
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

// The part of a data view field the query builders depend on.
interface FieldTypes {
  // Kibana's collapsed type, the only signal for a field that reports no
  // mapping types of its own (a runtime field defined on the data view).
  kbnType: string;
  // Every Elasticsearch mapping type backing the field across the pattern's
  // indices. More than one is the union type ES|QL rejects when referenced
  // bare.
  esTypes: readonly string[];
}

export type FieldTypeIndex = Map<string, FieldTypes>;

const KBN_NUMBER_TYPE = 'number';
const KBN_STRING_TYPE = 'string';

// `AVG`/`SUM`/`MAX` accept this type natively and there is no `::double`
// conversion for it, so it is aggregated bare and used as its own cast.
const AGGREGATE_METRIC_DOUBLE_TYPE = 'aggregate_metric_double';

// Elasticsearch numeric mapping types that `::double` converts.
const NUMERIC_MAPPING_TYPES: ReadonlySet<string> = new Set([
  'byte',
  'short',
  'integer',
  'long',
  'unsigned_long',
  'half_float',
  'float',
  'scaled_float',
  'double',
]);

// The string mapping types a metric picks up when an index maps it dynamically,
// and the ones `host.name` legitimately varies between.
const KEYWORD_TYPE = 'keyword';
const STRING_MAPPING_TYPES: ReadonlySet<string> = new Set([
  KEYWORD_TYPE,
  'text',
  'match_only_text',
  'wildcard',
  'constant_keyword',
]);

// Grouping key of the per-host `STATS`.
const HOST_NAME_ALIAS = 'host_name';

export const indexFieldTypes = (fields: FieldSpec[]): FieldTypeIndex =>
  new Map(
    fields.map(({ name, type, esTypes }) => [name, { kbnType: type, esTypes: esTypes ?? [] }])
  );

// Coerce to a safe integer literal before interpolating into the query string.
const sanitizeLimit = (limit: number): number =>
  Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;

const quote = (field: string): string => `\`${field}\``;

// `state` is referenced bare inside `WHERE`, where no cast can resolve a
// conflict, so a union mapping drops the KPIs that scope by it. A single string
// mapping is required rather than merely "not a conflict": `state` is an object
// in some OTel indices, which field caps reports alongside the `keyword`.
const isPlainStringField = (field: FieldTypes | undefined): boolean => {
  if (!field) return false;
  const { kbnType, esTypes } = field;
  if (esTypes.length === 0) return kbnType === KBN_STRING_TYPE;
  return esTypes.length === 1 && STRING_MAPPING_TYPES.has(esTypes[0]);
};

// The cast that makes a metric readable, or `undefined` when nothing does.
// Casting is deliberately restricted to mapping types known to convert: an
// unrecognised type in the union drops the KPI, rather than emitting a cast
// ES|QL might reject and so failing the whole query.
const metricExpr = (name: string, field: FieldTypes | undefined): string | undefined => {
  if (!field) return undefined;
  const { kbnType, esTypes } = field;
  // No mapping types behind it (a runtime field): Kibana's type is all we have.
  if (esTypes.length === 0) {
    return kbnType === KBN_NUMBER_TYPE ? `${quote(name)}::double` : undefined;
  }

  if (esTypes.includes(AGGREGATE_METRIC_DOUBLE_TYPE)) {
    const others = esTypes.filter((type) => type !== AGGREGATE_METRIC_DOUBLE_TYPE);
    // Downsampled everywhere: aggregate it as-is.
    if (others.length === 0) return quote(name);
    // Downsampled in some indices and raw in others — the union Elasticsearch
    // itself suggests resolving as `aggregate_metric_double`.
    return others.every((type) => NUMERIC_MAPPING_TYPES.has(type))
      ? `${quote(name)}::${AGGREGATE_METRIC_DOUBLE_TYPE}`
      : undefined;
  }

  // Nothing numeric behind it: not a metric, whatever it is.
  if (!esTypes.some((type) => NUMERIC_MAPPING_TYPES.has(type))) return undefined;

  // `::double` resolves both a union of mixed numeric widths and a metric that
  // one index mapped as a string: values that do not parse become null, which
  // the KPI aggregations skip, the same way the hosts table renders the field.
  return esTypes.every((type) => NUMERIC_MAPPING_TYPES.has(type) || STRING_MAPPING_TYPES.has(type))
    ? `${quote(name)}::double`
    : undefined;
};

// Resolves every field a KPI needs, or `undefined` when any of them cannot be
// referenced — that KPI is then left out and its tile renders "N/A" while the
// others still load.
const resolveMetricExprs = (fields: FieldTypeIndex, names: string[]): string[] | undefined => {
  const exprs: string[] = [];
  for (const name of names) {
    const expr = metricExpr(name, fields.get(name));
    if (!expr) return undefined;
    exprs.push(expr);
  }
  return exprs;
};

interface HostNameGrouping {
  // Column the per-host `STATS`/`SORT` group by.
  column: string;
  // `EVAL` deriving `column`, when the mapping conflict has to be cast away.
  evalExpr?: string;
}

// `host.name` is dynamically mapped as `text` in some metricbeat indices,
// making it a union type ES|QL rejects — and `text` alone is not groupable
// either. Casting to `keyword` resolves both; anything outside the string
// mapping types leaves no grouping key, and hence no query to run.
const resolveHostNameGrouping = (field: FieldTypes | undefined): HostNameGrouping | undefined => {
  if (!field) return undefined;
  const { kbnType, esTypes } = field;
  if (esTypes.length === 0) {
    return kbnType === KBN_STRING_TYPE ? { column: HOST_NAME_FIELD } : undefined;
  }
  if (!esTypes.every((type) => STRING_MAPPING_TYPES.has(type))) return undefined;
  if (esTypes.length === 1 && esTypes[0] === KEYWORD_TYPE) return { column: HOST_NAME_FIELD };
  return {
    column: HOST_NAME_ALIAS,
    evalExpr: `${HOST_NAME_ALIAS} = ${quote(HOST_NAME_FIELD)}::${KEYWORD_TYPE}`,
  };
};

interface KpiQueryArgs {
  indexPattern: string;
  limit: number;
  fields: FieldTypeIndex;
  hostName: HostNameGrouping;
}

const assembleQuery = (
  { indexPattern, limit, hostName }: Omit<KpiQueryArgs, 'fields'>,
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
    hostName.evalExpr ? `| EVAL ${hostName.evalExpr}` : undefined,
    `| STATS ${perHost.join(', ')} BY ${hostName.column}`,
    evals.length ? `| EVAL ${evals.join(', ')}` : undefined,
    `| SORT ${hostName.column} ASC`,
    `| LIMIT ${limit}`,
    `| STATS ${fleet.join(', ')}`,
    `| KEEP ${keep.join(', ')}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
};

const buildSemconvQuery = (args: KpiQueryArgs): string | undefined => {
  const { fields } = args;
  const clauses: KpiClause[] = [];
  // The semconv CPU/memory/disk formulas all scope by `state`.
  const hasState = isPlainStringField(fields.get(STATE_FIELD));

  const cpu = hasState ? resolveMetricExprs(fields, [SEMCONV_CPU_FIELD]) : undefined;
  if (cpu) {
    clauses.push({
      key: 'cpuUsage',
      perHost: [`cpu_idle = AVG(${cpu[0]}) WHERE state == "idle"`],
      evalExpr: 'host_cpuUsage = 1 - cpu_idle',
      fleet: 'cpuUsage = AVG(host_cpuUsage)',
    });
  }

  const load = resolveMetricExprs(fields, [SEMCONV_LOAD_FIELD, SEMCONV_CORES_FIELD]);
  if (load) {
    clauses.push({
      key: 'normalizedLoad1m',
      perHost: [`load1m = AVG(${load[0]})`, `cores = MAX(${load[1]})`],
      evalExpr: 'host_normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL)',
      fleet: 'normalizedLoad1m = AVG(host_normalizedLoad1m)',
    });
  }

  const memory = hasState ? resolveMetricExprs(fields, [SEMCONV_MEMORY_FIELD]) : undefined;
  if (memory) {
    clauses.push({
      key: 'memoryUsage',
      perHost: [`host_memoryUsage = AVG(${memory[0]}) WHERE state == "used"`],
      fleet: 'memoryUsage = AVG(host_memoryUsage)',
    });
  }

  const disk = hasState ? resolveMetricExprs(fields, [SEMCONV_DISK_FIELD]) : undefined;
  if (disk) {
    clauses.push({
      key: 'diskUsage',
      perHost: [
        `disk_free = SUM(${disk[0]}) WHERE state == "free"`,
        `disk_total = SUM(${disk[0]})`,
      ],
      evalExpr:
        'host_diskUsage = CASE(disk_total > 0, 1 - TO_DOUBLE(disk_free) / TO_DOUBLE(disk_total), NULL)',
      fleet: 'diskUsage = AVG(host_diskUsage)',
    });
  }

  // The `WHERE state` pre-filter only matters for clauses that scope by state.
  const usesState = clauses.some((clause) =>
    clause.perHost.some((expr) => expr.includes('WHERE state'))
  );
  const preFilter = usesState
    ? '| WHERE state IN ("idle", "used", "free") OR state IS NULL'
    : undefined;

  return assembleQuery(args, preFilter, clauses);
};

// Picks the schema's query variant, gating every column on the mapping types
// behind it. A KPI whose fields ES|QL cannot reference is dropped so the
// remaining tiles still load; with no grouping key or no KPI left there is no
// query and all four render "N/A", matching the table's empty state.
export const buildHostsKpisQuery = ({
  schema,
  indexPattern,
  limit,
  fields,
}: {
  schema: DataSchemaFormat | undefined;
  indexPattern: string | undefined;
  limit: number;
  fields: FieldTypeIndex;
}): string | undefined => {
  if (!limit || !indexPattern) return undefined;
  const build =
    schema === 'semconv' ? buildSemconvQuery : schema === 'ecs' ? buildEcsQuery : undefined;
  if (!build) return undefined;

  const hostName = resolveHostNameGrouping(fields.get(HOST_NAME_FIELD));
  if (!hostName) return undefined;

  return build({ indexPattern, limit, fields, hostName });
};

const buildEcsQuery = (args: KpiQueryArgs): string | undefined => {
  const { fields } = args;
  const clauses: KpiClause[] = [];

  const cpu = resolveMetricExprs(fields, [ECS_CPU_FIELD]);
  if (cpu) {
    clauses.push({
      key: 'cpuUsage',
      perHost: [`host_cpuUsage = AVG(${cpu[0]})`],
      fleet: 'cpuUsage = AVG(host_cpuUsage)',
    });
  }

  const load = resolveMetricExprs(fields, [ECS_LOAD_FIELD, ECS_CORES_FIELD]);
  if (load) {
    clauses.push({
      key: 'normalizedLoad1m',
      perHost: [`load1m = AVG(${load[0]})`, `cores = MAX(${load[1]})`],
      evalExpr: 'host_normalizedLoad1m = CASE(cores > 0, load1m / cores, NULL)',
      fleet: 'normalizedLoad1m = AVG(host_normalizedLoad1m)',
    });
  }

  const memory = resolveMetricExprs(fields, [ECS_MEMORY_FIELD]);
  if (memory) {
    clauses.push({
      key: 'memoryUsage',
      perHost: [`host_memoryUsage = AVG(${memory[0]})`],
      fleet: 'memoryUsage = AVG(host_memoryUsage)',
    });
  }

  // Disk reduces across hosts with MAX (not AVG), mirroring the ECS
  // `max(system.filesystem.used.pct)` formula — a fleet-wide worst disk.
  const disk = resolveMetricExprs(fields, [ECS_DISK_FIELD]);
  if (disk) {
    clauses.push({
      key: 'diskUsage',
      perHost: [`host_diskUsage = MAX(${disk[0]})`],
      fleet: 'diskUsage = MAX(host_diskUsage)',
    });
  }

  return assembleQuery(args, undefined, clauses);
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
  const { metricsView, loading: metricsViewLoading } = useMetricsDataViewContext();
  const { data: timeRangeMetadata, status: timeRangeMetadataStatus } =
    useTimeRangeMetadataContext();
  const { buildQuery, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const isReady = useHostsPageReady();

  // A missing schema (empty/degraded cluster) leaves `esqlQuery` undefined
  // rather than guessing and querying non-existent indices.
  const schema: DataSchemaFormat | undefined = searchCriteria?.preferredSchema ?? undefined;
  // Configured metrics indices (not a hardcoded pattern) so non-standard setups
  // keep working. Kept in step with the table and the host count, which query
  // the same pattern: narrowing only the KPIs would scope the tiles differently
  // from the rows they summarise.
  const indexPattern = metricsView?.indices;
  const limit = sanitizeLimit(searchCriteria.limit);

  // Indexed by name so each KPI can be gated on the mapping types behind its
  // own fields; `esTypes` is what makes the conflicts visible here.
  const fields = useMemo(() => indexFieldTypes(metricsView?.fields ?? []), [metricsView?.fields]);

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

  // While the schema metadata or the data view fields re-resolve (e.g. after a
  // CPS project-routing change), `esqlQuery` may still reference columns from
  // the previous scope; hold the fetch until both settle — the status flip in
  // the deps re-fires it (and aborts any stale in-flight request).
  const isScopeResolving = isPending(timeRangeMetadataStatus) || Boolean(metricsViewLoading);

  // The schema is user-selectable, so it may be one the metadata reports no
  // data for in the current scope (empty cluster, narrowed CPS project scope).
  // There is nothing to query then, and the index pattern may not even resolve,
  // so the tiles render "N/A" without a request.
  const schemaHasData = schema ? (timeRangeMetadata?.schemas ?? []).includes(schema) : false;

  const esqlQuery = useMemo(
    () =>
      schemaHasData ? buildHostsKpisQuery({ schema, indexPattern, limit, fields }) : undefined,
    [schema, schemaHasData, indexPattern, limit, fields]
  );

  const {
    data: result,
    status,
    error,
  } = useFetcher(() => {
    // Returning `undefined` (not a Promise) until ready skips useFetcher's
    // initial double-fire.
    if (!isReady || !esqlQuery || isScopeResolving) return;
    return (async () => {
      const { rawResponse } = await data.search.esql({ query: esqlQuery, filter });
      return parseKpiRow(rawResponse);
    })();
  }, [isReady, esqlQuery, filter, data.search, isScopeResolving]);

  // With no query to run we're only "loading" while the data view resolves;
  // otherwise the fetcher never fires and status would stay pending forever.
  const loading = esqlQuery ? isPending(status) : !indexPattern;

  // `useFetcher` keeps the last successful result when `fn` returns undefined
  // (`preservePreviousData`). Shrinking the time range to a window with no
  // schema data does exactly that (`schemaHasData` → no query), so the stale
  // numbers must not be shown as if they belonged to the new range.
  const hasQuery = Boolean(esqlQuery);

  return {
    kpis: hasQuery ? (result ?? EMPTY_KPIS) : EMPTY_KPIS,
    loading,
    error: hasQuery ? error : undefined,
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
