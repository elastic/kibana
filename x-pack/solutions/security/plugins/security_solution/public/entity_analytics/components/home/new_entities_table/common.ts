/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import {
  getEuidNamespaceSourceFields,
  getEuidSourceFields,
} from '@kbn/entity-store/common/domain/euid';
import type { HttpSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { lastValueFrom } from 'rxjs';
import { getEuidEsqlEvaluation, getFieldEvaluationsEsql } from './euid_esql';
import { isAbortError } from '../../../../common/utils/exceptions';

// ── constants ────────────────────────────────────────────────────────────────

export const ALLOWED_ENTITY_TYPES = ['user', 'host', 'service'] as const;

export const ENTITY_ID_FIELD = 'entity.id';
export const ENTITY_TYPE_FIELD = 'entity.EngineMetadata.Type';
export const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
export const RISK_SCORE_NORM_FIELD = 'entity.risk.calculated_score_norm';

export const ALERT_COUNT_FIELD = 'alert_count';
export const ANOMALY_COUNT_FIELD = 'anomaly_count';
export const GROUP_SIZE_FIELD = 'group_size';
export const LAST_SEEN_ALERT_FIELD = 'last_seen_alert';
export const RISK_SCORE_CHANGE_FIELD = 'risk_score_change';

export const MS_PER_DAY = 86_400_000;
export const TIME_RANGE_OPTIONS = ['24h', '7d', '30d'] as const;
export const TIME_RANGE_DAYS = { '24h': 1, '7d': 7, '30d': 30 } as const;

/**
 * Identity and namespace source fields from entity definitions. The alert enrich rebuilds
 * each row's EUID filter from them; without the namespace sources (e.g. `event.module`)
 * the filter derives a different namespace and misses unstamped alerts.
 */
const IDENTITY_KEEP_FIELDS = [
  ...new Set([
    ...ALLOWED_ENTITY_TYPES.flatMap((t) => {
      const { exactMatchFields, prefixMatchFields } = getEuidNamespaceSourceFields(t);
      return [
        ...getEuidSourceFields(t).identitySourceFields,
        ...exactMatchFields,
        ...prefixMatchFields,
      ];
    }),
    'entity.namespace',
  ]),
];

export const ENTITY_FIELDS = [
  ENTITY_ID_FIELD,
  'entity.name',
  ENTITY_TYPE_FIELD,
  RISK_SCORE_NORM_FIELD,
  RESOLVED_TO_FIELD,
  'asset.criticality',
  'entity.source',
  'entity.attributes.watchlists',
  'entity.lifecycle.first_seen',
  '@timestamp',
  ...IDENTITY_KEEP_FIELDS,
] as const;

// ── types ────────────────────────────────────────────────────────────────────

export type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];
export type RowsMode = 'resolved' | 'individual';
export type Row = Record<string, unknown>;
export type EsqlRunner = (q: string) => Promise<Row[]>;
export type SortDir = 'asc' | 'desc';
/** A sort column value in a cursor. Sort columns hold strings, numbers or null. */
export type SortValue = string | number | null;

export interface PageCursor {
  sortField: string;
  sortDirection: SortDir;
  sortValue: SortValue;
  entityId: string;
}

export interface QueryArgs {
  namespace: string;
  timeRange: TimeRange;
  sort: { field: string; direction: SortDir };
  cursor: PageCursor | null;
  pageSize: number;
  rowsMode: RowsMode;
  /** Concrete (non-alias) entity store index name — required for ES|QL LOOKUP JOIN from the browser. */
  concreteEntityIndexName: string;
  /**
   * Lucene-pushable search bar predicates (KQL / filter pills / group filters).
   * Applied as `| WHERE …` on entity docs: the entities in view, or group members.
   */
  searchExpression?: string;
  /**
   * Entity doc predicates (URL entity filters, tile id IN-lists).
   * Applied as `| WHERE …` on entity docs: the entities in view, or after the group join.
   */
  entityExpression?: string;
  /** Extra native entity-doc fields from Fields (not catalog / not enrich). */
  keepFields?: readonly string[];
  /** Installed security ML jobs; the anomaly columns count only their records. */
  anomalyJobIds: readonly string[];
}

