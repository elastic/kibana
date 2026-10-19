/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityIds, getEntityId, getNumber, getString, RISK_SCORE_NORM_FIELD } from '../common';
import type { QueryArgs, Row } from '../common';
import { IN_VIEW_AGGREGATION, IN_VIEW_FIELD, buildEntitiesInViewBranch } from './entities_in_view';
import {
  buildEntityAggregations,
  buildJoinedPageSteps,
  buildLookback,
  buildLookupJoinClause,
  buildRowFieldsSteps,
  buildSortSuffix,
  buildStatsByEntityClause,
  getRiskScoreIndex,
  OWN_RISK_SCORE_CONDITION,
  RISK_SCORE_TYPE,
  toList,
} from './esql';
import type { EnrichedFields, SortPageContext } from './types';
import { getComputedColumnQuerySpec } from './computed_column';
import type { ComputedColumn } from './computed_column';

const RISK_SCORE_CHANGE_FIELD = 'risk_score_change';

/** Width of the reference window before the time range, as in the risk movers tile. */
const REFERENCE_WINDOW_HOURS = 2;

// A risk score doc stores its entity under host.risk, user.risk or service.risk.
const RISK_ID_VALUE_COALESCE = `COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`;
const RISK_ID_FIELD_COALESCE = `COALESCE(host.risk.id_field, user.risk.id_field, service.risk.id_field)`;
const RISK_SCORE_NORM_COALESCE = `COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`;

/** The last score in the 2h before the range, as the risk movers tile; reading the whole range took ~46s. */
const buildReferenceScoreDocs = ({ namespace, timeRange, rowsMode }: QueryArgs): string[] => {
  const windowStart = buildLookback(timeRange);
  return [
    `FROM ${getRiskScoreIndex(namespace)}`,
    `| WHERE \`@timestamp\` >= ${windowStart} - ${REFERENCE_WINDOW_HOURS} hours AND \`@timestamp\` <= ${windowStart}`,
    ...(rowsMode === 'resolved' ? [] : [`| WHERE ${OWN_RISK_SCORE_CONDITION}`]),
  ];
};

/** Resolved rows compare to their group's last score, else their own; others skip the group docs beside theirs. */
const buildReferenceScoreStats = ({ rowsMode }: QueryArgs, key: string): string[] =>
  rowsMode === 'resolved'
    ? [
        `| STATS group_reference = LAST(score, \`@timestamp\`) WHERE ${RISK_SCORE_TYPE} == "resolution", own_reference = LAST(score, \`@timestamp\`) WHERE ${OWN_RISK_SCORE_CONDITION} BY ${key}`,
        '| EVAL reference_score = COALESCE(group_reference, own_reference)',
        `| KEEP ${key}, reference_score`,
      ]
    : [`| STATS reference_score = LAST(score, \`@timestamp\`) BY ${key}`];

const buildReferenceScoreRows = (args: QueryArgs): string[] => [
  ...buildReferenceScoreDocs(args),
  `| WHERE ${RISK_ID_FIELD_COALESCE} == "entity.id"`,
  `| EVAL \`entity.id\` = ${RISK_ID_VALUE_COALESCE}, score = ${RISK_SCORE_NORM_COALESCE}`,
  ...buildReferenceScoreStats(args, '`entity.id`'),
];

/** Reference and current scores merged by entity.id; the change is null without either. */
const buildRiskScoreChangeSteps = (
  args: QueryArgs,
  entityConditions: readonly string[] = []
): string[] => [
  'FROM (',
  ...buildReferenceScoreRows(args),
  '), (',
  ...buildEntitiesInViewBranch(args, [RISK_SCORE_NORM_FIELD], entityConditions),
  ')',
  buildStatsByEntityClause([
    'reference_score = MAX(reference_score)',
    `current_score = MAX(${RISK_SCORE_NORM_FIELD})`,
    ...buildEntityAggregations([IN_VIEW_AGGREGATION]),
  ]),
  `| WHERE ${IN_VIEW_FIELD} == 1`,
  `| EVAL ${RISK_SCORE_CHANGE_FIELD} = current_score - reference_score`,
];

/** The scored entities in view with a change, by it; only these rows join their docs. */
const buildRiskScoreChangeSortWithValueQuery = (args: QueryArgs, limit: number): string[] => [
  ...buildRiskScoreChangeSteps(args, [`${RISK_SCORE_NORM_FIELD} IS NOT NULL`]),
  `| WHERE ${RISK_SCORE_CHANGE_FIELD} IS NOT NULL`,
  ...buildSortSuffix(RISK_SCORE_CHANGE_FIELD, args.sort.direction, limit),
  buildLookupJoinClause(args.concreteEntityIndexName),
  ...buildRowFieldsSteps(args, RISK_SCORE_CHANGE_FIELD),
  // LOOKUP JOIN may not keep the input order.
  ...buildSortSuffix(RISK_SCORE_CHANGE_FIELD, args.sort.direction, limit),
];

const buildRiskScoreChangeSortAllQuery = (args: QueryArgs): string[] => [
  ...buildRiskScoreChangeSteps(args),
  ...buildJoinedPageSteps(args, RISK_SCORE_CHANGE_FIELD),
];

const buildRiskScoreChangeEnrichQuery = (args: QueryArgs, entityIds: string[]): string[] => {
  const ids = toList(entityIds);
  return [
    ...buildReferenceScoreDocs(args),
    // Pushable prefilter for the COALESCE filters below.
    `| WHERE host.risk.id_value IN (${ids}) OR user.risk.id_value IN (${ids}) OR service.risk.id_value IN (${ids})`,
    `| WHERE ${RISK_ID_FIELD_COALESCE} == "entity.id"`,
    `| EVAL entity_id = ${RISK_ID_VALUE_COALESCE}, score = ${RISK_SCORE_NORM_COALESCE}`,
    `| WHERE entity_id IN (${ids})`,
    ...buildReferenceScoreStats(args, 'entity_id'),
  ];
};

const fetchRiskScoreChanges = async (
  pageRows: readonly Row[],
  args: QueryArgs,
  { runQuery }: SortPageContext
): Promise<EnrichedFields> => {
  const entityIds = getEntityIds(pageRows);
  if (!entityIds.length) return new Map();

  const rows = await runQuery(buildRiskScoreChangeEnrichQuery(args, entityIds));

  const byId = new Map(
    rows.map((r) => [getString(r, 'entity_id'), getNumber(r, 'reference_score')])
  );
  return new Map(
    pageRows.flatMap((row) => {
      const id = getEntityId(row);
      if (id == null) return [];
      const currentScore = getNumber(row, RISK_SCORE_NORM_FIELD) ?? null;
      const referenceScore = byId.get(id) ?? null;
      const change =
        currentScore != null && referenceScore != null ? currentScore - referenceScore : null;
      return [[id, { [RISK_SCORE_CHANGE_FIELD]: change }]];
    })
  );
};

/** Joining every scored entity before sorting took ~7s at 10M, so merge side by side and join only the page. */
const riskScoreChangeColumn: ComputedColumn = {
  emptyValues: { [RISK_SCORE_CHANGE_FIELD]: null },
  buildSortAllQuery: buildRiskScoreChangeSortAllQuery,
  buildSortWithValueQuery: buildRiskScoreChangeSortWithValueQuery,
  fetchValues: fetchRiskScoreChanges,
};

export const riskScoreChangeQuerySpec = getComputedColumnQuerySpec(riskScoreChangeColumn);
