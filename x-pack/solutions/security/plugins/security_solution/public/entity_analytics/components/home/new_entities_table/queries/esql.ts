/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import { getEuidSourceFields } from '@kbn/entity-store/common/domain/euid';
import { DEFAULT_ALERTS_INDEX } from '../../../../../../common/constants';
import { getRiskScoreTimeSeriesIndex } from '../../../../../../common/entity_analytics/risk_engine';
import {
  ALLOWED_ENTITY_TYPES,
  ENTITY_FIELDS,
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FIELD,
  TIME_RANGE_DAYS,
} from '../common';
import type { PageCursor, QueryArgs, Row, SortDir, TimeRange } from '../common';

// ── index name helpers ────────────────────────────────────────────────────────

export const getEntityAlias = (namespace: string) => getEntitiesAlias(ENTITY_LATEST, namespace);
export const getAlertsIndex = (namespace: string) => `${DEFAULT_ALERTS_INDEX}-${namespace}`;
export const getRiskScoreIndex = (namespace: string) => getRiskScoreTimeSeriesIndex(namespace);

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

const getStringValues = (value: unknown): string[] =>
  [value].flat().filter((v): v is string => typeof v === 'string' && v !== '');

/**
 * Pushable prefilter: `field IN (…)` over the identity values of `rows`.
 * It matches a superset of the documents whose derived EUID is one of the rows' ids, so it
 * can run before the EUID evaluation, which casts fields with `TO_STRING` and can't be
 * pushed down. Must be its own top-level `WHERE` to reach Lucene.
 */
export const buildIdentityPrefilter = (rows: readonly Row[]): string | undefined => {
  const parts = IDENTITY_SOURCE_FIELDS.flatMap((field) => {
    const values = [...new Set(rows.flatMap((row) => getStringValues(row[field])))];
    return values.length ? [`${field} IN (${toList(values)})`] : [];
  });
  return parts.length ? parts.join(' OR ') : undefined;
};

/** ES|QL field names without quotes: letters, digits, `_` and `.`, not starting with a digit. */
const PLAIN_FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_.]*$/;

/**
 * Backticks a field name unless it is plain, e.g. `@timestamp` or a field picked in Fields
 * with `-` or `:`. A backtick in the name is doubled.
 */
const quoteField = (field: string): string =>
  PLAIN_FIELD_NAME.test(field) ? field : `\`${field.replace(/`/g, '``')}\``;

export const buildKeepClause = (
  args: Pick<QueryArgs, 'keepFields'>,
  ...extra: string[]
): string => {
  const fields = [...new Set([...ENTITY_FIELDS, ...(args.keepFields ?? []), ...extra])];
  return `| KEEP ${fields.map(quoteField).join(', ')}`;
};

export const buildFilterClause = (filterExpression?: string): string[] =>
  filterExpression ? [`| WHERE ${filterExpression}`] : [];

/** AND-join ES|QL boolean fragments; `undefined` when empty. */
export const joinAnd = (...parts: Array<string | undefined | null | false>): string | undefined => {
  const filtered = parts.filter((p): p is string => typeof p === 'string' && p.length > 0);
  return filtered.length ? filtered.join(' AND ') : undefined;
};

/**
 * Joins entity docs on `entity.id` only. The search expression must not go in `ON`:
 * ES|QL rejects KQL there. The join needs a concrete index name, not the alias.
 */
export const buildLookupJoinClause = (concreteEntityIndexName: string): string =>
  `| LOOKUP JOIN ${concreteEntityIndexName} ON \`entity.id\``;

/**
 * Start of the time range as ES|QL date math, e.g. `NOW() - 30 days`. Every grid and tile
 * query filters on it, so they agree on the window, and ES|QL folds it into a constant that
 * still pushes down to Lucene.
 *
 * Checked (10M entities, 16GB ECH, Oct 2026): against the earlier bounds (a browser-computed
 * ISO timestamp in some queries), 47 of 48 grid and tile queries over 24h, 7d and 30d
 * returned the same rows at the same speed; the other differed only because the window moved
 * between the two runs.
 */
export const buildLookback = (range: TimeRange): string => `NOW() - ${TIME_RANGE_DAYS[range]} days`;

// ── cursors ──────────────────────────────────────────────────────────────────

/**
 * Keeps the rows after the cursor in `SORT field <dir> NULLS LAST, entity.id ASC` order.
 * Null sort values come last, so every page after a non-null cursor also keeps them.
 */
export const buildCursorClause = (cursor: PageCursor | null): string[] => {
  if (cursor == null) return [];
  const { sortField, sortValue, entityId } = cursor;
  if (sortValue == null) {
    return [`| WHERE ${sortField} IS NULL AND ${ENTITY_ID_FIELD} > ${esc(entityId)}`];
  }
  return [`| WHERE ${buildAfterValuePredicate(cursor, sortValue)} OR ${sortField} IS NULL`];
};

/** Rows after a cursor with a non-null sort value, in `SORT field <dir>, entity.id ASC` order. */
export const buildAfterValuePredicate = (
  { sortField, sortDirection, entityId }: PageCursor,
  sortValue: string | number
): string => {
  const op = sortDirection === 'desc' ? '<' : '>';
  const val = typeof sortValue === 'string' ? esc(sortValue) : String(sortValue);
  return `(${sortField} ${op} ${val}) OR (${sortField} == ${val} AND ${ENTITY_ID_FIELD} > ${esc(
    entityId
  )})`;
};

/** Keeps the entities after `afterId`, for pages sorted by `entity.id` alone. */
export const buildAfterIdClause = (afterId: string | null): string[] =>
  afterId != null ? [`| WHERE ${ENTITY_ID_FIELD} > ${esc(afterId)}`] : [];

export const buildSortSuffix = (field: string, dir: SortDir, pageSize: number): string =>
  [
    `| SORT ${field} ${dir.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${pageSize + 1}`,
  ].join('\n');

/**
 * Page rows after a STATS that produced one row per entity with the sort value: sort and
 * limit, then join the entity docs of just the page rows. The join runs after STATS, on the
 * coordinator, so joining every row before the limit is what made these sorts slow.
 */
export const buildJoinedPageSteps = (
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

export const ENTITY_TYPE_FILTER = `${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`;

/** Indents the steps of a FORK branch under its parentheses. */
export const indentForkBranch = (esql: string): string =>
  esql
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
