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
import { chunk } from 'lodash';
import pMap from 'p-map';
import { DEFAULT_ALERTS_INDEX } from '../../../../../../common/constants';
import { getRiskScoreTimeSeriesIndex } from '../../../../../../common/entity_analytics/risk_engine';
import {
  ALLOWED_ENTITY_TYPES,
  ENTITY_FIELDS,
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FIELD,
  RESOLUTION_RISK_SCORE_FIELD,
  RISK_SCORE_NORM_FIELD,
  getEntityId,
} from '../common';
import type { QueryArgs, Row, SortDir, SortValue, TimeRange } from '../common';
import type { EsqlRunner } from './types';

export const getEntityAlias = (namespace: string) => getEntitiesAlias(ENTITY_LATEST, namespace);
export const getAlertsIndex = (namespace: string) => `${DEFAULT_ALERTS_INDEX}-${namespace}`;
export const getRiskScoreIndex = (namespace: string) => getRiskScoreTimeSeriesIndex(namespace);

/** Alert and anomaly indices don't map every EUID field; unmapped ones read as null instead of failing. */
export const SET_UNMAPPED_NULLIFY = 'SET unmapped_fields="nullify";';

export const RISK_SCORE_TYPE = `COALESCE(host.risk.score_type, user.risk.score_type, service.risk.score_type)`;

/** The entity's own score docs: resolution docs hold its group score; untyped older docs are its own. */
export const OWN_RISK_SCORE_CONDITION = `(${RISK_SCORE_TYPE} IS NULL OR ${RISK_SCORE_TYPE} != "resolution")`;

export const ML_ANOMALY_INDICES = '.ml-anomalies-shared*';

export const ANOMALY_RECORD_FILTER =
  'result_type == "record" AND is_interim == false AND record_score >= 1';

/** Records of the installed security jobs; matches nothing when there are none. */
export const buildAnomalyJobFilter = (jobIds: readonly string[]): string =>
  jobIds.length ? `job_id IN (${toList(jobIds)})` : 'false';

/** ES|QL returns at most this many rows whatever the LIMIT (`esql.query.result_truncation_max_size`). */
export const ESQL_MAX_RESULT_ROWS = 10_000;

/** Longest ES|QL query Elasticsearch parses, in characters (`EsqlParser.MAX_LENGTH`). */
export const ESQL_MAX_QUERY_LENGTH = 1_000_000;

export const toList = (items: readonly string[]) => items.map(escapeStringValue).join(', ');

/** Resolved entities with aliases read apart must fit beside the page and its extra row in one result. */
export const getMaxAliasGroups = (pageSize: number): number => ESQL_MAX_RESULT_ROWS - pageSize - 1;

/** Statements cap at 1MB and ids run ~100 chars, so an IN list holds at most this many ids. */
export const ID_LIST_CHUNK_SIZE = 2_000;

/** Queries a read runs at once: a large group or search fans out to dozens, which would flood ES. */
const MAX_PARALLEL_QUERIES = 5;

/** Fetches each chunk of `items`, a few at a time; results keep the chunks' order. */
export const fetchInChunks = <T, R>(
  items: readonly T[],
  chunkSize: number,
  fetchChunk: (itemsChunk: T[]) => Promise<R>
): Promise<R[]> => pMap(chunk(items, chunkSize), fetchChunk, { concurrency: MAX_PARALLEL_QUERIES });

export const fetchPerIdChunk = async (
  runQuery: EsqlRunner,
  ids: readonly string[],
  buildQuery: (ids: readonly string[]) => string[]
): Promise<Row[]> =>
  (
    await fetchInChunks(ids, ID_LIST_CHUNK_SIZE, (idsChunk) => runQuery(buildQuery(idsChunk)))
  ).flat();

const IDENTITY_SOURCE_FIELDS = [
  ...new Set(
    ALLOWED_ENTITY_TYPES.flatMap(
      (t) => getEuidSourceFields(getBuiltInEntityDefinition(t)).identitySourceFields
    )
  ),
];

const getStringValues = (value: unknown): string[] =>
  [value].flat().filter((v): v is string => typeof v === 'string' && v !== '');

/** A pushable `field IN (…)` superset of the rows' EUIDs, so Lucene narrows docs before the EUID eval. */
export const buildIdentityPrefilter = (rows: readonly Row[]): string | undefined => {
  const parts = IDENTITY_SOURCE_FIELDS.flatMap((field) => {
    const values = [...new Set(rows.flatMap((row) => getStringValues(row[field])))];
    return values.length ? [`${field} IN (${toList(values)})`] : [];
  });
  return parts.length ? parts.join(' OR ') : undefined;
};

