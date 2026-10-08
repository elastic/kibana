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
  buildLookupJoinClause,
  buildLookback,
  toList,
} from './esql';
import { getEntityIds, getEntityId, getNumber, ANOMALY_COUNT_FIELD } from '../common';
import { buildEuidStages } from './euid_pipeline';
import { buildEntitiesInViewConditions, buildEntitiesInViewCountQuery } from './entities_in_view';
import { buildMergedForeignSortQuery } from './foreign_sort';
import type { QueryArgs, PageEnricher, Row, ColumnQuerySpec } from '../common';
import { buildEntityListSortPlan, fetchSplitSortPage } from './split_sort';
import type { SplitSortPlan } from './split_sort';

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

/** Entities without anomalies have no count and sort last. */
const buildAnomalyCountSortQuery = (args: QueryArgs): string =>
  buildMergedForeignSortQuery(args, {
    settings: [SET_UNMAPPED_NULLIFY],
    foreignRows: [
      ...buildAnomalyEntityRows(args),
      `| STATS ${ANOMALY_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
    ],
    mergeAggregations: [`${ANOMALY_COUNT_FIELD} = MAX(${ANOMALY_COUNT_FIELD})`],
    sortField: ANOMALY_COUNT_FIELD,
  });

// ── split sort (see split_sort.ts) ───────────────────────────────────────────

/** Entities in view with anomalies, with their entity docs. */
const buildAnomalousEntitiesInView = (args: QueryArgs, groupBy: string): string[] => [
  SET_UNMAPPED_NULLIFY,
  ...buildAnomalyEntityRows(args),
  groupBy,
  buildLookupJoinClause(args.concreteEntityIndexName),
  ...buildEntitiesInViewConditions(args).map((condition) => `| WHERE ${condition}`),
];

export const anomalySplitSortPlan: SplitSortPlan = buildEntityListSortPlan({
  sortField: ANOMALY_COUNT_FIELD,
  emptyValue: null,
  buildEntitiesWithValues: buildAnomalousEntitiesInView,
  aggregations: [`${ANOMALY_COUNT_FIELD} = COUNT(*)`],
  columns: [ANOMALY_COUNT_FIELD],
  emptyColumns: `${ANOMALY_COUNT_FIELD} = TO_LONG(null)`,
  buildSortQuery: buildAnomalyCountSortQuery,
});

// ── enrichment ────────────────────────────────────────────────────────────────

const buildAnomalyCountEnrichQuery = (args: QueryArgs, pageRows: readonly Row[]): string =>
  [
    SET_UNMAPPED_NULLIFY,
    ...buildAnomalyEntityRows(args, buildIdentityPrefilter(pageRows)),
    `| WHERE \`entity.id\` IN (${toList(getEntityIds(pageRows))})`,
    `| STATS ${ANOMALY_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
  ].join('\n');

const anomalyCountEnricher: PageEnricher = {
  fields: [ANOMALY_COUNT_FIELD],
  read: async (pageRows, args, { runQuery }) => {
    const entityIds = getEntityIds(pageRows);
    if (!entityIds.length) return new Map();

    const rows = await runQuery(buildAnomalyCountEnrichQuery(args, pageRows));

    const byId = new Map(rows.map((r) => [getEntityId(r), getNumber(r, ANOMALY_COUNT_FIELD)]));
    return new Map(entityIds.map((id) => [id, { [ANOMALY_COUNT_FIELD]: byId.get(id) ?? 0 }]));
  },
};

// ── query spec ────────────────────────────────────────────────────────────────

export const anomalyCountQuerySpec = {
  sort: {
    buildSortQuery: buildAnomalyCountSortQuery,
    buildCountQuery: buildEntitiesInViewCountQuery,
    fetchSortPage: (args, ctx) => fetchSplitSortPage(anomalySplitSortPlan, args, ctx),
  },
  enricher: anomalyCountEnricher,
} satisfies ColumnQuerySpec;
