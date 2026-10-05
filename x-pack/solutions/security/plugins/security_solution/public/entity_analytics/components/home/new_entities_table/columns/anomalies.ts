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
  buildEuidStages,
  buildEntitiesInViewCountQuery,
  buildMergedForeignSortQuery,
  lookbackCutoff,
  nullOnFailure,
  toList,
} from '../common';
import type { QueryArgs, RunContext, Row, ColumnDescriptor } from '../common';

/** ML anomaly indices have different mappings; unmapped fields read as null, not as errors. */
const SET_UNMAPPED_NULLIFY = 'SET unmapped_fields="nullify";';
const ANOMALY_BASE_FILTER = `result_type == "record" AND is_interim == false`;

/**
 * Final anomaly records in the time range, one row per record with its derived `entity.id`.
 * `identityPrefilter` narrows the records before the EUID evaluation, which can't push down.
 */
const buildAnomalyEntityRows = ({ timeRange }: QueryArgs, identityPrefilter?: string): string[] => [
  `FROM ${ML_ANOMALY_INDICES}`,
  `| WHERE ${ANOMALY_BASE_FILTER} AND \`@timestamp\` >= "${lookbackCutoff(timeRange)}"`,
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

// ── enrichment ────────────────────────────────────────────────────────────────

const buildAnomalyCountEnrichQuery = (args: QueryArgs, pageRows: Row[]): string =>
  [
    SET_UNMAPPED_NULLIFY,
    ...buildAnomalyEntityRows(args, buildIdentityPrefilter(pageRows)),
    `| WHERE \`entity.id\` IN (${toList(entityIdsOf(pageRows))})`,
    `| STATS ${ANOMALY_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
  ].join('\n');

const enrichAnomalyCount = async (
  pageRows: Row[],
  args: QueryArgs,
  skip: Set<string>,
  { runQuery }: RunContext
): Promise<void> => {
  if (skip.has(ANOMALY_COUNT_FIELD)) return;

  if (!entityIdsOf(pageRows).length) return;

  const rows = await nullOnFailure(runQuery(buildAnomalyCountEnrichQuery(args, pageRows)));
  if (!rows) return;

  const byId = new Map(rows.map((r) => [getEntityId(r), getNumber(r, ANOMALY_COUNT_FIELD)]));
  for (const row of pageRows) {
    row[ANOMALY_COUNT_FIELD] = byId.get(getEntityId(row)) ?? 0;
  }
};

// ── column descriptor ─────────────────────────────────────────────────────────

export const anomalyCountColumn = {
  id: ANOMALY_COUNT_FIELD,
  displayAsText: 'Anomalies',
  initialWidth: 120,
  isSortable: true,
  sortKind: 'foreign',
  isExpandable: false,
  buildSortQuery: buildAnomalyCountSortQuery,
  buildCountQuery: buildEntitiesInViewCountQuery,
  enrichPage: enrichAnomalyCount,
} as const satisfies ColumnDescriptor;
