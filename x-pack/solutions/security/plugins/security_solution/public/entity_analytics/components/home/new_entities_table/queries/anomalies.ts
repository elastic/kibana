/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildIdentityPrefilter,
  entityIdsOf,
  getEntityId,
  getNumber,
  ANOMALY_COUNT_FIELD,
  ML_ANOMALY_INDICES,
  ANOMALY_RECORD_FILTER,
  buildAnomalyJobFilter,
  buildEuidStages,
  buildEntitiesInViewConditions,
  buildEntitiesInViewCountQuery,
  buildKeepClause,
  buildLookupJoinClause,
  buildMergedForeignSortQuery,
  lookbackCutoff,
  nullOnFailure,
  toList,
} from '../common';
import type { QueryArgs, PageEnricher, Row, ColumnQuerySpec } from '../common';
import {
  MAX_VALUE_ROWS,
  buildValueCursorClause,
  buildValueSortSuffix,
  runEmptyRowsExcludingValueIds,
  runSplitSortPage,
} from './split_sort';
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
  `| WHERE ${ANOMALY_RECORD_FILTER} AND \`@timestamp\` >= "${lookbackCutoff(
    timeRange
  )}" AND ${buildAnomalyJobFilter(anomalyJobIds)}`,
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
const buildAnomalousEntitiesInView = (args: QueryArgs, stats: string): string[] => [
  SET_UNMAPPED_NULLIFY,
  ...buildAnomalyEntityRows(args),
  stats,
  buildLookupJoinClause(args.concreteEntityIndexName),
  ...buildEntitiesInViewConditions(args).map((condition) => `| WHERE ${condition}`),
];

export const anomalySplitSortPlan: SplitSortPlan = {
  sortField: ANOMALY_COUNT_FIELD,
  emptyValue: null,
  buildValueRowsQuery: (args, limit) =>
    [
      ...buildAnomalousEntitiesInView(
        args,
        `| STATS ${ANOMALY_COUNT_FIELD} = COUNT(*) BY \`entity.id\``
      ),
      ...buildValueCursorClause(args.cursor),
      ...buildValueSortSuffix(args, ANOMALY_COUNT_FIELD, limit),
      buildKeepClause(args, ANOMALY_COUNT_FIELD),
    ].join('\n'),
  runEmptyRows: (args, runQuery, afterId, limit) =>
    runEmptyRowsExcludingValueIds(
      args,
      runQuery,
      [
        ...buildAnomalousEntitiesInView(args, '| STATS BY `entity.id`'),
        '| KEEP `entity.id`',
        `| LIMIT ${MAX_VALUE_ROWS + 1}`,
      ].join('\n'),
      { emptyColumns: `${ANOMALY_COUNT_FIELD} = TO_LONG(null)`, columns: [ANOMALY_COUNT_FIELD] },
      afterId,
      limit
    ),
  buildSortQuery: buildAnomalyCountSortQuery,
};

// ── enrichment ────────────────────────────────────────────────────────────────

const buildAnomalyCountEnrichQuery = (args: QueryArgs, pageRows: readonly Row[]): string =>
  [
    SET_UNMAPPED_NULLIFY,
    ...buildAnomalyEntityRows(args, buildIdentityPrefilter(pageRows)),
    `| WHERE \`entity.id\` IN (${toList(entityIdsOf(pageRows))})`,
    `| STATS ${ANOMALY_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
  ].join('\n');

const anomalyCountEnricher: PageEnricher = {
  fields: [ANOMALY_COUNT_FIELD],
  read: async (pageRows, args, { runQuery }) => {
    const entityIds = entityIdsOf(pageRows);
    if (!entityIds.length) return new Map();

    const rows = await nullOnFailure(runQuery(buildAnomalyCountEnrichQuery(args, pageRows)));
    if (!rows) return null;

    const byId = new Map(rows.map((r) => [getEntityId(r), getNumber(r, ANOMALY_COUNT_FIELD)]));
    return new Map(entityIds.map((id) => [id, { [ANOMALY_COUNT_FIELD]: byId.get(id) ?? 0 }]));
  },
};

// ── query spec ────────────────────────────────────────────────────────────────

export const anomalyCountQuerySpec = {
  sort: {
    buildSortQuery: buildAnomalyCountSortQuery,
    buildCountQuery: buildEntitiesInViewCountQuery,
    runSortPage: (args, ctx) => runSplitSortPage(anomalySplitSortPlan, args, ctx),
  },
  enricher: anomalyCountEnricher,
} satisfies ColumnQuerySpec;
