/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import { getEuidSourceFields } from '@kbn/entity-store/common/domain/euid';
import { getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { lastValueFrom } from 'rxjs';
import { DEFAULT_ALERTS_INDEX } from '../../../../../../common/constants';
import { getRiskScoreTimeSeriesIndex } from '../../../../../../common/entity_analytics/risk_engine';
import {
  ALLOWED_ENTITY_TYPES,
  ENTITY_FIELDS,
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FIELD,
  RESOLVED_TO_FIELD,
  RESOLUTION_RISK_SCORE_FIELD,
  RISK_SCORE_NORM_FIELD,
  getEntityId,
} from '../common';
import type { QueryArgs, Row, SortDir, TimeRange } from '../common';
import type { EsqlRunner } from './types';

// ── index name helpers ───────────────────────────────────────────────────────

export const getEntityAlias = (namespace: string) => getEntitiesAlias(ENTITY_LATEST, namespace);
export const getAlertsIndex = (namespace: string) => `${DEFAULT_ALERTS_INDEX}-${namespace}`;
export const getRiskScoreIndex = (namespace: string) => getRiskScoreTimeSeriesIndex(namespace);

/**
 * Alert and anomaly indices don't map every EUID source field (for example `user.entity.id`);
 * with this setting an unmapped field reads as null instead of failing the query.
 */
export const SET_UNMAPPED_NULLIFY = 'SET unmapped_fields="nullify";';

export const RISK_SCORE_TYPE = `COALESCE(host.risk.score_type, user.risk.score_type, service.risk.score_type)`;

/**
 * Keeps the risk score docs of the entity itself. A resolution score is the entity's group
 * score, written next to the entity's own score with the same key and time; docs from before
 * the score types have no type and are the entity's own.
 */
export const OWN_RISK_SCORE_CONDITION = `(${RISK_SCORE_TYPE} IS NULL OR ${RISK_SCORE_TYPE} != "resolution")`;

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

/**
 * Most rows an ES|QL query returns, whatever its LIMIT: the default of the
 * `esql.query.result_truncation_max_size` cluster setting. A query that checks for "more than
 * N rows" must ask for at most this many.
 */
export const ESQL_MAX_RESULT_ROWS = 10_000;

/** Longest ES|QL query Elasticsearch parses, in characters (`EsqlParser.MAX_LENGTH`). */
export const ESQL_MAX_QUERY_LENGTH = 1_000_000;

export const toList = (items: readonly string[]) => items.map(escapeStringValue).join(', ');

/**
 * Upper bound on the groups with aliases that the entity filters keep. Below it, the size-one
 * branch reads enough targets to fill the page after dropping the targets that have aliases.
 * Above it, a page of size-one groups can come back short. The page, its extra row and the
 * groups are read in one query, so together they stay within the ES|QL result cap.
 */
export const getMaxAliasGroups = (pageSize: number): number => ESQL_MAX_RESULT_ROWS - pageSize - 1;

/**
 * Ids per IN list.
 *
 * Why: an ES|QL statement is capped at 1MB, and entity ids run to about 100 characters, so a
 * 10k-id list fails ("ESQL statement is too large"). 2,000 ids stays well under the cap.
 */
export const ID_LIST_CHUNK_SIZE = 2_000;

/** Runs one query per chunk of ids, in parallel, and concatenates the rows. */
export const fetchPerIdChunk = async (
  runQuery: EsqlRunner,
  ids: readonly string[],
  buildQuery: (chunk: readonly string[]) => string[]
): Promise<Row[]> => {
  const chunks: Array<readonly string[]> = [];
  for (let i = 0; i < ids.length; i += ID_LIST_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + ID_LIST_CHUNK_SIZE));
  }
  return (await Promise.all(chunks.map((chunk) => runQuery(buildQuery(chunk))))).flat();
};