export interface RunContext {
  runQuery: EsqlRunner;
  http: HttpSetup;
  signal?: AbortSignal;
}

/** Fields an enricher read, per entity id; `null` when its query failed. */
export type EnrichedFields = ReadonlyMap<string, Row> | null;

/** Reads computed fields of the page rows after the sort query. */
export interface PageEnricher {
  /** Row fields it reads. */
  fields: readonly string[];
  read: (rows: readonly Row[], args: QueryArgs, ctx: RunContext) => Promise<EnrichedFields>;
}

export interface SortPageContext {
  runQuery: EsqlRunner;
  /** Number of entities in view, from the count query. */
  viewSize: number;
}

/** How the grid sorts by a column. */
export interface SortQuerySpec {
  /** Builds the query for one page of rows plus one, sorted by this column. */
  buildSortQuery: (args: QueryArgs) => string;
  /** Builds the query for the total row count when this column is the sort. */
  buildCountQuery: (args: QueryArgs) => string;
  /**
   * Loads one page of rows plus one with more than one query, for views where that is
   * cheaper than `buildSortQuery`. Returns the same rows as `buildSortQuery`.
   */
  runSortPage?: (args: QueryArgs, ctx: SortPageContext) => Promise<Row[]>;
}

/** How the grid reads a column: its sort, if it has one, and the enricher of its values. */
export interface ColumnQuerySpec {
  sort?: SortQuerySpec;
  enricher?: PageEnricher;
}

// ── index name helpers ────────────────────────────────────────────────────────

export const entityAliasOf = (namespace: string) => getEntitiesAlias(ENTITY_LATEST, namespace);
export const alertsIndexOf = (namespace: string) => `.alerts-security.alerts-${namespace}`;
export const riskScoreIndexOf = (namespace: string) => `risk-score.risk-score-${namespace}`;

// ── ML anomalies ─────────────────────────────────────────────────────────────
// One definition of an entity anomaly, shared by the anomalies tile and column.

export const ML_ANOMALY_INDICES = '.ml-anomalies-shared*';

/** Final anomaly records with a score. */
export const ANOMALY_RECORD_FILTER =
  'result_type == "record" AND is_interim == false AND record_score >= 1';

/** Records of the installed security jobs; matches nothing when there are none. */
export const buildAnomalyJobFilter = (jobIds: readonly string[]): string =>
  jobIds.length ? `job_id IN (${toList(jobIds)})` : 'false';

// ── primitives ───────────────────────────────────────────────────────────────

export const esc = (s: string) =>
  `"${s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}"`;

export const toList = (items: readonly string[]) => items.map(esc).join(', ');

/** Raw identity fields that EUIDs are built from. */
const IDENTITY_SOURCE_FIELDS = [
  ...new Set(ALLOWED_ENTITY_TYPES.flatMap((t) => getEuidSourceFields(t).identitySourceFields)),
];

const stringValuesOf = (value: unknown): string[] =>
  [value].flat().filter((v): v is string => typeof v === 'string' && v !== '');

/**
 * Pushable prefilter: `field IN (…)` over the identity values of `rows`.
 * It matches a superset of the documents whose derived EUID is one of the rows' ids, so it
 * can run before the EUID evaluation, which casts fields with `TO_STRING` and can't be
 * pushed down. Must be its own top-level `WHERE` to reach Lucene.
 */
export const buildIdentityPrefilter = (rows: readonly Row[]): string | undefined => {
  const parts = IDENTITY_SOURCE_FIELDS.flatMap((field) => {
    const values = [...new Set(rows.flatMap((row) => stringValuesOf(row[field])))];
    return values.length ? [`${field} IN (${toList(values)})`] : [];
  });
  return parts.length ? parts.join(' OR ') : undefined;
};

const quoteField = (f: string) => (/[@\s]/.test(f) ? `\`${f}\`` : f);

export const buildKeepClause = (
  args: Pick<QueryArgs, 'keepFields'>,
  ...extra: string[]
): string => {
  const fields = [...new Set([...ENTITY_FIELDS, ...(args.keepFields ?? []), ...extra])];
  return `| KEEP ${fields.map(quoteField).join(', ')}`;
};

