/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_FIELD, getEntityIds } from '../common';
import { buildEntitiesInViewConditions, buildEntitiesInViewSteps } from './entities_in_view';
import {
  buildRowRiskScoreSteps,
  buildRowFieldsSteps,
  buildLookupJoinClause,
  buildEntityAggregations,
  buildStatsByEntityClause,
  buildAliasesToResolvedEntitySteps,
  buildSortSuffix,
  ESQL_MAX_QUERY_LENGTH,
  ESQL_MAX_RESULT_ROWS,
  toList,
} from './esql';
import type { EntityAggregation } from './esql';
import type { QueryArgs, Row } from '../common';
import type { EsqlRunner, SortPageContext } from './types';

/*
 * Split sort: sorting by a column computed from another index (alerts, anomalies, risk score
 * change).
 *
 * The values of these columns aren't on the entity doc. An entity with no rows in the other
 * index gets the column's empty value (0 for the alert count, null otherwise), so all such
 * entities tie. The general query reads every entity to sort them, which is slow on large
 * views. Instead, read two blocks separately:
 * - value rows: the entities with a value, sorted by it.
 * - empty rows: everyone else, sorted by entity.id.
 * The rows are the first block, then the second when the first is short: the same rows as the
 * general query's. Measured on 10M entities (ECH, Oct 2026): 15–22s → 0.8–6s without filters.
 * Search uses the general query: KQL can't run after a LOOKUP JOIN.
 */

/**
 * Most value rows a split sort reads. Above it, the split sort can't list the value ids to
 * exclude from the empty rows, so the general query runs. One below the ES|QL result cap,
 * so the extra row that signals "more" can come back.
 */
const MAX_VALUE_ROWS = ESQL_MAX_RESULT_ROWS - 1;

export interface SplitSortPlan {
  /** Sort value of an entity without a source value: 0 sorts first ascending, null always last. */
  emptyValue: 0 | null;
  /** The value rows, sorted, at most `limit` rows. */
  buildValueRowsQuery: (args: QueryArgs, limit: number) => string[];
  /** General sort query, for views where the split does not apply. */
  buildSortQuery: (args: QueryArgs) => string[];
  /** The empty rows, sorted by entity.id, at most `limit` rows. */
  fetchEmptyRows: (args: QueryArgs, runQuery: EsqlRunner, limit: number) => Promise<Row[] | null>;
}

interface EmptyRowsOptions {
  /** Conditions that select entities without a value. */
  conditions?: readonly string[];
  /** `EVAL` that sets the computed columns to their empty values. */
  emptyColumns: string;
  /** Computed columns the rows carry, kept after the entity fields. */
  columns: readonly string[];
}

/** Entities in view without a value, sorted by entity.id. */
export const buildEmptyRowsQuery = (
  args: QueryArgs,
  { conditions = [], emptyColumns, columns }: EmptyRowsOptions,
  limit: number
): string[] => [
  ...buildEntitiesInViewSteps(args),
  ...buildRowRiskScoreSteps(args),
  ...conditions.map((condition) => `| WHERE ${condition}`),
  `| SORT ${ENTITY_ID_FIELD} ASC`,
  `| LIMIT ${limit}`,
  `| EVAL ${emptyColumns}`,
  ...buildRowFieldsSteps(args, ...columns),
];

interface EntityListSortOptions {
  sortField: string;
  emptyValue: SplitSortPlan['emptyValue'];
  /** Source index rows mapped to `entity.id`, before any STATS. */
  buildSourceRows: (args: QueryArgs) => readonly string[];
  buildSortQuery: (args: QueryArgs) => string[];
  /**
   * The computed columns: how they aggregate per entity, and for a resolved entity. On resolved
   * rows the source rows of an alias count for its resolved entity.
   */
  aggregations: readonly EntityAggregation[];
  /** Computed columns the rows carry. */
  columns: readonly string[];
  /** `EVAL` that sets the computed columns of an empty row. */
  emptyColumns: string;
}

