/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityId, getEntityIds, getNumber, getString, RISK_SCORE_NORM_FIELD } from '../common';
import type { QueryArgs, Row } from '../common';
import {
  buildLookback,
  getRiskScoreIndex,
  OWN_RISK_SCORE_CONDITION,
  RISK_SCORE_TYPE,
  toList,
} from './esql';
import type { ColumnQuerySpec, EnrichedFields, RunContext } from './types';
import { isMissingIndexError } from '../../is_missing_index_error';
import {
  getBaselineDataMode,
  getBaselineVersion,
} from '../../../../baseline_prototype/baseline_prototype_state';
import { getMockTypicalScore } from '../../../../baseline_prototype/prototype_data';

/** The current score minus the typical score: positive means higher than usual. */
export const RISK_VS_TYPICAL_FIELD = 'risk_vs_typical';
/** The entity's typical score over the time range: the median of its stored scores. */
export const RISK_TYPICAL_FIELD = 'risk_typical';

// A risk score doc stores its entity under host.risk, user.risk or service.risk.
const RISK_ID_VALUE_COALESCE = `COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)`;
const RISK_ID_FIELD_COALESCE = `COALESCE(host.risk.id_field, user.risk.id_field, service.risk.id_field)`;
const RISK_SCORE_NORM_COALESCE = `COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`;

/**
 * Resolved rows use their group's typical score, else their own, as the risk score change column
 * does for its reference. The median is taken per kind of doc first, then the group's value wins.
 */
const buildResolvedMedianSteps = (): string[] => [
  `| EVAL is_group = CASE(${RISK_SCORE_TYPE} == "resolution", 1, 0)`,
  `| STATS typical = MEDIAN(score) BY entity_id, is_group`,
  `| EVAL group_part = CASE(is_group == 1, typical, null), own_part = CASE(is_group == 0, typical, null)`,
  `| STATS group_value = MAX(group_part), own_value = MAX(own_part) BY entity_id`,
  `| EVAL typical_score = COALESCE(group_value, own_value)`,
  `| KEEP entity_id, typical_score`,
];

/**
 * The median stored risk score of each given entity over the time range. It reads only the page's
 * entities, since reading the whole range for every entity was too slow (see risk_score_change).
 */
export const buildTypicalScoreQuery = (args: QueryArgs, entityIds: readonly string[]): string[] => {
  const ids = toList(entityIds);
  return [
    `FROM ${getRiskScoreIndex(args.namespace)}`,
    `| WHERE \`@timestamp\` >= ${buildLookback(args.timeRange)}`,
    // Pushable prefilter for the COALESCE filters below.
    `| WHERE host.risk.id_value IN (${ids}) OR user.risk.id_value IN (${ids}) OR service.risk.id_value IN (${ids})`,
    `| WHERE ${RISK_ID_FIELD_COALESCE} == "entity.id"`,
    `| EVAL entity_id = ${RISK_ID_VALUE_COALESCE}, score = ${RISK_SCORE_NORM_COALESCE}`,
    `| WHERE entity_id IN (${ids})`,
    ...(args.rowsMode === 'resolved'
      ? buildResolvedMedianSteps()
      : [
          `| WHERE ${OWN_RISK_SCORE_CONDITION}`,
          `| STATS typical_score = MEDIAN(score) BY entity_id`,
        ]),
  ];
};

const fetchLiveTypicalScores = async (
  entityIds: readonly string[],
  args: QueryArgs,
  { runQuery }: Pick<RunContext, 'runQuery'>
): Promise<Map<string, number>> => {
  try {
    const rows = await runQuery(buildTypicalScoreQuery(args, entityIds));
    return new Map(
      rows.flatMap((row) => {
        const id = getString(row, 'entity_id');
        const typical = getNumber(row, 'typical_score');
        return id != null && typical != null ? [[id, typical] as const] : [];
      })
    );
  } catch (error) {
    // No risk score index yet means no history: every row reads as having no typical.
    if (isMissingIndexError(error)) return new Map();
    throw error;
  }
};

const getMockTypicalScores = (rows: readonly Row[]): Map<string, number> =>
  new Map(
    rows.flatMap((row) => {
      const id = getEntityId(row);
      const current = getNumber(row, RISK_SCORE_NORM_FIELD);
      return id != null && current != null ? [[id, getMockTypicalScore(id, current)] as const] : [];
    })
  );

const fetchRiskVsTypical = async (
  rows: readonly Row[],
  args: QueryArgs,
  ctx: RunContext
): Promise<EnrichedFields> => {
  const entityIds = getEntityIds(rows);
  if (!entityIds.length) return new Map();

  // Mock data applies only while the prototype is on, so Off always reads the real history.
  const isMock = getBaselineVersion() !== 'off' && getBaselineDataMode() === 'mock';
  const typicalById = isMock
    ? getMockTypicalScores(rows)
    : await fetchLiveTypicalScores(entityIds, args, ctx);

  return new Map(
    rows.flatMap((row) => {
      const id = getEntityId(row);
      if (id == null) return [];
      const current = getNumber(row, RISK_SCORE_NORM_FIELD);
      const typical = typicalById.get(id) ?? null;
      const change = current != null && typical != null ? current - typical : null;
      return [[id, { [RISK_VS_TYPICAL_FIELD]: change, [RISK_TYPICAL_FIELD]: typical }]];
    })
  );
};

/**
 * Filled for the rows on screen only, and not sortable: sorting would read every entity's whole
 * range. An entity with no stored scores in the range shows no value.
 */
export const riskVsTypicalQuerySpec: ColumnQuerySpec = {
  enricher: { fields: [RISK_VS_TYPICAL_FIELD, RISK_TYPICAL_FIELD], fetch: fetchRiskVsTypical },
};