export const buildResolvedRowsFilter = (rowsMode: QueryArgs['rowsMode']): string[] =>
  rowsMode === 'resolved' ? [`| WHERE ${RESOLVED_TO_FIELD} IS NULL`] : [];

export const buildFilterClause = (filterExpression?: string): string[] =>
  filterExpression ? [`| WHERE ${filterExpression}`] : [];

/** AND-join ES|QL boolean fragments; `undefined` when empty. */
export const joinAnd = (...parts: Array<string | undefined | null | false>): string | undefined => {
  const filtered = parts.filter((p): p is string => typeof p === 'string' && p.length > 0);
  return filtered.length ? filtered.join(' AND ') : undefined;
};

/** `| WHERE search AND entity` for native (entity-index) sorts. */
export const buildCombinedFilterClause = (
  searchExpression?: string,
  entityExpression?: string
): string[] => buildFilterClause(joinAnd(searchExpression, entityExpression));

/**
 * Joins entity docs on `entity.id` only. The search expression must not go in `ON`:
 * ES|QL rejects KQL there. The join needs a concrete index name, not the alias.
 */
export const buildLookupJoinClause = (concreteEntityIndexName: string): string =>
  `| LOOKUP JOIN ${concreteEntityIndexName} ON \`entity.id\``;

export const toRows = ({
  columns,
  values,
}: Pick<ESQLSearchResponse, 'columns' | 'values'>): Row[] =>
  values.map((row) => Object.fromEntries(columns.map((col, i) => [col.name, row[i]])));

// ── row readers ──────────────────────────────────────────────────────────────

/** Reads a string field of a row; `undefined` when it is absent or not a string. */
export const getString = (row: Row, field: string): string | undefined => {
  const value = row[field];
  return typeof value === 'string' ? value : undefined;
};

/** Reads a number field of a row; `undefined` when it is absent or not a number. */
export const getNumber = (row: Row, field: string): number | undefined => {
  const value = row[field];
  return typeof value === 'number' ? value : undefined;
};

export const getEntityId = (row: Row): string | undefined => getString(row, ENTITY_ID_FIELD);

/** Entity ids of the rows, without rows that have no id. */
export const entityIdsOf = (rows: readonly Row[]): string[] =>
  rows.flatMap((row) => getEntityId(row) ?? []);

/** Narrows a sort column value for a cursor. */
export const toSortValue = (value: unknown): SortValue =>
  typeof value === 'string' || typeof value === 'number' ? value : null;

/** Pin ES|QL to the current project; CPS space default is often `_alias:*`. */
export const ESQL_PROJECT_ROUTING = '_alias:_origin' as const;

export const createEsqlRunner = (
  searchService: DataPublicPluginStart['search'],
  signal?: AbortSignal
): EsqlRunner => {
  return async (query) => {
    const { rawResponse } = await lastValueFrom(
      searchService.search<
        IKibanaSearchRequest<{ query: string }>,
        IKibanaSearchResponse<ESQLSearchResponse>
      >(
        { params: { query } },
        {
          abortSignal: signal,
          strategy: 'esql_async',
          projectRouting: ESQL_PROJECT_ROUTING,
        }
      )
    );
    return toRows(rawResponse);
  };
};

/** ISO timestamp at the start of the time range. Alert and anomaly queries filter on it. */
export const lookbackCutoff = (range: TimeRange): string =>
  new Date(Date.now() - TIME_RANGE_DAYS[range] * MS_PER_DAY).toISOString();

/**
 * Resolves to `null` when an enrich request fails, so one enricher cannot fail the page.
 * An abort still rejects: the query key changed and the caller drops the result.
 */
export const nullOnFailure = <T>(request: Promise<T>): Promise<T | null> =>
  request.catch((err) => {
    if (isAbortError(err)) throw err;
    return null;
  });

// ── cursors ──────────────────────────────────────────────────────────────────

/**
 * Keeps the rows after the cursor in `SORT field <dir> NULLS LAST, entity.id ASC` order.
 * Null sort values come last, so every page after a non-null cursor also keeps them.
 */
