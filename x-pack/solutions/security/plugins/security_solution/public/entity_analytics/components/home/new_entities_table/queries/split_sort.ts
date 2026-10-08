/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_FIELD, getEntityId } from '../common';
import {
  buildEntitiesInViewConditions,
  buildEntitiesInViewCountQuery,
  buildEntitiesInViewSteps,
} from './entities_in_view';
import { buildKeepClause, buildLookupJoinClause, esc, toList } from './esql';
import type {
  EsqlRunner,
  PageCursor,
  QueryArgs,
  Row,
  SortPageContext,
  SortQuerySpec,
} from '../common';

/*
 * Split sort: a foreign sort that reads its two kinds of rows separately.
 *
 * The general sort query (`buildSortQuery`) merges the foreign values with every entity in
 * view, so it reads `entity.id` for every entity in view. On a large view that read is
 * most of the cost (about 20s for 10M entities on ECH). Yet the rows split in two:
 * - value rows: entities with a foreign value (alerts, anomalies, a risk score change).
 *   There are few of them, and they come from the foreign index plus a LOOKUP JOIN.
 * - empty rows: every other entity in view. Their sort value is the column's empty value
 *   (0 or null), so they sort as one block, by `entity.id` ascending, and a native query
 *   over the entity index reads them.
 * Pages use a cursor (sort value + entity.id), so each page reads from one block, or the end
 * of one block and the start of the other. Every page has the same rows as the general query.
 *
 * Above SPLIT_SORT_MIN_VIEW_SIZE entities in view this is about 5–10x faster on ECH; below
 * it the general query is cheaper. Search keeps the general query: KQL can't run after a
 * LOOKUP JOIN.
 */

/**
 * Views with fewer entities keep the general sort query.
 *
 * Why: the split sort avoids reading `entity.id` for every entity in view, but costs one or
 * two extra queries, so it only pays off on large views.
 * Measured (10M entities, 16GB ECH, Oct 2026): no filter 15–22s → 0.8–6s, a host filter
 * 5–8s → 0.4–2s; the two lines cross at about 500k entities in view.
 * Rejected: caching the value ids per filter set. It would only help pages inside the empty
 * block, and goes stale as new alerts arrive.
 */
export const SPLIT_SORT_MIN_VIEW_SIZE = 500_000;

/**
 * Most value rows a split sort reads: ES|QL returns at most 10k rows. Above it, the split
 * sort can't list the value ids to exclude from the empty rows, so the general query runs.
 */
const MAX_VALUE_ROWS = 10_000;

export interface SplitSortPlan {
  /** Sort value of an entity without foreign data: 0 sorts first ascending, null always last. */
  emptyValue: 0 | null;
  /** Page of value rows after the cursor, sorted, at most `limit` rows. */
  buildValueRowsQuery: (args: QueryArgs, limit: number) => string;
  /** General sort query, for views where the split does not apply. */
  buildSortQuery: (args: QueryArgs) => string;
  /** Page of empty rows after `afterId`, sorted by entity.id, at most `limit` rows. */
  fetchEmptyRows: (
    args: QueryArgs,
    runQuery: EsqlRunner,
    afterId: string | null,
    limit: number
  ) => Promise<Row[] | null>;
}

export const isLargeView = (args: QueryArgs, viewSize: number): boolean =>
  !args.searchExpression && viewSize >= SPLIT_SORT_MIN_VIEW_SIZE;

/**
 * Keeps the value rows after the cursor in `SORT field <dir>, entity.id ASC` order. Unlike
 * `buildCursorClause` it leaves out empty rows: the empty block is read separately.
 */
export const buildValueCursorClause = (cursor: PageCursor | null): string[] => {
  if (cursor == null || cursor.sortValue == null) return [];
  const { sortField, sortValue, sortDirection, entityId } = cursor;
  const op = sortDirection === 'desc' ? '<' : '>';
  const val = typeof sortValue === 'string' ? esc(sortValue) : String(sortValue);
  return [
    `| WHERE (${sortField} ${op} ${val}) OR (${sortField} == ${val} AND ${ENTITY_ID_FIELD} > ${esc(
      entityId
    )})`,
  ];
};

/** Sort and limit of a page of value rows. */
export const buildValueSortSuffix = (
  args: QueryArgs,
  sortField: string,
  limit: number
): string[] => [
  `| SORT ${sortField} ${args.sort.direction.toUpperCase()} NULLS LAST, ${ENTITY_ID_FIELD} ASC`,
  `| LIMIT ${limit}`,
];

interface EmptyRowsOptions {
  /** Entities to leave out: the entities with a value. */
  excludeIds?: readonly string[];
  /** Conditions that select entities without a value. */
  conditions?: readonly string[];
  /** `EVAL` that sets the foreign columns to their empty values. */
  emptyColumns: string;
  /** Foreign columns the rows carry, kept after the entity fields. */
  columns: readonly string[];
}

/** Page of entities in view without a value, after `afterId`, sorted by entity.id. */
export const buildEmptyRowsQuery = (
  args: QueryArgs,
  { excludeIds = [], conditions = [], emptyColumns, columns }: EmptyRowsOptions,
  afterId: string | null,
  limit: number
): string =>
  [
    ...buildEntitiesInViewSteps(args),
    ...conditions.map((condition) => `| WHERE ${condition}`),
    ...(excludeIds.length ? [`| WHERE NOT ${ENTITY_ID_FIELD} IN (${toList(excludeIds)})`] : []),
    ...(afterId != null ? [`| WHERE ${ENTITY_ID_FIELD} > ${esc(afterId)}`] : []),
    `| SORT ${ENTITY_ID_FIELD} ASC`,
    `| LIMIT ${limit}`,
    `| EVAL ${emptyColumns}`,
    buildKeepClause(args, ...columns),
  ].join('\n');

