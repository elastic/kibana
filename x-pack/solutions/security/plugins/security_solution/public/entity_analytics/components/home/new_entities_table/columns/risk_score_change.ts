/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  entityIdsOf,
  getEntityId,
  getNumber,
  getString,
  RISK_SCORE_CHANGE_FIELD,
  RISK_SCORE_NORM_FIELD,
  TIME_RANGE_DAYS,
  buildEntitiesInViewCountQuery,
  buildMergedForeignSortQuery,
  nullOnFailure,
  riskScoreIndexOf,
  toList,
} from '../common';
import type { QueryArgs, RunContext, Row, ColumnDescriptor } from '../common';

/** Width of the reference window before the time range, as in the risk movers tile. */
const REFERENCE_WINDOW_HOURS = 2;

// A risk score doc stores its entity under host.risk, user.risk or service.risk.
const RISK_ID_VALUE_COALESCE = `COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`;
const RISK_ID_FIELD_COALESCE = `COALESCE(host.risk.id_field, user.risk.id_field, service.risk.id_field)`;
const RISK_SCORE_NORM_COALESCE = `COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`;

/**
 * Risk score docs that can be the reference: scored in the two hours before the start of
 * the time range, and keyed by EUID. The reference score is the last of these per entity.
 * Risk score change is the current entity score minus the reference score.
 *
 * This is the boundary window of the risk movers tile, so its rows agree with the tile.
 * The two hours cover at least one hourly scoring run; the lower bound keeps the query
 * from reading all older history.
 */
const buildReferenceScoreDocs = ({ namespace, timeRange }: QueryArgs): string[] => {
  const windowStart = `NOW() - ${TIME_RANGE_DAYS[timeRange]} day`;
  return [
    `FROM ${riskScoreIndexOf(namespace)}`,
    `| WHERE \`@timestamp\` >= ${windowStart} - ${REFERENCE_WINDOW_HOURS} hours AND \`@timestamp\` <= ${windowStart}`,
  ];
};

// ── sort queries ──────────────────────────────────────────────────────────────

/** Entities without a reference or a current score have no change and sort last. */
const buildRiskScoreChangeSortQuery = (args: QueryArgs): string =>
  buildMergedForeignSortQuery(args, {
    foreignRows: [
      ...buildReferenceScoreDocs(args),
      `| WHERE ${RISK_ID_FIELD_COALESCE} == "entity.id"`,
      `| EVAL \`entity.id\` = ${RISK_ID_VALUE_COALESCE}, score = ${RISK_SCORE_NORM_COALESCE}`,
      `| STATS reference_score = LAST(score, \`@timestamp\`) BY \`entity.id\``,
    ],
    entityFields: [RISK_SCORE_NORM_FIELD],
    mergeAggregations: [
      'reference_score = MAX(reference_score)',
      `current_score = MAX(${RISK_SCORE_NORM_FIELD})`,
    ],
    afterMerge: [`| EVAL ${RISK_SCORE_CHANGE_FIELD} = current_score - reference_score`],
    sortField: RISK_SCORE_CHANGE_FIELD,
  });

// ── enrichment ────────────────────────────────────────────────────────────────

const buildRiskScoreChangeEnrichQuery = (args: QueryArgs, entityIds: string[]): string => {
  const ids = toList(entityIds);
  return [
    ...buildReferenceScoreDocs(args),
    // Pushable prefilter for the COALESCE filters below.
    `| WHERE host.risk.id_value IN (${ids}) OR user.risk.id_value IN (${ids}) OR service.risk.id_value IN (${ids})`,
    `| WHERE ${RISK_ID_FIELD_COALESCE} == "entity.id"`,
    `| EVAL entity_id = ${RISK_ID_VALUE_COALESCE}, score = ${RISK_SCORE_NORM_COALESCE}`,
    `| WHERE entity_id IN (${ids})`,
    `| STATS reference_score = LAST(score, \`@timestamp\`) BY entity_id`,
  ].join('\n');
};

const enrichRiskScoreChange = async (
  pageRows: Row[],
  args: QueryArgs,
  skip: Set<string>,
  { runQuery }: RunContext
): Promise<void> => {
  if (skip.has(RISK_SCORE_CHANGE_FIELD)) return;

  const entityIds = entityIdsOf(pageRows);
  if (!entityIds.length) return;

  const rows = await nullOnFailure(runQuery(buildRiskScoreChangeEnrichQuery(args, entityIds)));
  if (!rows) return;

  const byId = new Map(
    rows.map((r) => [getString(r, 'entity_id'), getNumber(r, 'reference_score')])
  );
  for (const row of pageRows) {
    const currentScore = getNumber(row, RISK_SCORE_NORM_FIELD) ?? null;
    const referenceScore = byId.get(getEntityId(row)) ?? null;
    row[RISK_SCORE_CHANGE_FIELD] =
      currentScore != null && referenceScore != null ? currentScore - referenceScore : null;
  }
};

// ── column descriptor ─────────────────────────────────────────────────────────

export const riskScoreChangeColumn = {
  id: RISK_SCORE_CHANGE_FIELD,
  displayAsText: 'Risk score change',
  initialWidth: 140,
  isSortable: true,
  sortKind: 'foreign',
  isExpandable: false,
  buildSortQuery: buildRiskScoreChangeSortQuery,
  buildCountQuery: buildEntitiesInViewCountQuery,
  enrichPage: enrichRiskScoreChange,
} as const satisfies ColumnDescriptor;
