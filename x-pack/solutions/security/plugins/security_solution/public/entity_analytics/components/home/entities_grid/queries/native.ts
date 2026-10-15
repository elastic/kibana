/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import {
  ENTITY_ID_FIELD,
  RESOLUTION_RISK_SCORE_FIELD,
  RESOLVED_TO_FIELD,
  RISK_SCORE_NORM_FIELD,
  getEntityId,
  getEntityIds,
} from '../common';
import type { QueryArgs, Row, SortDir, SortValue } from '../common';
import {
  buildEntitiesInViewSteps,
  buildEntityFilterConditions,
  buildSearchedTargetsQuery,
} from './entities_in_view';
import {
  ENTITY_TYPE_FILTER,
  buildRowFieldsSteps,
  buildSortSuffix,
  compareEntityIds,
  fetchPerIdChunk,
  getEntityAlias,
  getMaxAliasGroups,
  toList,
} from './esql';
import {
  CRITICALITY_LEVELS,
  buildResolvedEntityRowSteps,
  getCriticalitySortRank,
} from './resolved_entities';
import type { ColumnQuerySpec, EsqlRunner, SortPageContext } from './types';

/** The entity fields whose value on a resolved row is taken over its main entity and aliases. */
const FIELDS_OVER_ALIASES: readonly string[] = [
  'asset.criticality',
  'entity.lifecycle.first_seen',
  '@timestamp',
];

/** Sorted by a field of the entity doc. */
export const nativeSortQuerySpec = {
  fetchSortPage: (args, ctx) =>
    args.rowsMode === 'resolved' && FIELDS_OVER_ALIASES.includes(args.sort.field)
      ? fetchSortedWithAliases(args, ctx)
      : fetchSortedByField(args, ctx),
} satisfies ColumnQuerySpec;

const fetchSortedByField = (args: QueryArgs, { runQuery }: SortPageContext) => {
  if (args.sort.field === CRITICALITY_FIELD) return fetchSortedByCriticality(args, runQuery);
  if (args.rowsMode === 'resolved' && args.sort.field === RISK_SCORE_NORM_FIELD) {
    return fetchSortedByResolvedRiskScore(args, runQuery);
  }
  return runQuery(buildSortedByFieldQuery(args));
};

/**
 * The few resolved entities with aliases are read apart, with their value over the aliases. The
 * others sort by their own value, with as many extra rows as can be dropped, then both merge.
 */
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

/**
 * The entities in view that pass `condition`, sorted by the stored `sortField`. The sort runs
 * before the row fields, which compute a value on resolved rows: Lucene then stops after the
 * limit instead of sorting every entity in view.
 */
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

/**
 * A resolved row's risk score is its resolved entity's, stored on main entities with aliases, or
 * else its own. Each side sorts by its stored field and the two merge.
 *
 * Why: a sort by the score computed per row sorts every entity in view (~13.6s at 10M entities,
 * ECH, Oct 2026).
 */
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

const CRITICALITY_FIELD = 'asset.criticality';

/**
 * Criticality sorts by its rank, from unassigned to extreme, not by its text: one query per level,
 * in the order of the sort, until the rows are full.
 *
 * Why: a sort by a rank computed per entity sorts every entity in view (~60s at 10M entities, ECH,
 * Oct 2026); a level is a filter and each query sorts by entity.id, so Lucene stops after the
 * limit (~1.8s for the whole sort). There are at most five levels, whatever the data.
 */
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

/** The resolved entities with aliases that pass the filters, with their values over the aliases. */
const buildResolvedEntitiesWithAliasesQuery = (args: QueryArgs): string[] => [
  `FROM ${getEntityAlias(args.namespace)}`,
  `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
  ...buildResolvedEntityRowSteps(args),
  ...buildResolvedEntityRowsOutput(args),
];

// A sort by a value that a resolved entity takes over its aliases reads the few resolved entities
// with aliases apart from the other entities, which sort natively by their own value. The two are
// merged here.

/**
 * The end of the query of resolved entities with aliases: the filters on the entity fields, which
 * by now hold the resolved entity's values, and the fields of the rows.
 */
const buildResolvedEntityRowsOutput = (args: QueryArgs): string[] => [
  ...buildEntityFilterConditions(args).map((condition) => `| WHERE ${condition}`),
  ...buildRowFieldsSteps(args),
  `| LIMIT ${getMaxAliasGroups(args.pageSize) + 1}`,
];

const getSortValue = (row: Row, field: string): SortValue => {
  if (field === CRITICALITY_FIELD) return getCriticalitySortRank(row[field]);
  const value = row[field];
  return typeof value === 'string' || typeof value === 'number' ? value : null;
};

/** `SORT field <dir> NULLS LAST, entity.id ASC` order. */
const compareRows =
  (field: string, direction: SortDir) =>
  (a: Row, b: Row): number => {
    const [valueA, valueB] = [getSortValue(a, field), getSortValue(b, field)];
    if (valueA !== valueB) {
      if (valueA == null) return 1;
      if (valueB == null) return -1;
      return (valueA < valueB ? -1 : 1) * (direction === 'desc' ? -1 : 1);
    }
    return compareEntityIds(a, b);
  };

/**
 * The resolved entities with aliases that pass the filters and the search, with their values, from
 * `query`. A search can't run after the join of the main entities, so its matches among them are
 * read apart. Fails when there are more of them than a page can be built from: a page from part
 * of them would be in the wrong order.
 */
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

/**
 * The rows from the resolved entities with aliases and the other entities, both sorted: the row
 * of a resolved entity with aliases replaces its own row among the others, then the rows are
 * sorted and cut to the limit and its extra row.
 */
const getMergedPage = (
  args: QueryArgs,
  withAliases: readonly Row[],
  others: readonly Row[]
): Row[] => {
  const withAliasesIds = new Set(getEntityIds(withAliases));
  return getSortedPage(args, [
    ...withAliases,
    ...others.filter((row) => !withAliasesIds.has(getEntityId(row) ?? '')),
  ]);
};

/** The rows in the order of the sort, cut to the limit and its extra row. */
const getSortedPage = ({ sort, pageSize }: QueryArgs, rows: Row[]): Row[] =>
  rows.sort(compareRows(sort.field, sort.direction)).slice(0, pageSize + 1);
