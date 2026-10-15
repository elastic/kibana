/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import {
  CRITICALITY_FIELD,
  ENTITY_ID_FIELD,
  RESOLUTION_RISK_SCORE_FIELD,
  RESOLVED_TO_FIELD,
  RISK_SCORE_NORM_FIELD,
  getEntityId,
  getEntityIds,
} from '../common';
import type { QueryArgs, Row, SortValue } from '../common';
import {
  buildEntitiesInViewSteps,
  buildEntityFilterConditions,
  buildSearchedTargetsQuery,
} from './entities_in_view';
import {
  ENTITY_TYPE_FILTER,
  buildRowFieldsSteps,
  buildSortSuffix,
  fetchPerIdChunk,
  getEntityAlias,
  getMaxAliasGroups,
  getSortValue,
  getSortedPage,
  toList,
} from './esql';
import {
  CRITICALITY_LEVELS,
  SORTABLE_RESOLVED_ENTITY_FIELDS,
  buildResolvedEntityRowSteps,
  getCriticalitySortRank,
} from './resolved_entities';
import type { ColumnQuerySpec, EsqlRunner, SortPageContext } from './types';

const fetchSortedByField = (args: QueryArgs, { runQuery }: SortPageContext) => {
  if (args.sort.field === CRITICALITY_FIELD) return fetchSortedByCriticality(args, runQuery);
  if (args.rowsMode === 'resolved' && args.sort.field === RISK_SCORE_NORM_FIELD) {
    return fetchSortedByResolvedRiskScore(args, runQuery);
  }
  return runQuery(buildSortedByFieldQuery(args));
};

/** Resolved entities with aliases take values over them, so they're read apart and merged with the rest. */
const fetchSortedWithAliases = async (args: QueryArgs, ctx: SortPageContext) => {
  const withAliases = await fetchResolvedEntitiesWithAliases(
    args,
    ctx.runQuery,
    buildResolvedEntitiesWithAliasesQuery(args)
  );
  const others = await fetchSortedByField(
    { ...args, pageSize: args.pageSize + withAliases.length },
    ctx
  );
  return getMergedPage(args, withAliases, others);
};

/** Sorts before the row fields, so Lucene stops at the limit instead of sorting every entity. */
const buildSortedByFieldQuery = (
  args: QueryArgs,
  sortField: string = args.sort.field,
  condition?: string
): string[] => [
  ...buildEntitiesInViewSteps(args),
  ...(condition ? [`| WHERE ${condition}`] : []),
  ...buildSortSuffix(sortField, args.sort.direction, args.pageSize + 1),
  ...buildRowFieldsSteps(args),
];

/** Sorting by a per-row score sorts everything (~13.6s at 10M), so each stored field sorts apart, then merge. */
const fetchSortedByResolvedRiskScore = async (
  args: QueryArgs,
  runQuery: EsqlRunner
): Promise<Row[]> => {
  const [withResolvedScore, others] = await Promise.all([
    runQuery(
      buildSortedByFieldQuery(
        args,
        RESOLUTION_RISK_SCORE_FIELD,
        `${RESOLUTION_RISK_SCORE_FIELD} IS NOT NULL`
      )
    ),
    runQuery(
      buildSortedByFieldQuery(args, RISK_SCORE_NORM_FIELD, `${RESOLUTION_RISK_SCORE_FIELD} IS NULL`)
    ),
  ]);
  return getSortedPage(args, [...withResolvedScore, ...others]);
};

/** Sorting by a computed rank took ~60s at 10M; one filtered query per level stops early (~1.8s). */
const fetchSortedByCriticality = async (args: QueryArgs, runQuery: EsqlRunner): Promise<Row[]> => {
  const limit = args.pageSize + 1;
  // Unassigned (no known level) is the lowest.
  const levels = [...CRITICALITY_LEVELS, null];
  const rows: Row[] = [];
  for (const level of args.sort.direction === 'desc' ? levels : levels.reverse()) {
    rows.push(...(await runQuery(buildCriticalityLevelQuery(args, level, limit - rows.length))));
    if (rows.length >= limit) break;
  }
  return rows;
};

const buildCriticalityLevelQuery = (
  args: QueryArgs,
  level: string | null,
  limit: number
): string[] => [
  ...buildEntitiesInViewSteps(args),
  level == null
    ? `| WHERE ${CRITICALITY_FIELD} IS NULL OR NOT ${CRITICALITY_FIELD} IN (${toList(
        CRITICALITY_LEVELS
      )})`
    : `| WHERE ${CRITICALITY_FIELD} == ${escapeStringValue(level)}`,
  `| SORT ${ENTITY_ID_FIELD} ASC`,
  `| LIMIT ${limit}`,
  ...buildRowFieldsSteps(args),
];

const buildResolvedEntitiesWithAliasesQuery = (args: QueryArgs): string[] => [
  `FROM ${getEntityAlias(args.namespace)}`,
  `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
  ...buildResolvedEntityRowSteps(args),
  ...buildResolvedEntityRowsOutput(args),
];

/** The filters now test the resolved entity's values, which replaced the main entity's. */
const buildResolvedEntityRowsOutput = (args: QueryArgs): string[] => [
  ...buildEntityFilterConditions(args).map((condition) => `| WHERE ${condition}`),
  ...buildRowFieldsSteps(args),
  `| LIMIT ${getMaxAliasGroups(args.pageSize) + 1}`,
];

/** The value a row sorts by: criticality by its rank, from unassigned to extreme. */
const getNativeSortValue = (row: Row, field: string): SortValue =>
  field === CRITICALITY_FIELD ? getCriticalitySortRank(row[field]) : getSortValue(row, field);

/** KQL can't run after their join, so matches are checked apart; too many would break the order, so fail. */
const fetchResolvedEntitiesWithAliases = async (
  args: QueryArgs,
  runQuery: EsqlRunner,
  query: readonly string[]
): Promise<Row[]> => {
  const rows = await runQuery(query);
  if (rows.length > getMaxAliasGroups(args.pageSize)) {
    throw new Error('Too many groups of entities to sort by this column');
  }
  if (!args.searchExpression) return rows;
  const searchedIds = new Set(
    getEntityIds(
      await fetchPerIdChunk(runQuery, getEntityIds(rows), (chunk) =>
        buildSearchedTargetsQuery(args, chunk)
      )
    )
  );
  return rows.filter((row) => searchedIds.has(getEntityId(row) ?? ''));
};

/** A resolved entity's row over its aliases replaces its own row before the merge. */
const getMergedPage = (
  args: QueryArgs,
  withAliases: readonly Row[],
  others: readonly Row[]
): Row[] => {
  const withAliasesIds = new Set(getEntityIds(withAliases));
  return getSortedPage(
    args,
    [...withAliases, ...others.filter((row) => !withAliasesIds.has(getEntityId(row) ?? ''))],
    getNativeSortValue
  );
};

export const nativeSortQuerySpec = {
  fetchSortPage: (args, ctx) =>
    args.rowsMode === 'resolved' && SORTABLE_RESOLVED_ENTITY_FIELDS.includes(args.sort.field)
      ? fetchSortedWithAliases(args, ctx)
      : fetchSortedByField(args, ctx),
} satisfies ColumnQuerySpec;