/**
 * Split sort plan for a source index that lists the entities with a value (alerts,
 * anomalies): value rows aggregate the list, empty rows are the entities not in it.
 */
export const buildEntityListSortPlan = (options: EntityListSortOptions): SplitSortPlan => ({
  emptyValue: options.emptyValue,
  buildSortQuery: options.buildSortQuery,
  buildValueRowsQuery: (args, limit) => buildEntityListValueRowsQuery(options, args, limit),
  fetchEmptyRows: (args, runQuery, limit) =>
    fetchEntityListEmptyRows(options, args, runQuery, limit),
});

/** Entities in view with a value, with their entity docs and the given columns. */
const buildEntitiesWithValuesSteps = (
  { buildSourceRows }: EntityListSortOptions,
  args: QueryArgs,
  aggregations: readonly EntityAggregation[]
): string[] => [
  ...buildSourceRows(args),
  buildStatsByEntityClause(buildEntityAggregations(aggregations)),
  ...(args.rowsMode === 'resolved'
    ? buildAliasesToResolvedEntitySteps(args.concreteEntityIndexName, aggregations)
    : []),
  buildLookupJoinClause(args.concreteEntityIndexName),
  ...buildEntitiesInViewConditions(args).map((condition) => `| WHERE ${condition}`),
];

const buildEntityListValueRowsQuery = (
  options: EntityListSortOptions,
  args: QueryArgs,
  limit: number
): string[] => [
  ...buildEntitiesWithValuesSteps(options, args, options.aggregations),
  ...buildSortSuffix(options.sortField, args.sort.direction, limit),
  ...buildRowFieldsSteps(args, ...options.columns),
];

/**
 * The entities in view that are not in the list. Null when the list doesn't fit in one
 * response, or its ids don't fit in one query.
 */
const fetchEntityListEmptyRows = async (
  options: EntityListSortOptions,
  args: QueryArgs,
  runQuery: EsqlRunner,
  limit: number
): Promise<Row[] | null> => {
  const valueIdsQuery = [
    ...buildEntitiesWithValuesSteps(options, args, []),
    '| KEEP `entity.id`',
    `| LIMIT ${MAX_VALUE_ROWS + 1}`,
  ];
  const ids = getEntityIds(await runQuery(valueIdsQuery));
  if (ids.length > MAX_VALUE_ROWS) return null;
  const { emptyColumns, columns } = options;
  const conditions = ids.length ? [`NOT ${ENTITY_ID_FIELD} IN (${toList(ids)})`] : [];
  const emptyRowsQuery = buildEmptyRowsQuery(args, { conditions, emptyColumns, columns }, limit);
  // Long ids can make the excluded list longer than ES|QL parses.
  if (emptyRowsQuery.join('\n').length > ESQL_MAX_QUERY_LENGTH) return null;
  return runQuery(emptyRowsQuery);
};

/**
 * The rows plus one, read as value rows and empty rows. Falls back to the general sort query
 * for a search, and when the empty rows can't be read.
 */
export const fetchSplitSortPage = async (
  plan: SplitSortPlan,
  args: QueryArgs,
  { runQuery }: SortPageContext
): Promise<Row[]> => {
  const fetchGeneral = () => runQuery(plan.buildSortQuery(args));
  if (args.searchExpression) return fetchGeneral();

  const readEmpty = (limit: number) => plan.fetchEmptyRows(args, runQuery, limit);
  const readValues = (limit: number) => runQuery(plan.buildValueRowsQuery(args, limit));
  // Empty rows come first only for a 0 empty value in ascending order.
  const emptyFirst = plan.emptyValue === 0 && args.sort.direction === 'asc';
  const [readFirst, readSecond] = emptyFirst ? [readEmpty, readValues] : [readValues, readEmpty];

  const limit = args.pageSize + 1;
  const first = await readFirst(limit);
  if (first == null) return fetchGeneral();
  if (first.length >= limit) return first;
  const second = await readSecond(limit - first.length);
  return second == null ? fetchGeneral() : [...first, ...second];
};
