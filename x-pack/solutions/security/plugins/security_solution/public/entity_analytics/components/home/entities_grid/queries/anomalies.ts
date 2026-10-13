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
  buildResolvedEntitySteps,
  ENTITY_TYPE_FILTER,
  getEntityAlias,
  toList,
} from './esql';
import {
  getEntityIds,
  getEntityId,
  getNumber,
  ANOMALY_COUNT_FIELD,
  RESOLVED_TO_FIELD,
} from '../common';
import { buildEuidStages } from './euid_pipeline';
import { buildMergedForeignSortQuery } from './foreign_sort';
import type { QueryArgs, Row } from '../common';
import { buildResolvedEntityRowsOutput, withResolvedEntityRows } from './resolved_entity_sort';
import {
  RESOLVED_ENTITY_KEY_FIELD,
  buildResolvedEntityAggregationSteps,
  resolvedEntityEnricher,
} from './resolved_entity_aliases';
import { buildEntityListSortPlan, fetchSplitSortPage } from './split_sort';
import type { SplitSortPlan } from './split_sort';
import type { ColumnQuerySpec, PageEnricher, SortPageFetcher } from './types';

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

/** A resolved entity's anomalies are those of its aliases. */
const RESOLVED_ANOMALY_AGGREGATIONS = { [ANOMALY_COUNT_FIELD]: 'SUM' } as const;

/**
 * Anomalies of the resolved entities with aliases that pass the filters, as the rows of the grid. The
 * counts per entity merge with the aliases, mapped to their resolved entity,
 * and the counts are aggregated per resolved entity.
 */
const buildResolvedEntityAnomalyRowsQuery = (args: QueryArgs): string =>
  [
    SET_UNMAPPED_NULLIFY,
    'FROM (',
    ...buildAnomalyEntityRows(args),
    `| STATS ${ANOMALY_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
    '), (',
    `FROM ${getEntityAlias(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
    `| EVAL member = MV_APPEND(\`entity.id\`, ${RESOLVED_TO_FIELD}), ${RESOLVED_ENTITY_KEY_FIELD} = ${RESOLVED_TO_FIELD}`,
    '| MV_EXPAND member',
    `| KEEP member, ${RESOLVED_ENTITY_KEY_FIELD}`,
    '| RENAME member AS `entity.id`',
    ')',
    `| STATS ${ANOMALY_COUNT_FIELD} = MAX(${ANOMALY_COUNT_FIELD}), ${RESOLVED_ENTITY_KEY_FIELD} = MAX(${RESOLVED_ENTITY_KEY_FIELD}) BY \`entity.id\``,
    ...buildResolvedEntityAggregationSteps(RESOLVED_ANOMALY_AGGREGATIONS),
    ...buildResolvedEntitySteps(args.concreteEntityIndexName),
    ...buildResolvedEntityRowsOutput(args, [ANOMALY_COUNT_FIELD]),
  ].join('\n');

// ── split sort (see split_sort.ts) ───────────────────────────────────────────

const anomalySplitSortPlan: SplitSortPlan = buildEntityListSortPlan({
  sortField: ANOMALY_COUNT_FIELD,
  emptyValue: null,
  buildForeignRows: (args) => [SET_UNMAPPED_NULLIFY, ...buildAnomalyEntityRows(args)],
  buildSortQuery: buildAnomalyCountSortQuery,
  aggregations: [`${ANOMALY_COUNT_FIELD} = COUNT(*)`],
  columns: [ANOMALY_COUNT_FIELD],
  emptyColumns: `${ANOMALY_COUNT_FIELD} = TO_LONG(null)`,
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
  fetch: async (pageRows, args, { runQuery }) => {
    const entityIds = getEntityIds(pageRows);
    if (!entityIds.length) return new Map();

    const rows = await runQuery(buildAnomalyCountEnrichQuery(args, pageRows));

    const byId = new Map(rows.map((r) => [getEntityId(r), getNumber(r, ANOMALY_COUNT_FIELD)]));
    // No anomalies reads as null, as in the sort queries.
    return new Map(entityIds.map((id) => [id, { [ANOMALY_COUNT_FIELD]: byId.get(id) ?? null }]));
  },
};

// ── query spec ────────────────────────────────────────────────────────────────

/**
 * The page of the plan; for resolved rows, the resolved entities with aliases have the anomalies of their
 * aliases and are read apart from the other entities.
 */
const fetchAnomalyCountSortPage: SortPageFetcher = withResolvedEntityRows(
  (args, ctx) => fetchSplitSortPage(anomalySplitSortPlan, args, ctx),
  buildResolvedEntityAnomalyRowsQuery
);

export const anomalyCountQuerySpec = {
  fetchSortPage: fetchAnomalyCountSortPage,
  enricher: resolvedEntityEnricher(anomalyCountEnricher, RESOLVED_ANOMALY_AGGREGATIONS),
} satisfies ColumnQuerySpec;
