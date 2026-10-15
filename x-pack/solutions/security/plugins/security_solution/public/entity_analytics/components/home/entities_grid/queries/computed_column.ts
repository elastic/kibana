/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { ENTITY_ID_FIELD, getEntityId, getEntityIds, toChunks } from '../common';
import type { QueryArgs, Row } from '../common';
import {
  buildEntitiesInViewConditions,
  buildEntitiesInViewSteps,
  buildSearchedTargetsQuery,
} from './entities_in_view';
import {
  ESQL_MAX_QUERY_LENGTH,
  ESQL_MAX_RESULT_ROWS,
  buildLookupJoinClause,
  buildRowFieldsSteps,
  buildSortSuffix,
  fetchPerIdChunk,
  getSortedPage,
  toList,
} from './esql';
import type { ColumnQuerySpec, EnrichedFields, SortPageContext } from './types';

/** Each column writes its own queries, since each needs a different trick to be fast. */
export interface ComputedColumn {
  /** What an entity with no data shows, per field; 0 and 1 sort first ascending, null last. */
  emptyValues: Readonly<Record<string, number | null>>;
  /** Every entity in view, sorted; reads them all, so it's the slow last resort. */
  buildSortAllQuery: (args: QueryArgs) => readonly string[];
  /** Only the entities with a value; the engine adds the rest. */
  buildSortWithValueQuery: (args: QueryArgs, limit: number) => readonly string[];
  /** Looks up the values of rows we already have, e.g. the ones on screen. */
  fetchValues: (
    rows: readonly Row[],
    args: QueryArgs,
    ctx: SortPageContext
  ) => Promise<EnrichedFields>;
}

export const getComputedColumnQuerySpec = (column: ComputedColumn): Required<ColumnQuerySpec> => ({
  fetchSortPage: (args, ctx) => fetchComputedColumnSortPage(column, args, ctx),
  enricher: { fields: Object.keys(column.emptyValues), fetch: column.fetchValues },
});

/** Most rows ES|QL returns: the extra row of a full response tells there are more. */
const MAX_ROWS = ESQL_MAX_RESULT_ROWS - 1;

const EMPTY_ROWS_BATCH_SIZE = 1_000;

/** Rows per lookup of values: each lookup lists its ids in the query, which is capped at 1MB. */
const VALUES_CHUNK_SIZE = 500;

const getEmptyValue = (column: ComputedColumn, { sort }: QueryArgs): number | null =>
  column.emptyValues[sort.field] ?? null;

/** An empty 0 or 1 sorts first ascending; an empty null always sorts last. */
const isEmptyFirst = (column: ComputedColumn, args: QueryArgs): boolean =>
  getEmptyValue(column, args) != null && args.sort.direction === 'asc';

const buildEmptyRowsQuery = (
  column: ComputedColumn,
  args: QueryArgs,
  valueIds: readonly string[],
  limit: number,
  afterId: string | null = null
): string[] => [
  ...buildEntitiesInViewSteps(args),
  ...(valueIds.length ? [`| WHERE NOT ${ENTITY_ID_FIELD} IN (${toList(valueIds)})`] : []),
  ...(afterId != null ? [`| WHERE ${ENTITY_ID_FIELD} > ${escapeStringValue(afterId)}`] : []),
  `| SORT ${ENTITY_ID_FIELD} ASC`,
  `| LIMIT ${limit}`,
  `| EVAL ${Object.entries(column.emptyValues)
    .map(([field, value]) => `${field} = ${value ?? 'null'}`)
    .join(', ')}`,
  ...buildRowFieldsSteps(args, args.sort.field, ...Object.keys(column.emptyValues)),
];

const fetchValuesInChunks = async (
  column: ComputedColumn,
  rows: readonly Row[],
  args: QueryArgs,
  ctx: SortPageContext
): Promise<EnrichedFields> => {
  const values = await Promise.all(
    toChunks(rows, VALUES_CHUNK_SIZE).map((chunk) => column.fetchValues(chunk, args, ctx))
  );
  return new Map(values.flatMap((chunkValues) => [...chunkValues]));
};

