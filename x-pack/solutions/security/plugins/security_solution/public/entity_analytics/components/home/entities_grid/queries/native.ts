/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESOLVED_TO_FIELD } from '../common';
import { buildEntitiesInViewSteps } from './entities_in_view';
import {
  ENTITY_TYPE_FILTER,
  buildKeepClause,
  buildCursorClause,
  buildSortSuffix,
  getEntityAlias,
} from './esql';
import { buildGroupRowsOutput, fetchGroupedSortPage } from './grouped_sort';
import { GROUP_VALUE_SORT_FIELDS, buildGroupRowSteps } from './group_values';
import type { QueryArgs } from '../common';
import type { ColumnQuerySpec } from './types';

/** The page of entities sorted by their own value, with `extraRows` more than the page and its lookahead. */
const buildNativeEntitySortQuery = (args: QueryArgs, extraRows = 0): string => {
  const {
    sort: { field, direction: dir },
    cursor,
    pageSize,
  } = args;
  return [
    ...buildEntitiesInViewSteps(args),
    buildKeepClause(args),
    ...buildCursorClause(cursor),
    ...buildSortSuffix(field, dir, pageSize + 1 + extraRows),
  ].join('\n');
};

/** Sort of a column whose value is on the entity doc. */
/** The groups with aliases that pass the filters, with the group's values of the columns. */
const buildGroupValueRowsQuery = (args: QueryArgs): string =>
  [
    `FROM ${getEntityAlias(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
    ...buildGroupRowSteps(args),
    ...buildGroupRowsOutput(args),
  ].join('\n');

/** Resolved rows show the group's value in these columns, so their sort has to see the groups. */
const isGroupValueSort = ({ rowsMode, sort }: QueryArgs): boolean =>
  rowsMode === 'resolved' && GROUP_VALUE_SORT_FIELDS.includes(sort.field);

export const nativeSortQuerySpec = {
  fetchSortPage: (args, { runQuery }) =>
    isGroupValueSort(args)
      ? fetchGroupedSortPage(args, runQuery, {
          buildGroupRowsQuery: buildGroupValueRowsQuery,
          fetchEntityRows: (extraRows) => runQuery(buildNativeEntitySortQuery(args, extraRows)),
        })
      : runQuery(buildNativeEntitySortQuery(args)),
} satisfies ColumnQuerySpec;
