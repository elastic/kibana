/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FILTER,
  RISK_SCORE_CHANGE_FIELD,
  RISK_SCORE_NORM_FIELD,
  TIME_RANGE_DAYS,
  buildKeepClause,
  buildResolvedRowsFilter,
  buildFilterClause,
  buildLookupJoinClause,
  buildSearchIdInClause,
  entityAliasOf,
  toList,
  buildSortSuffix,
  buildCursorClause,
} from '../common';
import type {
  QueryArgs,
  RunContext,
  Row,
  TimeRange,
  RowsMode,
  ColumnDescriptor,
} from '../common';

const riskScoreIndexOf = (namespace: string) => `risk-score.risk-score-${namespace}`;

const ENTITY_ID_COALESCE = `COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`;
const ENTITY_ID_FIELD_COALESCE = `COALESCE(host.risk.id_field, user.risk.id_field, service.risk.id_field)`;
const RISK_SCORE_COALESCE = `COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`;

// ── query builders: risk_score_change sort ────────────────────────────────────

const buildRiskScoreChangeBaseQuery = (
  namespace: string,
  timeRange: TimeRange,
  concreteEntityIndexName: string,
  rowsMode: RowsMode,
  searchExpression?: string,
  entityExpression?: string
): string => {
  const days = TIME_RANGE_DAYS[timeRange];
  return [
    `FROM ${riskScoreIndexOf(namespace)}`,
    `| WHERE \`@timestamp\` <= NOW() - ${days} day`,
    `| WHERE ${ENTITY_ID_FIELD_COALESCE} == "entity.id"`,
    `| EVAL \`entity.id\` = ${ENTITY_ID_COALESCE}, score = ${RISK_SCORE_COALESCE}`,
    `| STATS reference_score = LAST(score, \`@timestamp\`) BY \`entity.id\``,
    ...buildSearchIdInClause(entityAliasOf(namespace), searchExpression),
    buildLookupJoinClause(concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RISK_SCORE_NORM_FIELD} IS NOT NULL`,
    ...buildResolvedRowsFilter(rowsMode),
    ...buildFilterClause(entityExpression),
    `| EVAL ${RISK_SCORE_CHANGE_FIELD} = ${RISK_SCORE_NORM_FIELD} - reference_score`,
    buildKeepClause(RISK_SCORE_CHANGE_FIELD),
  ].join('\n');
};

const buildRiskScoreChangeDataQuery = ({
  namespace,
  timeRange,
  sort: { direction: dir },
  cursor,
  pageSize,
  rowsMode,
  concreteEntityIndexName,
  searchExpression,
  entityExpression,
}: QueryArgs): string =>
  [
    buildRiskScoreChangeBaseQuery(
      namespace,
      timeRange,
      concreteEntityIndexName,
      rowsMode,
      searchExpression,
      entityExpression
    ),
    ...buildCursorClause(cursor),
    buildSortSuffix(RISK_SCORE_CHANGE_FIELD, dir, pageSize),
  ].join('\n');

const buildRiskScoreChangeCountQuery = ({
  namespace,
  timeRange,
  rowsMode,
  concreteEntityIndexName,
  searchExpression,
  entityExpression,
}: QueryArgs): string =>
  [
    buildRiskScoreChangeBaseQuery(
      namespace,
      timeRange,
      concreteEntityIndexName,
      rowsMode,
      searchExpression,
      entityExpression
    ),
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── enrichment ────────────────────────────────────────────────────────────────

const buildReferenceScoreEnrichQuery = (
  namespace: string,
  entityIds: string[],
  timeRange: TimeRange
): string => {
  const ids = toList(entityIds);
  const days = TIME_RANGE_DAYS[timeRange];
  return [
    `FROM ${riskScoreIndexOf(namespace)}`,
    `| WHERE \`@timestamp\` <= NOW() - ${days} day`,
    `| WHERE ${ENTITY_ID_FIELD_COALESCE} == "entity.id"`,
    `| EVAL entity_id = ${ENTITY_ID_COALESCE}, score = ${RISK_SCORE_COALESCE}`,
    `| WHERE entity_id IN (${ids})`,
    `| STATS reference_score = LAST(score, \`@timestamp\`) BY entity_id`,
  ].join('\n');
};

const enrichRiskScoreChange = async (
  pageRows: Row[],
  { namespace, timeRange }: QueryArgs,
  skip: Set<string>,
  { runQuery }: RunContext
): Promise<void> => {
  if (skip.has(RISK_SCORE_CHANGE_FIELD)) return;

  const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
  const rows = await runQuery(
    buildReferenceScoreEnrichQuery(namespace, entityIds, timeRange)
  ).catch(() => null);
  if (!rows) return;

  const byId = new Map(rows.map((r) => [r.entity_id as string, r.reference_score as number]));
  for (const row of pageRows) {
    const currentScore = row[RISK_SCORE_NORM_FIELD] as number | null;
    const referenceScore = byId.get(row[ENTITY_ID_FIELD] as string) ?? null;
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
  isExpandable: false,
  buildSortQuery: buildRiskScoreChangeDataQuery,
  buildCountQuery: buildRiskScoreChangeCountQuery,
  enrichPage: enrichRiskScoreChange,
} as const satisfies ColumnDescriptor;
