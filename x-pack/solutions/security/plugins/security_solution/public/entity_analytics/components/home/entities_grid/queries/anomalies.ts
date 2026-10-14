/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildIdentityPrefilter,
  ML_ANOMALY_INDICES,
  ANOMALY_RECORD_FILTER,
  buildAnomalyJobFilter,
  buildLookback,
  buildEntityAggregations,
  buildStatsByEntityClause,
  buildAliasesToResolvedEntitySteps,
  toList,
} from './esql';
import type { EntityAggregation } from './esql';
import { getEntityIds, getEntityId, getNumber, ANOMALY_COUNT_FIELD } from '../common';
import { buildEuidStages } from './euid_pipeline';
import { buildComputedColumnSortQuery } from './computed_column_sort';
import type { QueryArgs, Row } from '../common';
import { withEntityAliases } from './resolved_entities';
import { buildEntityListSortPlan, fetchSplitSortPage } from './split_sort';
import type { SplitSortPlan } from './split_sort';
import type { ColumnQuerySpec, EnrichedFields, RunContext } from './types';

/** ML anomaly indices have different mappings; unmapped fields read as null, not as errors. */
const SET_UNMAPPED_NULLIFY = 'SET unmapped_fields="nullify";';

const ANOMALY_AGGREGATIONS: readonly EntityAggregation[] = [
  { field: ANOMALY_COUNT_FIELD, aggregation: 'COUNT(*)', resolvedEntity: 'SUM' },
];

const ANOMALY_COUNT_STATS = buildStatsByEntityClause(buildEntityAggregations(ANOMALY_AGGREGATIONS));

/**
 * Final anomaly records of the security jobs in the time range, one row per record with its
 * derived `entity.id`. `identityPrefilter` narrows the records before the EUID evaluation,
 * which can't push down.
 */
const buildAnomalyEntityRows = (
  { timeRange, anomalyJobIds }: QueryArgs,
  identityPrefilter?: string
): string[] => [
  `FROM ${ML_ANOMALY_INDICES}`,
  `| WHERE ${ANOMALY_RECORD_FILTER} AND \`@timestamp\` >= ${buildLookback(
    timeRange
  )} AND ${buildAnomalyJobFilter(anomalyJobIds)}`,
  ...(identityPrefilter ? [`| WHERE ${identityPrefilter}`] : []),
  ...buildEuidStages(),
];

// ── what the column does ─────────────────────────────────────────────────────

export const anomalyCountQuerySpec = {
  fetchSortPage: (args, ctx) => fetchSplitSortPage(getAnomalySortPlan(args), args, ctx),
  enricher: {
    fields: [ANOMALY_COUNT_FIELD],
    fetch: (rows, args, ctx) => fetchAnomalyCounts(rows, args, ctx),
  },
} satisfies ColumnQuerySpec;

// ── sorts ────────────────────────────────────────────────────────────────────

/** The plan of the sort (see split_sort.ts); a resolved row's anomalies include its aliases'. */
const getAnomalySortPlan = ({ rowsMode }: QueryArgs): SplitSortPlan =>
  buildEntityListSortPlan({
    sortField: ANOMALY_COUNT_FIELD,
    emptyValue: null,
    buildSourceRows: (args) => [SET_UNMAPPED_NULLIFY, ...buildAnomalyEntityRows(args)],
    buildSortQuery:
      rowsMode === 'resolved' ? buildResolvedAnomalyCountSortQuery : buildAnomalyCountSortQuery,
    aggregations: ANOMALY_AGGREGATIONS,
    columns: [ANOMALY_COUNT_FIELD],
    emptyColumns: `${ANOMALY_COUNT_FIELD} = TO_LONG(null)`,
  });

/** Every entity in view, sorted by its anomaly count; entities without anomalies sort last. */
const buildAnomalyCountSortQuery = (args: QueryArgs): string[] =>
  buildComputedColumnSortQuery(args, buildAnomalyCountsOfEntitiesInView(args));

/** The same, with the anomalies of an alias counted for its resolved entity. */
const buildResolvedAnomalyCountSortQuery = (args: QueryArgs): string[] =>
  buildComputedColumnSortQuery(args, {
    ...buildAnomalyCountsOfEntitiesInView(args),
    resolvedEntityAggregations: ANOMALY_AGGREGATIONS,
  });

const buildAnomalyCountsOfEntitiesInView = (args: QueryArgs) => ({
  settings: [SET_UNMAPPED_NULLIFY],
  sourceRows: [...buildAnomalyEntityRows(args), ANOMALY_COUNT_STATS],
  mergeAggregations: [`${ANOMALY_COUNT_FIELD} = MAX(${ANOMALY_COUNT_FIELD})`],
  sortField: ANOMALY_COUNT_FIELD,
});

// ── enrich ───────────────────────────────────────────────────────────────────

/** The anomaly counts of the page's entities; a resolved row's anomalies include its aliases'. */
const fetchAnomalyCounts = async (
  rows: readonly Row[],
  args: QueryArgs,
  { runQuery }: RunContext
): Promise<EnrichedFields> => {
  // Without security jobs there is no anomaly index to read, and no anomaly.
  if (!getEntityIds(rows).length || !args.anomalyJobIds.length) return toAnomalyCounts(rows, []);
  const query =
    args.rowsMode === 'resolved'
      ? buildResolvedPageAnomalyCountsQuery(args, await withEntityAliases(rows, args, runQuery))
      : buildPageAnomalyCountsQuery(args, rows);
  return toAnomalyCounts(rows, await runQuery(query));
};

const buildPageAnomalyCountsQuery = (args: QueryArgs, entities: readonly Row[]): string[] => [
  ...buildPageAnomalyRecordsSteps(args, entities),
  ANOMALY_COUNT_STATS,
];

const buildResolvedPageAnomalyCountsQuery = (
  args: QueryArgs,
  entities: readonly Row[]
): string[] => [
  ...buildPageAnomalyRecordsSteps(args, entities),
  ANOMALY_COUNT_STATS,
  ...buildAliasesToResolvedEntitySteps(args.concreteEntityIndexName, ANOMALY_AGGREGATIONS),
];

/** The anomaly records of the given entities, as rows of `entity.id`. */
const buildPageAnomalyRecordsSteps = (args: QueryArgs, entities: readonly Row[]): string[] => [
  SET_UNMAPPED_NULLIFY,
  ...buildAnomalyEntityRows(args, buildIdentityPrefilter(entities)),
  `| WHERE \`entity.id\` IN (${toList(getEntityIds(entities))})`,
];

/** The anomaly count of each row; null without anomalies, as in the sort queries. */
const toAnomalyCounts = (rows: readonly Row[], counts: Row[]): EnrichedFields => {
  const byId = new Map(
    counts.map((row) => [getEntityId(row), getNumber(row, ANOMALY_COUNT_FIELD)])
  );
  return new Map(
    getEntityIds(rows).map((id) => [id, { [ANOMALY_COUNT_FIELD]: byId.get(id) ?? null }])
  );
};
