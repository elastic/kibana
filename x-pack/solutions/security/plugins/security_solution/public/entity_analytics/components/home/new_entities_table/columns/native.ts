/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEntitiesInViewCountQuery,
  entityAliasOf,
  buildKeepClause,
  buildCursorClause,
  buildResolvedRowsFilter,
  buildCombinedFilterClause,
  ENTITY_TYPE_FILTER,
  ENTITY_ID_FIELD,
} from '../common';
import type { ColumnQuerySpec, QueryArgs } from '../common';

const buildNativeEntitySortQuery = (args: QueryArgs): string => {
  const {
    namespace,
    sort: { field, direction: dir },
    cursor,
    pageSize,
    rowsMode,
    searchExpression,
    entityExpression,
  } = args;
  return [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildResolvedRowsFilter(rowsMode),
    ...buildCombinedFilterClause(searchExpression, entityExpression),
    buildKeepClause(args),
    ...buildCursorClause(cursor),
    `| SORT ${field} ${dir.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${pageSize + 1}`,
  ].join('\n');
};

/** Sort of a column whose value is on the entity doc. */
export const nativeSortQuerySpec = {
  sort: {
    buildSortQuery: buildNativeEntitySortQuery,
    buildCountQuery: buildEntitiesInViewCountQuery,
  },
} satisfies ColumnQuerySpec;
