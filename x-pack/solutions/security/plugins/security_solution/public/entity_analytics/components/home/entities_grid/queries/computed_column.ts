/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { ENTITY_ID_FIELD, getEntityId, getEntityIds } from '../common';
import type { QueryArgs, Row, SortValue } from '../common';
import {
  buildEntitiesInViewConditions,
  buildEntitiesInViewSteps,
  buildSearchedTargetsQuery,
} from './entities_in_view';
import {
  ESQL_MAX_QUERY_LENGTH,
  ESQL_MAX_RESULT_ROWS,
  buildAliasesToResolvedEntitySteps,
  buildEntityAggregations,
  buildLookupJoinClause,
  buildRowFieldsSteps,
  buildRowRiskScoreSteps,
  buildSortSuffix,
  buildStatsByEntityClause,
  compareEntityIds,
  fetchPerIdChunk,
  toList,
} from './esql';
import type { EntityAggregation } from './esql';
import type { EnrichedFields, SortPageContext } from './types';

/*
 * Computed columns: columns whose values come from another index (alerts, last alert,
 * anomalies, risk score change, records). A column says where its values come from and what an
 * entity without any shows; this engine sorts by it.
 *
 * Reading every entity in view to sort them together is too slow on a large view (15–22s at 10M
 * entities, ECH, Oct 2026), so the rows come in two parts:
 * - value rows: the entities with a value, aggregated from the source index and sorted by it.
 * - empty rows: the others. They all show the empty value, so they sort among themselves by
 *   entity.id, natively on the entity index.
 * A search reads its matches and their values, and sorts them here: KQL can't run after the
 * join of the value rows.
 */

interface ComputedColumnBase {
  /** The column the rows sort by. */
  field: string;
  /** The value of an entity with no source rows. It sorts as a value: 0 and 1 first ascending. */
  emptyValue: number | null;
  /** `EVAL` that sets the column, and `columns`, on a row without source rows. */
  emptyColumns: string;
  /** The fields from the source index the rows carry; the column's own field by default. */
  columns?: readonly string[];
  /** The values of the given rows: the column's enricher. */
  fetchValues: (
    rows: readonly Row[],
    args: QueryArgs,
    ctx: SortPageContext
  ) => Promise<EnrichedFields>;
  /** One query over every entity in view, for a search the other plans can't read. */
  buildMergedSortQuery: (args: QueryArgs) => readonly string[];
}

/** A column whose values aggregate from source rows; each entity with one joins its doc. */
interface AggregatedColumn extends ComputedColumnBase {
  /** Statements that go before the query, for example `SET …;`. */
  settings?: readonly string[];
  /** The source index rows, each with the `entity.id` it counts for, before any STATS. */
  buildSourceRows: (args: QueryArgs) => readonly string[];
  /** How the source rows aggregate per entity, and over the aliases of a resolved entity. */
  aggregations: readonly EntityAggregation[];
  /** On resolved rows, the source rows of an alias count for its resolved entity. */
  rollsUpOverAliases: boolean;
  /** Steps after the STATS, for a value computed from the aggregations. */
  afterStats?: readonly string[];
}

/**
 * A column whose value needs a field of the entity doc, so it has its own query: joining the doc
 * of every entity with a value before sorting is too slow when they are many.
 */
interface QueriedColumn extends ComputedColumnBase {
  /** The entities in view with a value, sorted by it, `limit` rows. */
  buildValueRowsQuery: (args: QueryArgs, limit: number) => readonly string[];
}

export type ComputedColumn = AggregatedColumn | QueriedColumn;

/** Most rows ES|QL returns: the extra row of a full response tells there are more. */
const MAX_ROWS = ESQL_MAX_RESULT_ROWS - 1;

/** Entities read per batch when looking for the ones without a value. */
const EMPTY_ROWS_BATCH_SIZE = 1_000;

/** Rows per lookup of values: each lookup lists its ids in the query, which is capped at 1MB. */
const VALUES_CHUNK_SIZE = 500;

/** The rows plus one, sorted by the column. */
export const fetchComputedColumnSortPage = (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext
): Promise<Row[]> =>
  args.searchExpression ? fetchSearchedRows(column, args, ctx) : fetchRows(column, args, ctx);

// ── without a search ─────────────────────────────────────────────────────────