export const buildCursorClause = (cursor: PageCursor | null): string[] => {
  if (cursor == null) return [];
  const { sortField, sortValue, sortDirection, entityId } = cursor;
  if (sortValue == null) {
    return [`| WHERE ${sortField} IS NULL AND ${ENTITY_ID_FIELD} > ${esc(entityId)}`];
  }
  const op = sortDirection === 'desc' ? '<' : '>';
  const val = typeof sortValue === 'string' ? esc(sortValue) : String(sortValue);
  const tieBreaker = `${sortField} == ${val} AND ${ENTITY_ID_FIELD} > ${esc(entityId)}`;
  return [`| WHERE (${sortField} ${op} ${val}) OR (${tieBreaker}) OR ${sortField} IS NULL`];
};

export const buildSortSuffix = (field: string, dir: SortDir, pageSize: number): string =>
  [
    `| SORT ${field} ${dir.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${pageSize + 1}`,
  ].join('\n');

export const ENTITY_TYPE_FILTER = `${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`;

// ── entities in view ─────────────────────────────────────────────────────────

/** Conditions on entity docs that make them rows of the grid (rows mode and filters). */
export const buildEntitiesInViewConditions = ({
  rowsMode,
  searchExpression,
  entityExpression,
}: QueryArgs): string[] => [
  ENTITY_TYPE_FILTER,
  ...(rowsMode === 'resolved' ? [`${RESOLVED_TO_FIELD} IS NULL`] : []),
  ...(searchExpression ? [searchExpression] : []),
  ...(entityExpression ? [entityExpression] : []),
];

/** Entity docs that are rows of the grid for the current rows mode and filters. */
export const buildEntitiesInViewSteps = (args: QueryArgs): string[] => [
  `FROM ${entityAliasOf(args.namespace)}`,
  ...buildEntitiesInViewConditions(args).map((condition) => `| WHERE ${condition}`),
];

/** Number of grid rows: every sort except group size lists exactly the entities in view. */
export const buildEntitiesInViewCountQuery = (args: QueryArgs): string =>
  [...buildEntitiesInViewSteps(args), `| STATS total = COUNT(*)`].join('\n');

/** Marks rows that come from the entities in view rather than from the foreign index. */
export const IN_VIEW_FIELD = '_in_view';

// ── foreign sorts ────────────────────────────────────────────────────────────

/**
 * Page rows of a foreign sort, after the merge produced one row per entity in view with
 * the sort value (null or 0 when the foreign index has nothing for it). Sorting and
 * limiting before the join keeps the join to the page rows: it runs after STATS, on the
 * coordinator, so joining every merged row is what made foreign sorts slow.
 */
export const buildForeignSortPageSteps = (
  args: QueryArgs,
  sortField: string,
  extraFields: readonly string[] = []
): string[] => [
  ...buildCursorClause(args.cursor),
  buildSortSuffix(sortField, args.sort.direction, args.pageSize),
  buildLookupJoinClause(args.concreteEntityIndexName),
  buildKeepClause(args, sortField, ...extraFields),
  // LOOKUP JOIN may not keep the input order.
  buildSortSuffix(sortField, args.sort.direction, args.pageSize),
];

export interface MergedForeignRowsOptions {
  /** Statements that go before the query, for example `SET …;`. */
  settings?: readonly string[];
  /** Pipeline over the foreign index that ends in `STATS … BY entity.id`. */
  foreignRows: readonly string[];
  /** Entity doc fields the merge needs besides `entity.id`. */
  entityFields?: readonly string[];
  /** Conditions on the entities side besides being in view. */
  entityConditions?: readonly string[];
  /** Merge aggregations that carry the foreign columns, e.g. `x = MAX(x)`. */
  mergeAggregations: readonly string[];
  /** Steps after the merge that compute the sort column. */
  afterMerge?: readonly string[];
}

interface MergedForeignSortOptions extends MergedForeignRowsOptions {
  sortField: string;
}

/**
 * One row per entity in view with its foreign columns: the foreign aggregation and the
 * entities in view are read side by side and merged by `entity.id`, so entities without
 * foreign data stay as rows. Filters apply to the entities side.
 */
