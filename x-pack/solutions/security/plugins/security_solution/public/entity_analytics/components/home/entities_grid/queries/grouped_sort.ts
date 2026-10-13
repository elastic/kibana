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

// A sort by a column that shows the group's value reads the groups with aliases and the other
// entities apart. Most entities are alone in their group and sort natively, by their own value.
// The few groups with aliases come from the alias docs, and the two streams are merged here.

/**
 * The end of every query of group rows: the filters on the entity fields, which by now hold the
 * group's values, and the fields of the rows. `columns` are the group's own columns that the
 * rows carry.
 */
export const buildGroupRowsOutput = (
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

export interface GroupedSortOptions {
  /** The groups with aliases that pass the filters, as rows with the group's values. */
  buildGroupRowsQuery: (args: QueryArgs) => string;
  /**
   * The other entities, sorted and filtered by their own value like the rows of a group of one,
   * with `extraRows` more than the page and its extra row, as the heads of groups are dropped.
   */
  fetchEntityRows: (extraRows: number) => Promise<Row[]>;
}

/**
 * One page of rows plus one, sorted by a column that shows the group's value.
 *
 * The groups with aliases that pass the filters are read first. The other entities are read
 * sorted and filtered by their own value, with as many extra rows as there are groups, since an
 * entity that heads a group is dropped for its group row. A search can't run after the group
 * join, so its matches among the group heads are read separately.
 *
 * It fails when there are more groups than one query returns: a page from a partial list of
 * groups would be in the wrong order.
 */
export const fetchGroupedSortPage = async (
  args: QueryArgs,
  runQuery: EsqlRunner,
  { buildGroupRowsQuery, fetchEntityRows }: GroupedSortOptions
): Promise<Row[]> => {
  const { sort, cursor, pageSize } = args;
  const groups = await runQuery(buildGroupRowsQuery(args));
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