/**
 * Value rows first. When they are fewer than the limit, every entity with a value is known, so
 * the empty rows are one query that leaves them out. Otherwise the empty rows are only needed
 * when they sort first, and come from batches (see {@link fetchEmptyRowsInBatches}).
 */
const fetchRows = async (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext
): Promise<Row[]> => {
  const limit = args.pageSize + 1;
  const valueRows = await ctx.runQuery(buildValueRowsQuery(column, args, limit));
  // An empty value sorts first ascending, unless it is null: nulls always sort last.
  const emptyFirst = column.emptyValue != null && args.sort.direction === 'asc';
  if (valueRows.length >= limit) {
    if (!emptyFirst) return valueRows;
    const emptyRows = await fetchEmptyRowsInBatches(column, args, ctx, limit);
    return [...emptyRows, ...valueRows].slice(0, limit);
  }
  const emptyRows = await ctx.runQuery(
    buildEmptyRowsQuery(column, args, getEntityIds(valueRows), limit)
  );
  return (emptyFirst ? [...emptyRows, ...valueRows] : [...valueRows, ...emptyRows]).slice(0, limit);
};

/** The entities in view with a value, sorted by it. */
const buildValueRowsQuery = (
  column: ComputedColumn,
  args: QueryArgs,
  limit: number
): readonly string[] =>
  'buildValueRowsQuery' in column
    ? column.buildValueRowsQuery(args, limit)
    : buildAggregatedValueRowsQuery(column, args, limit);

const buildAggregatedValueRowsQuery = (
  column: AggregatedColumn,
  args: QueryArgs,
  limit: number
): string[] => [
  ...(column.settings ?? []),
  ...column.buildSourceRows(args),
  buildStatsByEntityClause(buildEntityAggregations(column.aggregations)),
  ...(column.rollsUpOverAliases && args.rowsMode === 'resolved'
    ? buildAliasesToResolvedEntitySteps(args.concreteEntityIndexName, column.aggregations)
    : []),
  ...(column.afterStats ?? []),
  buildLookupJoinClause(args.concreteEntityIndexName),
  ...buildEntitiesInViewConditions(args).map((condition) => `| WHERE ${condition}`),
  ...buildSortSuffix(column.field, args.sort.direction, limit),
  ...buildRowFieldsSteps(args, ...getColumns(column)),
];

const getColumns = (column: ComputedColumn): readonly string[] => column.columns ?? [column.field];

/**
 * The entities in view without a value, by entity.id: the entities in view but `valueIds`,
 * after `afterId`.
 */
const buildEmptyRowsQuery = (
  column: ComputedColumn,
  args: QueryArgs,
  valueIds: readonly string[],
  limit: number,
  afterId: string | null = null
): string[] => [
  ...buildEntitiesInViewSteps(args),
  ...buildRowRiskScoreSteps(args),
  ...(valueIds.length ? [`| WHERE NOT ${ENTITY_ID_FIELD} IN (${toList(valueIds)})`] : []),
  ...(afterId != null ? [`| WHERE ${ENTITY_ID_FIELD} > ${escapeStringValue(afterId)}`] : []),
  `| SORT ${ENTITY_ID_FIELD} ASC`,
  `| LIMIT ${limit}`,
  `| EVAL ${column.emptyColumns}`,
  ...buildRowFieldsSteps(args, ...getColumns(column)),
];

/**
 * The first entities in view without a value when there are too many with one to list: batches
 * of entities by entity.id, each kept but for the entities its values show to have one. Exact on
 * any data; the more entities have a value, the more batches it reads.
 */
const fetchEmptyRowsInBatches = async (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext,
  limit: number
): Promise<Row[]> => {
  const emptyRows: Row[] = [];
  let afterId: string | null = null;
  while (emptyRows.length < limit) {
    const batch = await ctx.runQuery(
      buildEmptyRowsQuery(column, args, [], EMPTY_ROWS_BATCH_SIZE, afterId)
    );
    if (!batch.length) break;
    const values = await fetchValuesInChunks(column, batch, args, ctx);
    emptyRows.push(
      ...batch.filter((row) => isEmptyValue(column, values.get(getEntityId(row) ?? '')))
    );
    if (batch.length < EMPTY_ROWS_BATCH_SIZE) break;
    afterId = getEntityId(batch[batch.length - 1]) ?? null;
  }
  return emptyRows.slice(0, limit);
};

