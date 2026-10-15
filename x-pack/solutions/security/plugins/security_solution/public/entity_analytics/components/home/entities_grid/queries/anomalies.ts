/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANOMALY_COUNT_FIELD, getEntityId, getEntityIds, getNumber } from '../common';
import type { QueryArgs, Row } from '../common';
import { buildComputedColumnSortQuery } from './computed_column_sort';
import {
  ANOMALY_RECORD_FILTER,
  ML_ANOMALY_INDICES,
  buildAliasesToResolvedEntitySteps,
  buildAnomalyJobFilter,
  buildEntityAggregations,
  buildIdentityPrefilter,
  buildLookback,
  buildStatsByEntityClause,
  SET_UNMAPPED_NULLIFY,
  toList,
} from './esql';
import type { EntityAggregation } from './esql';
import { buildEuidStages } from './euid_pipeline';
import { withEntityAliases } from './resolved_entities';
import type { ColumnQuerySpec, EnrichedFields, SortPageContext } from './types';
import { fetchComputedColumnSortPage } from './computed_column';
import type { ComputedColumn } from './computed_column';

const ANOMALY_AGGREGATIONS: readonly EntityAggregation[] = [
  { field: ANOMALY_COUNT_FIELD, aggregation: 'COUNT(*)', resolvedEntity: 'SUM' },
];

const ANOMALY_COUNT_STATS = buildStatsByEntityClause(buildEntityAggregations(ANOMALY_AGGREGATIONS));

// ── what the column does ─────────────────────────────────────────────────────

const anomalyCountColumn: ComputedColumn = {
  field: ANOMALY_COUNT_FIELD,
  emptyValue: null,
  emptyColumns: `${ANOMALY_COUNT_FIELD} = TO_LONG(null)`,
  settings: [SET_UNMAPPED_NULLIFY],
  buildSourceRows: (args) => buildAnomalyEntityRows(args),
  aggregations: ANOMALY_AGGREGATIONS,
  rollsUpOverAliases: true,
  fetchValues: (rows, args, ctx) => fetchAnomalyCounts(rows, args, ctx),
  buildMergedSortQuery: (args) =>
    buildComputedColumnSortQuery(args, {
      settings: [SET_UNMAPPED_NULLIFY],
      sourceRows: [...buildAnomalyEntityRows(args), ANOMALY_COUNT_STATS],
      mergeAggregations: [`${ANOMALY_COUNT_FIELD} = MAX(${ANOMALY_COUNT_FIELD})`],
      resolvedEntityAggregations: args.rowsMode === 'resolved' ? ANOMALY_AGGREGATIONS : undefined,
      sortField: ANOMALY_COUNT_FIELD,
    }),
};

export const anomalyCountQuerySpec = {
  fetchSortPage: (args, ctx) => fetchComputedColumnSortPage(anomalyCountColumn, args, ctx),
  enricher: {
    fields: [ANOMALY_COUNT_FIELD],
    fetch: (rows, args, ctx) => fetchAnomalyCounts(rows, args, ctx),
  },
} satisfies ColumnQuerySpec;

// ── source rows ──────────────────────────────────────────────────────────────

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

// ── values of given rows ─────────────────────────────────────────────────────

/** The anomaly counts of the rows; a resolved row's anomalies include its aliases'. */
const fetchAnomalyCounts = async (
  rows: readonly Row[],
  args: QueryArgs,
  { runQuery }: SortPageContext
): Promise<EnrichedFields> => {
  // Without security jobs there is no anomaly index to read, and no anomaly.
  if (!getEntityIds(rows).length || !args.anomalyJobIds.length) return toAnomalyCounts(rows, []);
  const entities =
    args.rowsMode === 'resolved' ? await withEntityAliases(rows, args, runQuery) : rows;
  return toAnomalyCounts(
    rows,
    await runQuery([
      SET_UNMAPPED_NULLIFY,
      ...buildAnomalyEntityRows(args, buildIdentityPrefilter(entities)),
      `| WHERE \`entity.id\` IN (${toList(getEntityIds(entities))})`,
      ANOMALY_COUNT_STATS,
      ...(args.rowsMode === 'resolved'
        ? buildAliasesToResolvedEntitySteps(args.concreteEntityIndexName, ANOMALY_AGGREGATIONS)
        : []),
    ])
  );
};

/** The anomaly count of each row; null without anomalies, as in the sort queries. */
const toAnomalyCounts = (rows: readonly Row[], counts: Row[]): EnrichedFields => {
  const byId = new Map(
    counts.map((row) => [getEntityId(row), getNumber(row, ANOMALY_COUNT_FIELD)])
  );
  return new Map(
    getEntityIds(rows).map((id) => [id, { [ANOMALY_COUNT_FIELD]: byId.get(id) ?? null }])
  );
};
