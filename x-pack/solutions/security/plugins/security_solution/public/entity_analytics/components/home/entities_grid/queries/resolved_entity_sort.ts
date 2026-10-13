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
import type { EsqlRunner, SortPageFetcher } from './types';

// A sort by a column that shows the resolved entity's value reads the resolved entities with aliases and the other
// entities apart. Most entities have no aliases and sort natively, by their own value.
// The few resolved entities with aliases come from the alias docs, and the two streams are merged here.

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

export interface ResolvedEntitySortOptions {
  /** The resolved entities with aliases that pass the filters, as rows with the resolved entity's values. */
  buildResolvedEntityRowsQuery: (args: QueryArgs) => string;
  /**
   * The other entities, sorted and filtered by their own value like the rows of a resolved entity without aliases,
   * with `extraRows` more than the page and its extra row, as resolved entities are dropped.
   */
  fetchEntityRows: (extraRows: number) => Promise<Row[]>;
}

/**
 * One page of rows plus one, sorted by a column that shows the resolved entity's value.
 *
 * The resolved entities with aliases that pass the filters are read first. The other entities are read
 * sorted and filtered by their own value, with as many extra rows as there are groups, since an
 * entity that is itself a resolved entity is dropped for its row. A search can't run after the
 * join of the resolved entities, so its matches among them are read separately.
 *
 * It fails when there are more groups than one query returns: a page from a partial list of
 * groups would be in the wrong order.
 */
export const fetchResolvedEntitySortPage = async (
  args: QueryArgs,
  runQuery: EsqlRunner,
  { buildResolvedEntityRowsQuery, fetchEntityRows }: ResolvedEntitySortOptions
): Promise<Row[]> => {
  const { sort, cursor, pageSize } = args;
  const groups = await runQuery(buildResolvedEntityRowsQuery(args));
  if (groups.length > getMaxAliasGroups(pageSize)) {
    throw new Error('Too many groups of entities to sort by this column');
  }
  const groupIds = new Set(getEntityIds(groups));

  const searchedIds = args.searchExpression
    ? new Set(
        getEntityIds(
          await fetchPerIdChunk(runQuery, [...groupIds], (chunk) =>
            buildSearchedTargetsQuery(args, chunk)
          )
        )
      )
    : groupIds;
  const groupRows = groups
    .filter((row) => searchedIds.has(getEntityId(row) ?? ''))
    .filter(isAfterCursor(sort.field, sort.direction, cursor));

  const entityRows = (await fetchEntityRows(groupIds.size)).filter(
    (row) => !groupIds.has(getEntityId(row) ?? '')
  );

  return [...groupRows, ...entityRows]
    .sort(compareRows(sort.field, sort.direction))
    .slice(0, pageSize + 1);
};

/**
 * A sort page fetcher that, for the rows `isResolvedEntityRows` says show their resolved entity's value, reads the
 * resolved entities with aliases apart from the other entities, which `fetchPage` reads like the rows of a
 * group of one. Other rows are read by `fetchPage` as they are.
 */
export const withResolvedEntityRows =
  (
    fetchPage: SortPageFetcher,
    buildResolvedEntityRowsQuery: (args: QueryArgs) => string,
    isResolvedEntityRows: (args: QueryArgs) => boolean = ({ rowsMode }) => rowsMode === 'resolved'
  ): SortPageFetcher =>
  (args, ctx) =>
    isResolvedEntityRows(args)
      ? fetchResolvedEntitySortPage(args, ctx.runQuery, {
          buildResolvedEntityRowsQuery,
          fetchEntityRows: (extraRows) =>
            fetchPage({ ...args, pageSize: args.pageSize + extraRows }, ctx),
        })
      : fetchPage(args, ctx);
