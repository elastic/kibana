/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import {
  getFieldEvaluationsEsql,
  getEuidEsqlEvaluation,
  getEuidSourceFields,
} from '@kbn/entity-store/common/domain/euid';
import type { EuiDataGridColumn } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
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

/** Identity fields from entity definitions — needed for alert enrich reverse-identity prefilter. */
const IDENTITY_KEEP_FIELDS = [
  ...new Set([
    ...ALLOWED_ENTITY_TYPES.flatMap((t) => getEuidSourceFields(t).identitySourceFields),
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

export interface PageCursor {
  sortField: string;
  sortDirection: SortDir;
  sortValue: unknown;
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
   * Native / group_size inner: `| WHERE …`.
   * Other foreign sorts: `| WHERE entity.id IN (FROM entities | WHERE … | KEEP entity.id)`.
   */
  searchExpression?: string;
  /**
   * LOOKUP-safe predicates (URL entity filters, tile id IN-lists).
   * Always applied as `| WHERE …` (after LOOKUP on foreign sorts).
   */
  entityExpression?: string;
  /** Extra native entity-doc fields from Fields (not catalog / not enrich). */
  keepFields?: readonly string[];
}

export interface RunContext {
  runQuery: EsqlRunner;
  http: HttpSetup;
  signal?: AbortSignal;
}

export type EnrichFn = (
  rows: Row[],
  args: QueryArgs,
  skip: Set<string>,
  ctx: RunContext
) => Promise<void>;

export interface ColumnDataHandlers {
  /** Builds the paginated ES|QL query used to fetch a page of rows when this column is the active sort. */
  buildSortQuery?: (args: QueryArgs) => string;
  /** Builds the ES|QL query used to count total matching rows for pagination when this column is the active sort. */
  buildCountQuery?: (args: QueryArgs) => string;
  /** Runs after a page fetch to enrich rows with data that cannot be expressed in a single ES|QL query (e.g. alert counts via a separate request). */
  enrichPage?: EnrichFn;
}

export interface ColumnDescriptor extends EuiDataGridColumn, ColumnDataHandlers {}

// ── index name helpers ────────────────────────────────────────────────────────

export const entityAliasOf = (namespace: string) => getEntitiesAlias(ENTITY_LATEST, namespace);
export const alertsIndexOf = (namespace: string) => `.alerts-security.alerts-${namespace}`;
export const riskScoreIndexOf = (namespace: string) => `risk-score.risk-score-${namespace}`;
export const ML_ANOMALY_INDICES = '.ml-anomalies-*';

// ── primitives ───────────────────────────────────────────────────────────────

export const esc = (s: string) =>
  `"${s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}"`;

export const toList = (items: readonly string[]) => items.map(esc).join(', ');

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

/**
 * Constrain foreign-sort rows to entities matching searchFilters.
 * `KQL` / `:` are illegal after `STATS` (including in `LOOKUP JOIN ON`), so run them in an
 * independent entities subquery via `IN` (ES|QL IN-subquery, preview since 9.5).
 */
export const buildSearchIdInClause = (
  entityIndexPattern: string,
  searchExpression?: string
): string[] =>
  searchExpression
    ? [
        `| WHERE \`entity.id\` IN (FROM ${entityIndexPattern} | WHERE ${searchExpression} | KEEP \`entity.id\`)`,
      ]
    : [];

export const toRows = (raw: { columns: Array<{ name: string }>; values: unknown[][] }): Row[] =>
  raw.values.map((row) => Object.fromEntries(raw.columns.map((col, i) => [col.name, row[i]])));

export const esqlResponseToRows = (result: unknown): Row[] =>
  toRows(
    (result as { rawResponse: { columns: Array<{ name: string }>; values: unknown[][] } })
      .rawResponse
  );

/** Pin ES|QL to the current project; CPS space default is often `_alias:*`. */
export const ESQL_PROJECT_ROUTING = '_alias:_origin' as const;

export const createEsqlRunner = (
  searchService: DataPublicPluginStart['search'],
  signal?: AbortSignal
): EsqlRunner => {
  return async (query) =>
    esqlResponseToRows(
      await lastValueFrom(
        searchService.search(
          { params: { query } },
          {
            abortSignal: signal,
            strategy: 'esql_async',
            projectRouting: ESQL_PROJECT_ROUTING,
          }
        )
      )
    );
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

export const encodeCursor = (c: PageCursor): string => btoa(JSON.stringify(c));

export const decodeCursor = (s: string): PageCursor => {
  try {
    return JSON.parse(atob(s)) as PageCursor;
  } catch {
    throw new Error('invalid cursor');
  }
};

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

// ── foreign sorts ────────────────────────────────────────────────────────────

/**
 * Joins entity docs onto `STATS … BY entity.id` rows and applies the grid filters.
 * The search expression runs in an entities subquery: ES|QL rejects KQL after STATS.
 * The entity expression runs after the join, so it can use any entity doc field.
 */
export const buildForeignSortFilterSteps = (
  { namespace, rowsMode, concreteEntityIndexName, searchExpression, entityExpression }: QueryArgs,
  entityCondition: string = ENTITY_TYPE_FILTER
): string[] => [
  ...buildSearchIdInClause(entityAliasOf(namespace), searchExpression),
  buildLookupJoinClause(concreteEntityIndexName),
  `| WHERE ${entityCondition}`,
  ...buildResolvedRowsFilter(rowsMode),
  ...buildFilterClause(entityExpression),
];

interface ForeignSortQueryOptions {
  /** Pipeline that ends in `STATS <sortField> = … BY entity.id`. */
  baseQuery: string;
  sortField: string;
  /** Statements that go before the query, for example `SET …;`. */
  settings?: readonly string[];
}

/** Sort and count queries for a foreign sort. */
export const buildForeignSortQueries = (
  args: QueryArgs,
  { baseQuery, sortField, settings = [] }: ForeignSortQueryOptions
): { sort: string; count: string } => {
  const filtered = [baseQuery, ...buildForeignSortFilterSteps(args)];
  const page = [...filtered, buildKeepClause(args, sortField), ...buildCursorClause(args.cursor)];
  return {
    sort: [
      ...settings,
      'FROM (',
      page.join('\n'),
      ')',
      buildSortSuffix(sortField, args.sort.direction, args.pageSize),
    ].join('\n'),
    count: [
      ...settings,
      ...filtered,
      `| KEEP \`${ENTITY_ID_FIELD}\``,
      '| STATS total = COUNT(*)',
    ].join('\n'),
  };
};

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
}

/**
 * Maps alert documents to `entity.id` rows. FORK splits the work:
 * - Stamped alerts copy `kibana.alert.entity.id`, which can be multi-value.
 * - Unstamped alerts derive the user, host and service EUIDs from raw fields.
 * The split keeps the EUID `EVAL`s off stamped alerts. MV_EXPAND then makes
 * `entity.id` single-value for STATS and LOOKUP JOIN.
 */
export const buildAlertEuidPipeline = (options: AlertEuidPipelineOptions = {}): string[] => {
  const { stampedEntityIds, unstampedIdentityClause, unstampedIdentityPrefilter } = options;
  const idsList = stampedEntityIds?.length ? toList(stampedEntityIds) : undefined;
  const keepCols = ['`@timestamp`', '`kibana.alert.severity`', '_ea_entity_id'].join(', ');

  const stampedSteps = [
    'WHERE `kibana.alert.entity.id` IS NOT NULL',
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
      '`kibana.alert.entity.id` IS NULL',
      ...(unstampedIdentityPrefilter ? [`(${unstampedIdentityPrefilter})`] : []),
      `(${unstampedIdentityClause})`,
    ];
    unstampedWhere = `WHERE ${conjuncts.join(' AND ')}`;
  } else {
    unstampedWhere = 'WHERE `kibana.alert.entity.id` IS NULL';
  }

  const unstampedSteps = [unstampedWhere, ...unstampedEvals, `| KEEP ${keepCols}`];

  const fork = [
    '| FORK (',
    indentForkBranch(stampedSteps.join('\n')),
    '  )',
    '  (',
    indentForkBranch(unstampedSteps.join('\n')),
    '  )',
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
  next_cursor: string | null;
  total: number | null;
}

/** Runs all page enrichers on a shallow copy of `rows` (enrichers mutate in place). */
export const enrichEntityRows = async (
  rows: Row[],
  args: QueryArgs,
  skip: Set<string>,
  ctx: RunContext,
  enrichFns: EnrichFn[]
): Promise<Row[]> => {
  const copy = rows.map((row) => ({ ...row }));
  await Promise.all(enrichFns.map((fn) => fn(copy, args, skip, ctx)));
  return copy;
};
