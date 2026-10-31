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
  buildFilterClause,
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
  buildResolvedEntityRowSteps,
  getCriticalitySortRank,
} from './resolved_entities';
import type { ColumnQuerySpec, EsqlRunner, SortPageContext } from './types';

const fetchSortedByField = (args: QueryArgs, { runQuery }: SortPageContext) => {
  // Native field sorted by a computed rank: level names sort alphabetically.
  if (args.sort.field === CRITICALITY_FIELD) return fetchSortedByCriticality(args, runQuery);
  // Native field shown as a computed value on resolved rows: the group's score, else its own.
  if (args.rowsMode === 'resolved' && args.sort.field === RISK_SCORE_NORM_FIELD) {
    return fetchSortedByResolvedRiskScore(args, runQuery);
  }
  // Native field sorted as stored.
  return runQuery(buildSortedByFieldQuery(args));
};

const SORTED_WITH_ALIASES_FIELDS: readonly string[] = [
  CRITICALITY_FIELD,
  'entity.lifecycle.first_seen',
  '@timestamp',
];

/** Resolved entities with aliases take values over them, so they're read apart and merged with the rest. */
const fetchSortedWithAliases = async (args: QueryArgs, ctx: SortPageContext) => {
  const withAliases = await fetchResolvedEntitiesWithAliases(args, ctx.runQuery);
  const others = await fetchSortedByField(
    { ...args, pageSize: args.pageSize + withAliases.length },
    ctx
  );
  return getMergedPage(args, withAliases, others);
};

/** The default fast sort: `SORT … LIMIT` before the row fields, so Lucene runs it. */
const buildSortedByFieldQuery = (
  args: QueryArgs,
  sortField: string = args.sort.field,
  condition?: string
): string[] => [
  ...buildEntitiesInViewSteps(args),
  ...buildFilterClause(condition),
  ...buildSortSuffix(sortField, args.sort.direction, args.pageSize + 1),
  ...buildRowFieldsSteps(args),
];

/** Two fast sorts, merged: rows with a group score sorted by it, the rest by their own score. */
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

/** One fast query per level, in rank order, until the page is full. */
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

/** Groups with aliases as rows, all of them or those of `targetIds`: read from their alias docs, with the group values. */
const buildResolvedEntitiesWithAliasesQuery = (
  args: QueryArgs,
  targetIds?: readonly string[]
): string[] => [
  `FROM ${getEntityAlias(args.namespace)}`,
  `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
  ...buildFilterClause(targetIds && `${RESOLVED_TO_FIELD} IN (${toList(targetIds)})`),
  ...buildResolvedEntityRowSteps(args),
  ...buildEntityFilterConditions(args).map((condition) => `| WHERE ${condition}`),
  ...buildRowFieldsSteps(args),
  // One extra row tells there are too many groups to merge.
  `| LIMIT ${getMaxAliasGroups(args.pageSize) + 1}`,
];

/** Criticality sorts by its rank, every other field by its value. */
const getNativeSortValue = (row: Row, field: string): SortValue =>
  field === CRITICALITY_FIELD ? getCriticalitySortRank(row[field]) : getSortValue(row, field);

/** The resolved entities the search matches, and one more to tell there are too many to read by id. */
const buildSearchedTargetIdsQuery = (args: QueryArgs): string[] => [
  // The entity filters apply to the group values, in the groups' query.
  ...buildEntitiesInViewSteps({ ...args, entityExpression: undefined }),
  '| KEEP `entity.id`',
  `| LIMIT ${getMaxAliasGroups(args.pageSize) + 1}`,
];

/**
 * KQL can't run after their join, so a search first finds its resolved entities and reads only
 * their groups; when it matches too many, the groups are read and their matches checked apart.
 * Too many groups would break the order, so fail.
 */
const fetchResolvedEntitiesWithAliases = async (
  args: QueryArgs,
  runQuery: EsqlRunner
): Promise<Row[]> => {
  const maxGroups = getMaxAliasGroups(args.pageSize);
  if (args.searchExpression) {
    const searchedIds = getEntityIds(await runQuery(buildSearchedTargetIdsQuery(args)));
    if (searchedIds.length <= maxGroups) {
      return fetchPerIdChunk(runQuery, searchedIds, (ids) =>
        buildResolvedEntitiesWithAliasesQuery(args, ids)
      );
    }
  }
  const rows = await runQuery(buildResolvedEntitiesWithAliasesQuery(args));
  if (rows.length > maxGroups) {
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
    args.rowsMode === 'resolved' && SORTED_WITH_ALIASES_FIELDS.includes(args.sort.field)
      ? fetchSortedWithAliases(args, ctx)
      : fetchSortedByField(args, ctx),
} satisfies ColumnQuerySpec;
