/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { ENTITY_ID_FIELD, getEntityId, getEntityIds } from '../common';
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
  fetchInChunks,
} from './esql';
import type { ColumnQuerySpec, EnrichedFields, SortPageContext } from './types';

/** Each column writes its own queries, since each needs a different trick to be fast. */
export interface ComputedColumn {
  /** What an entity with no data shows, per field */
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

const isEmptyFirst = (column: ComputedColumn, args: QueryArgs): boolean =>
  getEmptyValue(column, args) != null && args.sort.direction === 'asc';

/**
 * A page has up to 1,000 rows, but fewer entities may have a value, so this fills the page with
 * empty rows: e.g. sorting by alerts when only 300 entities have alerts adds 700 without alerts.
 */
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

/**
 * Each lookup lists its rows' ids in the query, and a query can't be too long, so the rows are
 * split: e.g. a search matching 5,000 entities looks up their alerts in 10 queries of 500, at once.
 */
const fetchValuesInChunks = async (
  column: ComputedColumn,
  rows: readonly Row[],
  args: QueryArgs,
  ctx: SortPageContext
): Promise<EnrichedFields> => {
  const values = await fetchInChunks(rows, VALUES_CHUNK_SIZE, (rowsChunk) =>
    column.fetchValues(rowsChunk, args, ctx)
  );
  return new Map(values.flatMap((chunkValues) => [...chunkValues]));
};

/**
 * Used when 1) sorting ascending, 2) the empty value is a number (a group of 1 record), so empty
 * rows come first (a null one would sort last, as ES|QL sorts nulls last), and 3) too many entities
 * have a value to exclude with `NOT entity.id IN (…)`.
 * E.g. sorting by records ascending with 50,000 groups with aliases: the with-value query stops at
 * one page (1,001 ids), so we read entities 1,000 at a time, look up their records, and keep the
 * ones with 1.
 */
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
    fetchPerIdChunk(ctx.runQuery, valueIds, (ids) => buildSearchedTargetsQuery(args, ids)),
    ctx.runQuery(emptyRowsQuery),
  ]);

  const searchedIds = new Set(getEntityIds(searched));
  return getSortedPage(args, [
    ...withValue.filter((row) => searchedIds.has(getEntityId(row) ?? '')),
    ...empty,
  ]);
};

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

export const fetchComputedColumnSortPage = (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext
): Promise<Row[]> => {
  // searchExpression is KQL and can't go after STATS or LOOKUP JOIN
  if (args.searchExpression) return fetchSearchedPage(column, args, ctx);

  return isEmptyFirst(column, args)
    ? fetchPageEmptyFirst(column, args, ctx)
    : fetchPageEmptyLast(column, args, ctx);
};

/** A column without data anywhere: every entity in view is empty, so they come by id. */
export const fetchEmptyColumnSortPage = (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext
): Promise<Row[]> => ctx.runQuery(buildEmptyRowsQuery(column, args, [], args.pageSize + 1));

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
