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
}

export interface RunContext {
  runQuery: EsqlRunner;
  http: HttpSetup;
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

export const buildKeepClause = (...extra: string[]): string => {
  const fields = [...new Set([...ENTITY_FIELDS, ...extra])];
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

/** Simple entity LOOKUP — join key only (no searchFilters in `ON`). */
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

export const alertLookbackCutoff = (range: TimeRange): string =>
  new Date(Date.now() - TIME_RANGE_DAYS[range] * MS_PER_DAY).toISOString();

// ── cursors ──────────────────────────────────────────────────────────────────

export const encodeCursor = (c: PageCursor): string => btoa(JSON.stringify(c));

export const decodeCursor = (s: string): PageCursor => {
  try {
    return JSON.parse(atob(s)) as PageCursor;
  } catch {
    throw new Error('invalid cursor');
  }
};

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

// ── EUID query pipeline builders ─────────────────────────────────────────────

/** Evaluates identity fields and COALESCEs into `entity.id`. Used for anomaly queries. */
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
 * Folds typed EUID columns into one multi-value column. `MV_APPEND` nulls if any
 * arg is null, so each combination is CASE-guarded (same pattern as NAT tiles).
 */
const evalGuardedTypedEuids = (outputColumn: string): string =>
  [
    `| EVAL ${outputColumn} = CASE(`,
    '  user_euid IS NOT NULL AND host_euid IS NOT NULL AND service_euid IS NOT NULL, MV_APPEND(MV_APPEND(user_euid, host_euid), service_euid),',
    '  user_euid IS NOT NULL AND host_euid IS NOT NULL, MV_APPEND(user_euid, host_euid),',
    '  user_euid IS NOT NULL AND service_euid IS NOT NULL, MV_APPEND(user_euid, service_euid),',
    '  host_euid IS NOT NULL AND service_euid IS NOT NULL, MV_APPEND(host_euid, service_euid),',
    '  user_euid IS NOT NULL, user_euid,',
    '  host_euid IS NOT NULL, host_euid,',
    '  service_euid',
    ')',
  ].join('\n');

const indentForkBranch = (esql: string): string =>
  esql
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

export interface AlertEuidPipelineOptions {
  /**
   * When set, the stamped FORK branch only keeps alerts whose
   * `kibana.alert.entity.id` is in this list (enrich path).
   */
  stampedEntityIds?: readonly string[];
  /**
   * ES|QL boolean expression narrowing the unstamped FORK branch (typically OR of
   * `getEuidEsqlFilterBasedOnDocument` clauses). When `stampedEntityIds` is set and
   * this is omitted, the unstamped branch is disabled (`WHERE false`) so enrich does
   * not scan the full unstamped alert set.
   */
  legacyIdentityClause?: string;
}

/**
 * EUID pipeline for alert documents.
 *
 * Stamped vs derived work is split with FORK so stamped alerts never pay for EUID
 * `EVAL`s (same approach as NAT tiles).
 *
 * - Stamped (`kibana.alert.entity.id`): copy that field (may already be multi-value).
 * - Unstamped: derive user/host/service EUIDs and combine with null-guarded MV_APPEND.
 *
 * MV_EXPAND makes `entity.id` scalar so STATS / LOOKUP JOIN keys stay single-valued.
 */
export const buildAlertEuidPipeline = (options: AlertEuidPipelineOptions = {}): string[] => {
  const { stampedEntityIds, legacyIdentityClause } = options;
  const idsList = stampedEntityIds?.length ? toList(stampedEntityIds) : undefined;
  const keepCols = ['`@timestamp`', '`kibana.alert.severity`', '_ea_entity_id'].join(', ');

  const stampedSteps = [
    'WHERE `kibana.alert.entity.id` IS NOT NULL',
    ...(idsList ? [`| WHERE \`kibana.alert.entity.id\` IN (${idsList})`] : []),
    '| EVAL _ea_entity_id = `kibana.alert.entity.id`',
    `| KEEP ${keepCols}`,
  ];

  const derivedEvals: string[] = [];
  for (const entityType of ALLOWED_ENTITY_TYPES) {
    const fieldEvals = getFieldEvaluationsEsql(entityType);
    if (fieldEvals) derivedEvals.push(`| EVAL ${fieldEvals}`);
    derivedEvals.push(`| EVAL ${getEuidEsqlEvaluation(entityType, `${entityType}_euid`)}`);
  }
  derivedEvals.push(evalGuardedTypedEuids('_ea_entity_id'));

  let derivedWhere: string;
  if (idsList != null && legacyIdentityClause == null) {
    derivedWhere = 'WHERE false';
  } else if (legacyIdentityClause != null) {
    derivedWhere = `WHERE \`kibana.alert.entity.id\` IS NULL AND (${legacyIdentityClause})`;
  } else {
    derivedWhere = 'WHERE `kibana.alert.entity.id` IS NULL';
  }

  const derivedSteps = [derivedWhere, ...derivedEvals, `| KEEP ${keepCols}`];

  const fork = [
    '| FORK (',
    indentForkBranch(stampedSteps.join('\n')),
    '  )',
    '  (',
    indentForkBranch(derivedSteps.join('\n')),
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
