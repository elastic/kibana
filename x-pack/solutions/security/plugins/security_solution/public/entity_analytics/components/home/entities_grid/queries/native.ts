/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESOLVED_TO_FIELD } from '../common';
import type { QueryArgs } from '../common';
import { buildEntitiesInViewSteps } from './entities_in_view';
import {
  ENTITY_TYPE_FILTER,
  buildCursorClause,
  buildKeepClause,
  buildSortSuffix,
  getEntityAlias,
} from './esql';
import {
  buildResolvedEntityRowsOutput,
  fetchResolvedEntitiesWithAliases,
  getMergedPage,
} from './resolved_entity_sort';
import { buildResolvedEntityRowSteps } from './resolved_entity_values';
import type { ColumnQuerySpec, SortPageContext } from './types';

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

/** The page of entities sorted by their own value. */
const buildSortedByFieldQuery = (args: QueryArgs): string =>
  [
    ...buildEntitiesInViewSteps(args),
    buildKeepClause(args),
    ...buildCursorClause(args.cursor),
    ...buildSortSuffix(args.sort.field, args.sort.direction, args.pageSize + 1),
  ].join('\n');

/** The resolved entities with aliases that pass the filters, with their values over the aliases. */
const buildResolvedEntitiesWithAliasesQuery = (args: QueryArgs): string =>
  [
    `FROM ${getEntityAlias(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
    ...buildResolvedEntityRowSteps(args),
    ...buildResolvedEntityRowsOutput(args),
  ].join('\n');