const isEmptyValue = (column: ComputedColumn, fields: Row | undefined): boolean => {
  const value = fields?.[column.field];
  return value == null || value === column.emptyValue;
};

// ── with a search ────────────────────────────────────────────────────────────

/**
 * KQL can't run after the join of the value rows. A search that matches up to MAX_ROWS entities
 * reads them, looks up their values, and sorts them here. A broader search reads every value row
 * and keeps those the search matches, plus the matching entities without a value. Only when the
 * value rows are too many too does it run the merged query.
 */
const fetchSearchedRows = async (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext
): Promise<Row[]> => {
  const matches = await ctx.runQuery([
    ...buildEntitiesInViewSteps(args),
    ...buildRowRiskScoreSteps(args),
    `| LIMIT ${MAX_ROWS + 1}`,
    ...buildRowFieldsSteps(args),
  ]);
  if (matches.length <= MAX_ROWS) {
    const values = await fetchValuesInChunks(column, matches, args, ctx);
    return sortRows(
      args,
      column,
      matches.map((row) => ({ ...row, ...values.get(getEntityId(row) ?? '') }))
    );
  }
  return (
    (await fetchSearchedRowsByValues(column, args, ctx)) ??
    ctx.runQuery(column.buildMergedSortQuery(args))
  );
};

/**
 * Every value row, then the ones the search matches, and the matching entities without a value.
 * `null` when the value rows are more than MAX_ROWS, or their ids don't fit in one query.
 */
const fetchSearchedRowsByValues = async (
  column: ComputedColumn,
  args: QueryArgs,
  ctx: SortPageContext
): Promise<Row[] | null> => {
  const valueRows = await ctx.runQuery(
    buildValueRowsQuery(column, { ...args, searchExpression: undefined }, MAX_ROWS + 1)
  );
  if (valueRows.length > MAX_ROWS) return null;
  const valueIds = getEntityIds(valueRows);
  const emptyRowsQuery = buildEmptyRowsQuery(column, args, valueIds, args.pageSize + 1);
  if (emptyRowsQuery.join('\n').length > ESQL_MAX_QUERY_LENGTH) return null;

  const [searched, emptyRows] = await Promise.all([
    fetchPerIdChunk(ctx.runQuery, valueIds, (chunk) => buildSearchedTargetsQuery(args, chunk)),
    ctx.runQuery(emptyRowsQuery),
  ]);
  const searchedIds = new Set(getEntityIds(searched));
  return sortRows(args, column, [
    ...valueRows.filter((row) => searchedIds.has(getEntityId(row) ?? '')),
    ...emptyRows,
  ]);
};

/** The rows plus one, in the order of the sort. */
const sortRows = (args: QueryArgs, column: ComputedColumn, rows: Row[]): Row[] =>
  rows.sort(compareRows(column.field, args.sort.direction)).slice(0, args.pageSize + 1);

/** The column's values of the rows, looked up VALUES_CHUNK_SIZE rows at a time. */
const fetchValuesInChunks = async (
  column: ComputedColumn,
  rows: readonly Row[],
  args: QueryArgs,
  ctx: SortPageContext
): Promise<EnrichedFields> => {
  const chunks = Array.from({ length: Math.ceil(rows.length / VALUES_CHUNK_SIZE) }, (_, i) =>
    rows.slice(i * VALUES_CHUNK_SIZE, (i + 1) * VALUES_CHUNK_SIZE)
  );
  const values = await Promise.all(chunks.map((chunk) => column.fetchValues(chunk, args, ctx)));
  return new Map(values.flatMap((chunkValues) => [...chunkValues]));
};

const getSortValue = (row: Row, field: string): SortValue => {
  const value = row[field];
  return typeof value === 'string' || typeof value === 'number' ? value : null;
};

/** `SORT field <dir> NULLS LAST, entity.id ASC` order. */
const compareRows =
  (field: string, direction: QueryArgs['sort']['direction']) =>
  (a: Row, b: Row): number => {
    const [valueA, valueB] = [getSortValue(a, field), getSortValue(b, field)];
    if (valueA !== valueB) {
      if (valueA == null) return 1;
      if (valueB == null) return -1;
      return (valueA < valueB ? -1 : 1) * (direction === 'desc' ? -1 : 1);
    }
    return compareEntityIds(a, b);
  };
