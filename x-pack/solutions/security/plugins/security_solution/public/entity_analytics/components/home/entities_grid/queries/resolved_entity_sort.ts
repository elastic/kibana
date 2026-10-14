/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_FIELD, getEntityId, getEntityIds } from '../common';
import type { PageCursor, QueryArgs, Row, SortDir, SortValue } from '../common';
import { buildKeepClause, compareEntityIds, fetchPerIdChunk, getMaxAliasGroups } from './esql';
import { buildEntityFilterConditions, buildSearchedTargetsQuery } from './entities_in_view';
import type { EsqlRunner } from './types';

// A sort by a value that a resolved entity takes over its aliases reads the few resolved entities
// with aliases apart from the other entities, which sort natively by their own value. The two are
// merged here.

/**
 * The end of every query of resolved entity rows: the filters on the entity fields, which by now hold the
 * resolved entity's values, and the fields of the rows. `columns` are the resolved entity's own columns that the
 * rows carry.
 */
export const buildResolvedEntityRowsOutput = (
  args: QueryArgs,
  columns: readonly string[] = []
): string[] => [
  ...buildEntityFilterConditions(args).map((condition) => `| WHERE ${condition}`),
  buildKeepClause(args, ...columns),
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

const isAfterCursor = (field: string, direction: SortDir, cursor: PageCursor | null) => {
  if (cursor == null) return () => true;
  const cursorRow: Row = { [field]: cursor.sortValue, [ENTITY_ID_FIELD]: cursor.entityId };
  const compare = compareRows(field, direction);
  // The row of the cursor itself is not after it: compareEntityIds is 1 for equal ids.
  return (row: Row): boolean => getEntityId(row) !== cursor.entityId && compare(row, cursorRow) > 0;
};

/**
 * The resolved entities with aliases that pass the filters and the search, with their values, from
 * `query`. A search can't run after the join of the main entities, so its matches among them are
 * read apart. Fails when there are more of them than a page can be built from: a page from part
 * of them would be in the wrong order.
 */
export const fetchResolvedEntitiesWithAliases = async (
  args: QueryArgs,
  runQuery: EsqlRunner,
  query: string
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
 * One page from the resolved entities with aliases and the other entities, both sorted: the row
 * of a resolved entity with aliases replaces its own row among the others, then the rows after
 * the cursor are sorted and cut to the page and its extra row.
 */
export const getMergedPage = (
  { sort, cursor, pageSize }: QueryArgs,
  withAliases: readonly Row[],
  others: readonly Row[]
): Row[] => {
  const withAliasesIds = new Set(getEntityIds(withAliases));
  return [
    ...withAliases.filter(isAfterCursor(sort.field, sort.direction, cursor)),
    ...others.filter((row) => !withAliasesIds.has(getEntityId(row) ?? '')),
  ]
    .sort(compareRows(sort.field, sort.direction))
    .slice(0, pageSize + 1);
};
