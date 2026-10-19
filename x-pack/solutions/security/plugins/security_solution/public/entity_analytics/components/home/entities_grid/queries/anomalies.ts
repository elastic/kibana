/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANOMALY_COUNT_FIELD, getEntityId, getEntityIds, getNumber } from '../common';
import type { QueryArgs, Row } from '../common';
import { IN_VIEW_AGGREGATION, IN_VIEW_FIELD, buildEntitiesInViewBranch } from './entities_in_view';
import {
  ANOMALY_RECORD_FILTER,
  ID_LIST_CHUNK_SIZE,
  ML_ANOMALY_INDICES,
  buildAnomalyJobFilter,
  buildEntityAggregations,
  buildFilterClause,
  buildIdentityPrefilter,
  buildJoinedPageSteps,
  buildLookback,
  buildStatsByEntityClause,
  SET_UNMAPPED_NULLIFY,
  toList,
  fetchInChunks,
} from './esql';
import type { EntityAggregation } from './esql';
import { buildEuidStages } from './euid_pipeline';
import {
  buildRollUpOverAliasesSteps,
  getMergedRowsByEntity,
  withEntityAliases,
} from './resolved_entities';
import type { EnrichedFields, SortPageContext } from './types';
import { buildSortWithValueSteps, getComputedColumnQuerySpec } from './computed_column';
import type { ComputedColumn } from './computed_column';

const ANOMALY_AGGREGATIONS: readonly EntityAggregation[] = [
  { field: ANOMALY_COUNT_FIELD, aggregation: 'COUNT(*)', resolvedEntity: 'SUM' },
];

const ANOMALY_COUNT_STATS = buildStatsByEntityClause(buildEntityAggregations(ANOMALY_AGGREGATIONS));

/** ML records lack entity.id, so it's derived; `identityPrefilter` narrows them first, as that can't push down. */
const buildAnomalyEntityRows = (
  { timeRange, anomalyJobIds }: QueryArgs,
  identityPrefilter?: string
): string[] => [
  `FROM ${ML_ANOMALY_INDICES}`,
  `| WHERE ${ANOMALY_RECORD_FILTER} AND \`@timestamp\` >= ${buildLookback(
    timeRange
  )} AND ${buildAnomalyJobFilter(anomalyJobIds)}`,
  ...buildFilterClause(identityPrefilter),
  ...buildEuidStages(),
];

const buildAnomalySortWithValueQuery = (args: QueryArgs, limit: number): string[] => [
  SET_UNMAPPED_NULLIFY,
  ...buildAnomalyEntityRows(args),
  ANOMALY_COUNT_STATS,
  ...buildRollUpOverAliasesSteps(args, ANOMALY_AGGREGATIONS),
  ...buildSortWithValueSteps(args, ANOMALY_COUNT_FIELD, limit),
];

const buildAnomalySortAllQuery = (args: QueryArgs): string[] => [
  SET_UNMAPPED_NULLIFY,
  'FROM (',
  ...buildAnomalyEntityRows(args),
  ANOMALY_COUNT_STATS,
  '), (',
  ...buildEntitiesInViewBranch(args),
  ')',
  buildStatsByEntityClause([
    `${ANOMALY_COUNT_FIELD} = MAX(${ANOMALY_COUNT_FIELD})`,
    ...buildEntityAggregations([IN_VIEW_AGGREGATION]),
  ]),
  ...buildRollUpOverAliasesSteps(args, [...ANOMALY_AGGREGATIONS, IN_VIEW_AGGREGATION]),
  `| WHERE ${IN_VIEW_FIELD} == 1`,
  ...buildJoinedPageSteps(args, ANOMALY_COUNT_FIELD),
];

const fetchAnomalyCounts = async (
  rows: readonly Row[],
  args: QueryArgs,
  { runQuery }: SortPageContext
): Promise<EnrichedFields> => {
  // Without security jobs there is no anomaly index to read, and no anomaly.
  if (!getEntityIds(rows).length || !args.anomalyJobIds.length) return toAnomalyCounts(rows, []);
  const entities =
    args.rowsMode === 'resolved' ? await withEntityAliases(rows, args, runQuery) : rows;
  // Each part lists its entities in the query, so a large group is read in several.
  const counts = await fetchInChunks(entities, ID_LIST_CHUNK_SIZE, (part) =>
    runQuery([
      SET_UNMAPPED_NULLIFY,
      ...buildAnomalyEntityRows(args, buildIdentityPrefilter(part)),
      `| WHERE \`entity.id\` IN (${toList(getEntityIds(part))})`,
      ANOMALY_COUNT_STATS,
      ...buildRollUpOverAliasesSteps(args, ANOMALY_AGGREGATIONS),
    ])
  );
  return toAnomalyCounts(rows, getMergedRowsByEntity(counts.flat(), ANOMALY_AGGREGATIONS));
};

const toAnomalyCounts = (rows: readonly Row[], counts: Row[]): EnrichedFields => {
  const byId = new Map(
    counts.map((row) => [getEntityId(row), getNumber(row, ANOMALY_COUNT_FIELD)])
  );
  return new Map(
    getEntityIds(rows).map((id) => [id, { [ANOMALY_COUNT_FIELD]: byId.get(id) ?? null }])
  );
};

const anomalyCountColumn: ComputedColumn = {
  emptyValues: { [ANOMALY_COUNT_FIELD]: null },
  buildSortAllQuery: buildAnomalySortAllQuery,
  buildSortWithValueQuery: buildAnomalySortWithValueQuery,
  fetchValues: fetchAnomalyCounts,
};

export const anomalyCountQuerySpec = getComputedColumnQuerySpec(anomalyCountColumn);