/** Too many entities have a value to exclude by id, so scan in batches and drop those with one. */
const fetchEmptyRowsInBatches = async (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext,
  limit: number
): Promise<Row[]> => {
  const emptyValue = getEmptyValue(column, args);
  const emptyRows: Row[] = [];
  let afterId: string | null = null;
  while (emptyRows.length < limit) {
    const batch = await ctx.runQuery(
      buildEmptyRowsQuery(column, args, [], EMPTY_ROWS_BATCH_SIZE, afterId)
    );
    if (!batch.length) break;
    const values = await fetchValuesInChunks(column, batch, args, ctx);
    emptyRows.push(
      ...batch.filter((row) => {
        const value = values.get(getEntityId(row) ?? '')?.[args.sort.field];
        return value == null || value === emptyValue;
      })
    );
    if (batch.length < EMPTY_ROWS_BATCH_SIZE) break;
    afterId = getEntityId(batch[batch.length - 1]) ?? null;
  }
  return emptyRows.slice(0, limit);
};

/** Entities without a value sort last, so they're read only when fewer than a page have one. */
const fetchPageEmptyLast = async (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext
): Promise<Row[]> => {
  const limit = args.pageSize + 1;
  const withValue = await ctx.runQuery(column.buildSortWithValueQuery(args, limit));
  if (withValue.length >= limit) return withValue;
  const empty = await ctx.runQuery(
    buildEmptyRowsQuery(column, args, getEntityIds(withValue), limit)
  );
  return [...withValue, ...empty].slice(0, limit);
};

/** Empty rows first: excluded by id when every value is known, else found in batches. */
const fetchPageEmptyFirst = async (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext
): Promise<Row[]> => {
  const limit = args.pageSize + 1;
  const withValue = await ctx.runQuery(column.buildSortWithValueQuery(args, limit));
  const empty =
    withValue.length < limit
      ? await ctx.runQuery(buildEmptyRowsQuery(column, args, getEntityIds(withValue), limit))
      : await fetchEmptyRowsInBatches(column, args, ctx, limit);
  return [...empty, ...withValue].slice(0, limit);
};

/** Too many matches to look up: search among the few entities with a value, else the slow query. */
const fetchSearchedPageByValues = async (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext
): Promise<Row[]> => {
  const withValue = await ctx.runQuery(
    column.buildSortWithValueQuery({ ...args, searchExpression: undefined }, MAX_ROWS + 1)
  );
  if (withValue.length > MAX_ROWS) return ctx.runQuery(column.buildSortAllQuery(args));
  const valueIds = getEntityIds(withValue);
  const emptyRowsQuery = buildEmptyRowsQuery(column, args, valueIds, args.pageSize + 1);
  // The ids of the entities with a value must fit in one query.
  if (emptyRowsQuery.join('\n').length > ESQL_MAX_QUERY_LENGTH) {
    return ctx.runQuery(column.buildSortAllQuery(args));
  }
  const [searched, empty] = await Promise.all([
    fetchPerIdChunk(ctx.runQuery, valueIds, (chunk) => buildSearchedTargetsQuery(args, chunk)),
    ctx.runQuery(emptyRowsQuery),
  ]);
  const searchedIds = new Set(getEntityIds(searched));
  return getSortedPage(args, [
    ...withValue.filter((row) => searchedIds.has(getEntityId(row) ?? '')),
    ...empty,
  ]);
};

/** KQL can't run after the join, so a few matches are looked up and sorted here. */
const fetchSearchedPage = async (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext
): Promise<Row[]> => {
  const matches = await ctx.runQuery([
    ...buildEntitiesInViewSteps(args),
    `| LIMIT ${MAX_ROWS + 1}`,
    ...buildRowFieldsSteps(args),
  ]);
  if (matches.length > MAX_ROWS) return fetchSearchedPageByValues(column, args, ctx);
  const values = await fetchValuesInChunks(column, matches, args, ctx);
  return getSortedPage(
    args,
    matches.map((row) => ({ ...row, ...values.get(getEntityId(row) ?? '') }))
  );
};

/** Sorting all entities at once is too slow (15–22s at 10M), so pick a plan: search? empty rows first? */
export const fetchComputedColumnSortPage = (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext
): Promise<Row[]> => {
  if (args.searchExpression) return fetchSearchedPage(column, args, ctx);
  return isEmptyFirst(column, args)
    ? fetchPageEmptyFirst(column, args, ctx)
    : fetchPageEmptyLast(column, args, ctx);
};

/** Join before filtering: the view's filters are on entity fields, which the source lacks. */
export const buildSortWithValueSteps = (
  args: QueryArgs,
  field: string,
  limit: number,
  extraFields: readonly string[] = []
): string[] => [
  buildLookupJoinClause(args.concreteEntityIndexName),
  ...buildEntitiesInViewConditions(args).map((condition) => `| WHERE ${condition}`),
  ...buildSortSuffix(field, args.sort.direction, limit),
  ...buildRowFieldsSteps(args, field, ...extraFields),
];
