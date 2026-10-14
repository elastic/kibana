/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESOLVED_TO_FIELD, getEntityId, getEntityIds } from '../common';
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
} from './esql';
import { buildResolvedEntityRowSteps } from './resolved_entities';
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

const fetchSortedByField = (args: QueryArgs, { runQuery }: SortPageContext) =>
  runQuery(buildSortedByFieldQuery(args));

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

/** The entities sorted by their own value. */
const buildSortedByFieldQuery = (args: QueryArgs): string[] => [
  ...buildEntitiesInViewSteps(args),
  ...buildRowFieldsSteps(args),
  ...buildSortSuffix(args.sort.field, args.sort.direction, args.pageSize + 1),
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
  { sort, pageSize }: QueryArgs,
  withAliases: readonly Row[],
  others: readonly Row[]
): Row[] => {
  const withAliasesIds = new Set(getEntityIds(withAliases));
  return [...withAliases, ...others.filter((row) => !withAliasesIds.has(getEntityId(row) ?? ''))]
    .sort(compareRows(sort.field, sort.direction))
    .slice(0, pageSize + 1);
};