/** ES|QL field names without quotes: letters, digits, `_` and `.`, not starting with a digit. */
const PLAIN_FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_.]*$/;

/** Fields picked in Fields may contain `-` or `:`, so non-plain names are backticked (backticks doubled). */
const quoteField = (field: string): string =>
  PLAIN_FIELD_NAME.test(field) ? field : `\`${field.replace(/`/g, '``')}\``;

/** Resolved rows show their resolved entity's score, stored on the main entity, else their own. */
export const buildRowRiskScoreSteps = ({ rowsMode }: Pick<QueryArgs, 'rowsMode'>): string[] =>
  rowsMode === 'resolved'
    ? [
        `| EVAL ${RISK_SCORE_NORM_FIELD} = COALESCE(${RESOLUTION_RISK_SCORE_FIELD}, ${RISK_SCORE_NORM_FIELD})`,
      ]
    : [];

const buildKeepClause = (
  { keepFields }: Pick<QueryArgs, 'keepFields'>,
  ...extra: string[]
): string => {
  const fields = [...new Set([...ENTITY_FIELDS, ...(keepFields ?? []), ...extra])];
  return `| KEEP ${fields.map(quoteField).join(', ')}`;
};

export const buildRowFieldsSteps = (
  args: Pick<QueryArgs, 'keepFields' | 'rowsMode'>,
  ...extra: string[]
): string[] => [...buildRowRiskScoreSteps(args), buildKeepClause(args, ...extra)];

export const buildFilterClause = (filterExpression?: string): string[] =>
  filterExpression ? [`| WHERE ${filterExpression}`] : [];

export const joinAnd = (...parts: Array<string | undefined | null | false>): string | undefined => {
  const filtered = parts.filter((p): p is string => typeof p === 'string' && p.length > 0);
  return filtered.length ? filtered.join(' AND ') : undefined;
};

/** Joins on `entity.id` only: ES|QL rejects KQL in `ON`, and the join needs a concrete index name. */
export const buildLookupJoinClause = (concreteEntityIndexName: string): string =>
  `| LOOKUP JOIN ${concreteEntityIndexName} ON \`entity.id\``;

const TIME_RANGE_DAYS = { '24h': 1, '7d': 7, '30d': 30 } as const;

/** One date-math start shared by every grid and tile query, so they agree; ES|QL still pushes it down. */
export const buildLookback = (range: TimeRange): string => `NOW() - ${TIME_RANGE_DAYS[range]} days`;

/** The order of every grid page, `field <dir> NULLS LAST, entity.id ASC`, and its limit. */
export const buildSortSuffix = (field: string, direction: SortDir, limit: number): string[] => [
  `| SORT ${field} ${direction.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
  `| LIMIT ${limit}`,
];

/** Joining every row before the limit made sorts slow, so sort and limit first, then join the page. */
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

type ResolvedEntityAggregation = 'SUM' | 'MAX';

export interface EntityAggregation {
  field: string;
  aggregation: string;
  condition?: string;
  /** How the column of a resolved entity comes from the columns of its aliases. */
  resolvedEntity: ResolvedEntityAggregation;
}

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

export const indentForkBranch = (esql: string): string =>
  esql
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

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

export const compareEntityIds = (a: Row, b: Row): number =>
  (getEntityId(a) ?? '') < (getEntityId(b) ?? '') ? -1 : 1;

/** The value a row sorts by in `field`; anything but a string or a number sorts as null. */
export const getSortValue = (row: Row, field: string): SortValue => {
  const value = row[field];
  return typeof value === 'string' || typeof value === 'number' ? value : null;
};

/** Rows merged here keep ES|QL's order, `field <dir> NULLS LAST, entity.id ASC`, cut to the page plus one. */
export const getSortedPage = (
  { sort, pageSize }: Pick<QueryArgs, 'sort' | 'pageSize'>,
  rows: Row[],
  getValue: (row: Row, field: string) => SortValue = getSortValue
): Row[] =>
  rows
    .sort((a, b) => {
      const [valueA, valueB] = [getValue(a, sort.field), getValue(b, sort.field)];
      if (valueA !== valueB) {
        if (valueA == null) return 1;
        if (valueB == null) return -1;
        return (valueA < valueB ? -1 : 1) * (sort.direction === 'desc' ? -1 : 1);
      }
      return compareEntityIds(a, b);
    })
    .slice(0, pageSize + 1);
