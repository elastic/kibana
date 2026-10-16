/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntitiesInViewSteps } from './entities_in_view';
import { buildKeepClause, buildCursorClause, buildSortSuffix } from './esql';
import type { QueryArgs } from '../common';
import type { ColumnQuerySpec } from './types';

const buildNativeEntitySortQuery = (args: QueryArgs): string => {
  const {
    sort: { field, direction: dir },
    cursor,
    pageSize,
  } = args;
  return [
    ...buildEntitiesInViewSteps(args),
    buildKeepClause(args),
    ...buildCursorClause(cursor),
    ...buildSortSuffix(field, dir, pageSize + 1),
  ].join('\n');
};

/** Sort of a column whose value is on the entity doc. */
export const nativeSortQuerySpec = {
  fetchSortPage: (args, { runQuery }) => runQuery(buildNativeEntitySortQuery(args)),
} satisfies ColumnQuerySpec;