/**
 * Empty rows when the value rows come from a list of entities: the empty rows are the
 * entities in view that are not in the list. `null` when the list doesn't fit in one response.
 */
const fetchEmptyRowsExcludingValueIds = async (
  args: QueryArgs,
  runQuery: EsqlRunner,
  /** Entities with a value, one row per `entity.id`. */
  valueEntities: readonly string[],
  options: Omit<EmptyRowsOptions, 'excludeIds'>,
  afterId: string | null,
  limit: number
): Promise<Row[] | null> => {
  const valueIdsQuery = [...valueEntities, '| KEEP `entity.id`', `| LIMIT ${MAX_VALUE_ROWS + 1}`];
  const ids = (await runQuery(valueIdsQuery.join('\n')))
    .map(getEntityId)
    .filter((id): id is string => id != null);
  if (ids.length > MAX_VALUE_ROWS) return null;
  return runQuery(buildEmptyRowsQuery(args, { ...options, excludeIds: ids }, afterId, limit));
};

interface EntityListSortOptions {
  sortField: string;
  emptyValue: SplitSortPlan['emptyValue'];
  /** Foreign index rows mapped to `entity.id`, before any STATS. */
  buildForeignRows: (args: QueryArgs) => readonly string[];
  buildSortQuery: (args: QueryArgs) => string;
  /** STATS aggregations of the foreign columns. */
  aggregations: readonly string[];
  /** Foreign columns the rows carry. */
  columns: readonly string[];
  /** `EVAL` that sets the foreign columns of an empty row. */
  emptyColumns: string;
}

/**
 * Split sort plan for a foreign index that lists the entities with a value (alerts,
 * anomalies): value rows aggregate the list, empty rows are the entities not in it.
 */
export const buildEntityListSortPlan = ({
  sortField,
  emptyValue,
  buildForeignRows,
  buildSortQuery,
  aggregations,
  columns,
  emptyColumns,
}: EntityListSortOptions): SplitSortPlan => {
  /** Entities in view with a value, with their entity docs. */
  const buildEntitiesWithValues = (args: QueryArgs, groupBy: string): string[] => [
    ...buildForeignRows(args),
    groupBy,
    buildLookupJoinClause(args.concreteEntityIndexName),
    ...buildEntitiesInViewConditions(args).map((condition) => `| WHERE ${condition}`),
  ];
  return {
    emptyValue,
    buildValueRowsQuery: (args, limit) =>
      [
        ...buildEntitiesWithValues(args, `| STATS ${aggregations.join(', ')} BY \`entity.id\``),
        ...buildValueCursorClause(args.cursor),
        ...buildValueSortSuffix(args, sortField, limit),
        buildKeepClause(args, ...columns),
      ].join('\n'),
    buildSortQuery,
    fetchEmptyRows: (args, runQuery, afterId, limit) =>
      fetchEmptyRowsExcludingValueIds(
        args,
        runQuery,
        buildEntitiesWithValues(args, '| STATS BY `entity.id`'),
        { emptyColumns, columns },
        afterId,
        limit
      ),
  };
};

/**
 * One page of rows plus one, read as value rows and empty rows. Falls back to the general
 * sort query for small views, search, and when the empty rows can't be read.
 */
export const fetchSplitSortPage = async (
  plan: SplitSortPlan,
  args: QueryArgs,
  { runQuery, viewSize }: SortPageContext
): Promise<Row[]> => {
  const general = () => runQuery(plan.buildSortQuery(args));
  if (!isLargeView(args, viewSize)) return general();

  const limit = args.pageSize + 1;
  const { cursor } = args;
  const inEmptyBlock = cursor != null && cursor.sortValue === plan.emptyValue;
  const emptyRows = async (afterId: string | null, count: number): Promise<Row[] | null> =>
    plan.fetchEmptyRows(args, runQuery, afterId, count);
  const valueRows = (valueArgs: QueryArgs, count: number) =>
    runQuery(plan.buildValueRowsQuery(valueArgs, count));

  // Empty rows come first only for a 0 empty value in ascending order.
  const emptyFirst = plan.emptyValue === 0 && args.sort.direction === 'asc';

  if (emptyFirst) {
    if (cursor != null && !inEmptyBlock) return valueRows(args, limit);
    const empty = await emptyRows(cursor?.entityId ?? null, limit);
    if (empty == null) return general();
    if (empty.length >= limit) return empty;
    return [...empty, ...(await valueRows({ ...args, cursor: null }, limit - empty.length))];
  }

  if (inEmptyBlock) {
    const empty = await emptyRows(cursor.entityId, limit);
    return empty ?? general();
  }
  const values = await valueRows(args, limit);
  if (values.length >= limit) return values;
  const empty = await emptyRows(null, limit - values.length);
  return empty == null ? general() : [...values, ...empty];
};

/** Sort spec of a column with a split sort plan: the plan's general query or its split pages. */
export const buildSplitSortSpec = (plan: SplitSortPlan): SortQuerySpec => ({
  buildSortQuery: plan.buildSortQuery,
  buildCountQuery: buildEntitiesInViewCountQuery,
  fetchSortPage: (args, ctx) => fetchSplitSortPage(plan, args, ctx),
});
