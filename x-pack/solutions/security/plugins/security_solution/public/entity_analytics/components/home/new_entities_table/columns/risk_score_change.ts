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
  ENTITY_TYPE_FILTER,
  RISK_SCORE_CHANGE_FIELD,
  RISK_SCORE_NORM_FIELD,
  TIME_RANGE_DAYS,
  buildForeignSortFilterSteps,
  buildKeepClause,
  nullOnFailure,
  riskScoreIndexOf,
  toList,
  buildSortSuffix,
  buildCursorClause,
} from '../common';
import type { QueryArgs, RunContext, Row, ColumnDescriptor } from '../common';

// A risk score doc stores its entity under host.risk, user.risk or service.risk.
const RISK_ID_VALUE_COALESCE = `COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`;
const RISK_ID_FIELD_COALESCE = `COALESCE(host.risk.id_field, user.risk.id_field, service.risk.id_field)`;
const RISK_SCORE_NORM_COALESCE = `COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`;

/**
 * Risk score docs that can be the reference: scored at or before the start of the time
 * range, and keyed by EUID. The reference score is the last of these per entity.
 * Risk score change is the current entity score minus the reference score.
 */
const buildReferenceScoreDocs = ({ namespace, timeRange }: QueryArgs): string[] => [
  `FROM ${riskScoreIndexOf(namespace)}`,
  `| WHERE \`@timestamp\` <= NOW() - ${TIME_RANGE_DAYS[timeRange]} day`,
];

// ── sort queries ──────────────────────────────────────────────────────────────

const buildRiskScoreChangeBaseQuery = (args: QueryArgs): string =>
  [
    ...buildReferenceScoreDocs(args),
    `| WHERE ${RISK_ID_FIELD_COALESCE} == "entity.id"`,
    `| EVAL \`entity.id\` = ${RISK_ID_VALUE_COALESCE}, score = ${RISK_SCORE_NORM_COALESCE}`,
    `| STATS reference_score = LAST(score, \`@timestamp\`) BY \`entity.id\``,
    ...buildForeignSortFilterSteps(
      args,
      `${ENTITY_TYPE_FILTER} AND ${RISK_SCORE_NORM_FIELD} IS NOT NULL`
    ),
    `| EVAL ${RISK_SCORE_CHANGE_FIELD} = ${RISK_SCORE_NORM_FIELD} - reference_score`,
    buildKeepClause(args, RISK_SCORE_CHANGE_FIELD),
  ].join('\n');

const buildRiskScoreChangeSortQuery = (args: QueryArgs): string =>
  [
    buildRiskScoreChangeBaseQuery(args),
    ...buildCursorClause(args.cursor),
    buildSortSuffix(RISK_SCORE_CHANGE_FIELD, args.sort.direction, args.pageSize),
  ].join('\n');

const buildRiskScoreChangeCountQuery = (args: QueryArgs): string =>
  [buildRiskScoreChangeBaseQuery(args), `| STATS total = COUNT(*)`].join('\n');

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
  buildCountQuery: buildRiskScoreChangeCountQuery,
  enrichPage: enrichRiskScoreChange,
} as const satisfies ColumnDescriptor;