export const buildMergedForeignRows = (
  args: QueryArgs,
  {
    settings = [],
    foreignRows,
    entityFields = [],
    entityConditions = [],
    mergeAggregations,
    afterMerge = [],
  }: MergedForeignRowsOptions
): string[] => [
  ...settings,
  'FROM (',
  ...foreignRows,
  '), (',
  ...buildEntitiesInViewSteps(args),
  ...entityConditions.map((condition) => `| WHERE ${condition}`),
  `| EVAL ${IN_VIEW_FIELD} = 1`,
  `| KEEP ${[`\`${ENTITY_ID_FIELD}\``, IN_VIEW_FIELD, ...entityFields].join(', ')}`,
  ')',
  `| STATS ${[...mergeAggregations, `${IN_VIEW_FIELD} = MAX(${IN_VIEW_FIELD})`].join(
    ', '
  )} BY \`${ENTITY_ID_FIELD}\``,
  `| WHERE ${IN_VIEW_FIELD} == 1`,
  ...afterMerge,
];

/**
 * Sort query for a foreign column that keeps every entity in view (see
 * {@link buildMergedForeignRows}): entities without foreign data sort last, so the
 * result matches the native sorts' rows and their count.
 */
export const buildMergedForeignSortQuery = (
  args: QueryArgs,
  { sortField, ...options }: MergedForeignSortOptions
): string =>
  [...buildMergedForeignRows(args, options), ...buildForeignSortPageSteps(args, sortField)].join(
    '\n'
  );

// ── EUID query pipeline builders ─────────────────────────────────────────────

/**
 * Derives one EUID per document into `entity.id` (first of user, host, service).
 * Anomaly queries use it: ML records do not carry `entity.id`.
 */
export const buildEuidStages = (): string[] => {
  const parts: string[] = [];
  for (const entityType of ALLOWED_ENTITY_TYPES) {
    const fieldEvals = getFieldEvaluationsEsql(entityType);
    if (fieldEvals) parts.push(`| EVAL ${fieldEvals}`);
    parts.push(`| EVAL ${getEuidEsqlEvaluation(entityType, `${entityType}_euid`)}`);
  }
  parts.push(
    `| EVAL \`entity.id\` = COALESCE(${ALLOWED_ENTITY_TYPES.map((t) => `${t}_euid`).join(', ')})`
  );
  parts.push('| WHERE `entity.id` IS NOT NULL');
  return parts;
};

/**
 * Puts the user, host and service EUIDs into one multi-value column.
 * `MV_APPEND` returns null when an argument is null. Each slot is a rotated COALESCE,
 * which is not null when any EUID exists, and MV_DEDUPE removes the repeats.
 * This is about 3.5x faster than a CASE over every null combination.
 */
const evalTypedEuidsAsMultiValue = (outputColumn: string): string =>
  [
    `| EVAL ${outputColumn} = MV_DEDUPE(MV_APPEND(MV_APPEND(`,
    '  COALESCE(user_euid, host_euid, service_euid),',
    '  COALESCE(host_euid, service_euid, user_euid)),',
    '  COALESCE(service_euid, user_euid, host_euid)))',
  ].join('\n');

const indentForkBranch = (esql: string): string =>
  esql
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

export interface AlertEuidPipelineOptions {
  /** When set, the stamped branch keeps only alerts stamped with one of these entity ids. */
  stampedEntityIds?: readonly string[];
  /**
   * Exact filter for the unstamped branch: an OR of `getEuidEsqlFilterBasedOnDocument`
   * clauses. When `stampedEntityIds` is set and this is not, the unstamped branch is
   * off (`WHERE false`), so the enrich query does not scan all unstamped alerts.
   */
  unstampedIdentityClause?: string;
  /**
   * Pushable prefilter for `unstampedIdentityClause`. It must be its own top-level
   * conjunct: nested inside the clause's parentheses, ES|QL does not push it down.
   */
  unstampedIdentityPrefilter?: string;
  /** Condition both alert branches add, when the FROM also reads other indices. */
  alertBranchCondition?: string;
  /** Steps of an extra FORK branch, which must emit `_ea_entity_id` like the alert branches. */
  extraBranch?: readonly string[];
}

/**
 * Maps alert documents to `entity.id` rows. FORK splits the work:
 * - Stamped alerts copy `kibana.alert.entity.id`, which can be multi-value.
 * - Unstamped alerts derive the user, host and service EUIDs from raw fields.
 * The split keeps the EUID `EVAL`s off stamped alerts. MV_EXPAND then makes
 * `entity.id` single-value for STATS and LOOKUP JOIN.
 */
