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
  buildResolvedEntityAggregations,
  buildResolvedEntityAggregationSteps,
  toList,
} from './esql';
import type { EntityAggregation } from './esql';
import { getEntityIds, getEntityId, getNumber, ANOMALY_COUNT_FIELD } from '../common';
import { buildEuidStages } from './euid_pipeline';
import { buildMergedForeignSortQuery } from './foreign_sort';
import type { QueryArgs, Row } from '../common';
import { withEntityAliases } from './resolved_entity_aliases';
import { buildEntityListSortPlan, fetchSplitSortPage } from './split_sort';
import type { SplitSortPlan } from './split_sort';
import type { ColumnQuerySpec, PageEnricher } from './types';

/** ML anomaly indices have different mappings; unmapped fields read as null, not as errors. */
const SET_UNMAPPED_NULLIFY = 'SET unmapped_fields="nullify";';

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

// ── sort queries ──────────────────────────────────────────────────────────────

const ANOMALY_AGGREGATIONS: readonly EntityAggregation[] = [
  { field: ANOMALY_COUNT_FIELD, aggregation: 'COUNT(*)', resolvedEntity: 'SUM' },
];

const ANOMALY_RESOLVED_ENTITY_AGGREGATIONS = buildResolvedEntityAggregations(ANOMALY_AGGREGATIONS);

/** Entities without anomalies have no count and sort last. */
const buildAnomalyCountSortQuery = (args: QueryArgs): string =>
  buildMergedForeignSortQuery(args, {
    settings: [SET_UNMAPPED_NULLIFY],
    foreignRows: [
      ...buildAnomalyEntityRows(args),
      `| STATS ${buildEntityAggregations(ANOMALY_AGGREGATIONS).join(', ')} BY \`entity.id\``,
      ...buildResolvedEntityAggregationSteps(args, ANOMALY_RESOLVED_ENTITY_AGGREGATIONS),
    ],
    mergeAggregations: [`${ANOMALY_COUNT_FIELD} = MAX(${ANOMALY_COUNT_FIELD})`],
    sortField: ANOMALY_COUNT_FIELD,
  });

// ── split sort (see split_sort.ts) ───────────────────────────────────────────

const anomalySplitSortPlan: SplitSortPlan = buildEntityListSortPlan({
  sortField: ANOMALY_COUNT_FIELD,
  emptyValue: null,
  buildForeignRows: (args) => [SET_UNMAPPED_NULLIFY, ...buildAnomalyEntityRows(args)],
  buildSortQuery: buildAnomalyCountSortQuery,
  aggregations: ANOMALY_AGGREGATIONS,
  columns: [ANOMALY_COUNT_FIELD],
  emptyColumns: `${ANOMALY_COUNT_FIELD} = TO_LONG(null)`,
});

// ── enrichment ────────────────────────────────────────────────────────────────

const buildAnomalyCountEnrichQuery = (args: QueryArgs, entityRows: readonly Row[]): string =>
  [
    SET_UNMAPPED_NULLIFY,
    ...buildAnomalyEntityRows(args, buildIdentityPrefilter(entityRows)),
    `| WHERE \`entity.id\` IN (${toList(getEntityIds(entityRows))})`,
    `| STATS ${buildEntityAggregations(ANOMALY_AGGREGATIONS).join(', ')} BY \`entity.id\``,
    ...buildResolvedEntityAggregationSteps(args, ANOMALY_RESOLVED_ENTITY_AGGREGATIONS),
  ].join('\n');

const anomalyCountEnricher: PageEnricher = {
  fields: [ANOMALY_COUNT_FIELD],
  fetch: async (pageRows, args, { runQuery }) => {
    const entityIds = getEntityIds(pageRows);
    if (!entityIds.length) return new Map();

    // The anomalies of the aliases of a resolved row count for it.
    const rows = await runQuery(
      buildAnomalyCountEnrichQuery(args, await withEntityAliases(pageRows, args, runQuery))
    );

    const byId = new Map(rows.map((r) => [getEntityId(r), getNumber(r, ANOMALY_COUNT_FIELD)]));
    // No anomalies reads as null, as in the sort queries.
    return new Map(entityIds.map((id) => [id, { [ANOMALY_COUNT_FIELD]: byId.get(id) ?? null }]));
  },
};

// ── query spec ────────────────────────────────────────────────────────────────

export const anomalyCountQuerySpec = {
  fetchSortPage: (args, ctx) => fetchSplitSortPage(anomalySplitSortPlan, args, ctx),
  enricher: anomalyCountEnricher,
} satisfies ColumnQuerySpec;