/** Raw identity fields that EUIDs are built from. */
const IDENTITY_SOURCE_FIELDS = [
  ...new Set(
    ALLOWED_ENTITY_TYPES.flatMap(
      (t) => getEuidSourceFields(getBuiltInEntityDefinition(t)).identitySourceFields
    )
  ),
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

/**
 * The risk score of a resolved row: its resolved entity's, which the risk engine stores on the
 * main entity, the row; or its own when it has none.
 */
const buildResolvedRiskScoreSteps = (): string[] => [
  `| EVAL ${RISK_SCORE_NORM_FIELD} = COALESCE(${RESOLUTION_RISK_SCORE_FIELD}, ${RISK_SCORE_NORM_FIELD})`,
];

/** The risk score of a row: an entity's own, or a resolved entity's on resolved rows. */
export const buildRowRiskScoreSteps = ({ rowsMode }: Pick<QueryArgs, 'rowsMode'>): string[] =>
  rowsMode === 'resolved' ? buildResolvedRiskScoreSteps() : [];

/** KEEP the grid's fields, the fields picked in Fields, and `extra`. */
const buildKeepClause = (
  { keepFields }: Pick<QueryArgs, 'keepFields'>,
  ...extra: string[]
): string => {
  const fields = [...new Set([...ENTITY_FIELDS, ...(keepFields ?? []), ...extra])];
  return `| KEEP ${fields.map(quoteField).join(', ')}`;
};

/** The steps that make an entity doc a grid row: its risk score, then its fields. */
export const buildRowFieldsSteps = (
  args: Pick<QueryArgs, 'keepFields' | 'rowsMode'>,
  ...extra: string[]
): string[] => [...buildRowRiskScoreSteps(args), buildKeepClause(args, ...extra)];

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

const TIME_RANGE_DAYS = { '24h': 1, '7d': 7, '30d': 30 } as const;

/**
 * Start of the time range as ES|QL date math, e.g. `NOW() - 30 days`. Every grid and tile
 * query filters on it, so they agree on the window, and ES|QL folds it into a constant that
 * still pushes down to Lucene.
 */
export const buildLookback = (range: TimeRange): string => `NOW() - ${TIME_RANGE_DAYS[range]} days`;

/** The order of every grid page, `field <dir> NULLS LAST, entity.id ASC`, and its limit. */
export const buildSortSuffix = (field: string, direction: SortDir, limit: number): string[] => [
  `| SORT ${field} ${direction.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
  `| LIMIT ${limit}`,
];

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
  ...buildSortSuffix(sortField, args.sort.direction, args.pageSize + 1),
  buildLookupJoinClause(args.concreteEntityIndexName),
  ...buildRowFieldsSteps(args, sortField, ...extraFields),
  // LOOKUP JOIN may not keep the input order.
  ...buildSortSuffix(sortField, args.sort.direction, args.pageSize + 1),
];

export const ENTITY_TYPE_FILTER = `${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`;

/**
 * After a step that left one row per resolved entity under `entity.id`: joins the entity doc of the resolved entity's
 * main entity and drops the resolved entities whose main entity is missing.
 */
export const buildResolvedEntitySteps = (concreteEntityIndexName: string): string[] => [
  buildLookupJoinClause(concreteEntityIndexName),
  `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NULL`,
];

/** How the values of the aliases of a resolved entity give its value: add up, or take the greatest. */
type ResolvedEntityAggregation = 'SUM' | 'MAX';

/** A column that aggregates rows of other data (alerts, anomalies) per entity. */
export interface EntityAggregation {
  field: string;
  aggregation: string;
  /** Only the rows that match this condition count. */
  condition?: string;
  /** How the column of a resolved entity comes from the columns of its aliases. */
  resolvedEntity: ResolvedEntityAggregation;
}

/** STATS aggregations of every column, over the rows that match `rowCondition`. */
export const buildEntityAggregations = (
  aggregations: readonly EntityAggregation[],
  rowCondition?: string
): string[] =>
  aggregations.map(({ field, aggregation, condition }) => {
    const conditions = [rowCondition, condition].filter(Boolean);
    return conditions.length
      ? `${field} = ${aggregation} WHERE ${conditions.join(' AND ')}`
      : `${field} = ${aggregation}`;
  });

/** `STATS … BY entity.id`; with no aggregations, only the distinct ids. */
export const buildStatsByEntityClause = (aggregations: readonly string[]): string =>
  `| STATS ${aggregations.length ? `${aggregations.join(', ')} ` : ''}BY \`entity.id\``;

/** STATS aggregations that give each column of a resolved entity from the rows of its aliases. */
const buildResolvedEntityAggregations = (aggregations: readonly EntityAggregation[]): string[] =>
  aggregations.map(({ field, resolvedEntity }) => `${field} = ${resolvedEntity}(${field})`);

/**
 * After a STATS per entity, the rows of an alias count for its resolved entity. For a resolved
 * entity with 2 alerts, last at 10:00, and an alias with 3 alerts, last at 11:00, these steps give
 * 5 alerts (`SUM`), last at 11:00 (`MAX`): the rows of the alias get the id of the resolved
 * entity, then `aggregations` aggregate the rows of both.
 */
export const buildAliasesToResolvedEntitySteps = (
  concreteEntityIndexName: string,
  aggregations: readonly EntityAggregation[]
): string[] => [
  buildLookupJoinClause(concreteEntityIndexName),
  `| EVAL \`entity.id\` = COALESCE(${RESOLVED_TO_FIELD}, \`entity.id\`)`,
  buildStatsByEntityClause(buildResolvedEntityAggregations(aggregations)),
];

/** Indents the steps of a FORK branch under its parentheses. */
export const indentForkBranch = (esql: string): string =>
  esql
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

// ── running queries ──────────────────────────────────────────────────────────

const toRows = ({ columns, values }: Pick<ESQLSearchResponse, 'columns' | 'values'>): Row[] =>
  values.map((row) => Object.fromEntries(columns.map((col, i) => [col.name, row[i]])));

/** Pin ES|QL to the current project; CPS space default is often `_alias:*`. */
const ESQL_PROJECT_ROUTING = '_alias:_origin' as const;

export const createEsqlRunner =
  (searchService: DataPublicPluginStart['search'], signal?: AbortSignal): EsqlRunner =>
  async (steps) => {
    const query = steps.join('\n');
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

/** `entity.id ASC` order. */
export const compareEntityIds = (a: Row, b: Row): number =>
  (getEntityId(a) ?? '') < (getEntityId(b) ?? '') ? -1 : 1;