export const buildAlertEuidPipeline = (options: AlertEuidPipelineOptions = {}): string[] => {
  const {
    stampedEntityIds,
    unstampedIdentityClause,
    unstampedIdentityPrefilter,
    alertBranchCondition,
    extraBranch,
  } = options;
  const guard = alertBranchCondition ? [`(${alertBranchCondition})`] : [];
  const idsList = stampedEntityIds?.length ? toList(stampedEntityIds) : undefined;
  const keepCols = ['`@timestamp`', '`kibana.alert.severity`', '_ea_entity_id'].join(', ');

  const stampedSteps = [
    `WHERE ${[...guard, '`kibana.alert.entity.id` IS NOT NULL'].join(' AND ')}`,
    ...(idsList ? [`| WHERE \`kibana.alert.entity.id\` IN (${idsList})`] : []),
    '| EVAL _ea_entity_id = `kibana.alert.entity.id`',
    `| KEEP ${keepCols}`,
  ];

  const unstampedEvals: string[] = [];
  for (const entityType of ALLOWED_ENTITY_TYPES) {
    const fieldEvals = getFieldEvaluationsEsql(entityType);
    if (fieldEvals) unstampedEvals.push(`| EVAL ${fieldEvals}`);
    unstampedEvals.push(`| EVAL ${getEuidEsqlEvaluation(entityType, `${entityType}_euid`)}`);
  }
  unstampedEvals.push(evalTypedEuidsAsMultiValue('_ea_entity_id'));

  let unstampedWhere: string;
  if (idsList != null && unstampedIdentityClause == null) {
    unstampedWhere = 'WHERE false';
  } else if (unstampedIdentityClause != null) {
    const conjuncts = [
      ...guard,
      '`kibana.alert.entity.id` IS NULL',
      ...(unstampedIdentityPrefilter ? [`(${unstampedIdentityPrefilter})`] : []),
      `(${unstampedIdentityClause})`,
    ];
    unstampedWhere = `WHERE ${conjuncts.join(' AND ')}`;
  } else {
    unstampedWhere = `WHERE ${[...guard, '`kibana.alert.entity.id` IS NULL'].join(' AND ')}`;
  }

  const unstampedSteps = [unstampedWhere, ...unstampedEvals, `| KEEP ${keepCols}`];

  const fork = [
    '| FORK (',
    indentForkBranch(stampedSteps.join('\n')),
    '  )',
    '  (',
    indentForkBranch(unstampedSteps.join('\n')),
    '  )',
    ...(extraBranch ? ['  (', indentForkBranch(extraBranch.join('\n')), '  )'] : []),
  ].join('\n');

  return [
    fork,
    '| MV_EXPAND _ea_entity_id',
    '| WHERE _ea_entity_id IS NOT NULL',
    '| RENAME _ea_entity_id AS `entity.id`',
  ];
};

// ── grid config ───────────────────────────────────────────────────────────────

export const PAGE_SIZE_OPTIONS = [10, 25, 50];

export const RESOLUTION_GROUPING_ID = 'ea-new-home-resolution';

export interface EntityGridResponse {
  entities: Array<Record<string, unknown>>;
  next_cursor: PageCursor | null;
  total: number | null;
}

/** A sort query may already have read an enricher's fields, e.g. the alert sort its counts. */
const lacksFields = (rows: readonly Row[], { fields }: PageEnricher): boolean =>
  fields.some((field) => rows.some((row) => !(field in row)));

/**
 * Copies of `rows` with the fields of every enricher they lack. A failed enricher leaves its
 * fields unset.
 */
export const enrichEntityRows = async (
  rows: readonly Row[],
  args: QueryArgs,
  ctx: RunContext,
  enrichers: readonly PageEnricher[]
): Promise<Row[]> => {
  const results = await Promise.all(
    enrichers
      .filter((enricher) => lacksFields(rows, enricher))
      .map(({ read }) => read(rows, args, ctx))
  );
  return rows.map((row) => {
    const id = getEntityId(row);
    return results.reduce<Row>(
      (merged, fields) => ({ ...merged, ...(id != null ? fields?.get(id) : undefined) }),
      { ...row }
    );
  });
};
