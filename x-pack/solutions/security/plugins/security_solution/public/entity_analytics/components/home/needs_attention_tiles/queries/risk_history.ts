/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Width of the window before a moment that is searched for an entity's last risk score. */
export const BOUNDARY_WINDOW_HOURS = 2;

const ENTITY_EUID = 'COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)';

/**
 * Returns the lines of a sub-query that gives each entity's last risk score in the risk score
 * history at one moment: the last score in the two hours before `at`. Scoring runs hourly, so that
 * window always holds at least one run, and LAST() takes the actual snapshot, not the highest
 * score seen. The result has one row per `entity.id` with the score in `outputColumn`.
 */
export const buildRiskScoreHistoryBranch = (
  riskScoreIndex: string,
  at: string,
  outputColumn: string
): string[] => [
  `  FROM ${riskScoreIndex}`,
  `  | WHERE @timestamp >= ${at} - ${BOUNDARY_WINDOW_HOURS} hours AND @timestamp <= ${at}`,
  `  | EVAL entity_euid = ${ENTITY_EUID}`,
  `  | EVAL risk_score = COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`,
  `  | WHERE entity_euid IS NOT NULL`,
  `  | STATS ${outputColumn} = LAST(risk_score, @timestamp) BY entity_euid`,
  `  | RENAME entity_euid AS \`entity.id\``,
];

/**
 * Returns the lines of a sub-query that gives each entity's last risk level (1 Low to 4 Critical)
 * in the risk score history at one moment, like {@link buildRiskScoreHistoryBranch}.
 */
export const buildRiskLevelHistoryBranch = (
  riskScoreIndex: string,
  at: string,
  outputColumn: string
): string[] => [
  `  FROM ${riskScoreIndex}`,
  `  | WHERE @timestamp >= ${at} - ${BOUNDARY_WINDOW_HOURS} hours AND @timestamp <= ${at}`,
  `  | EVAL entity_euid = ${ENTITY_EUID}`,
  `  | EVAL risk_level = COALESCE(host.risk.calculated_level, user.risk.calculated_level, service.risk.calculated_level)`,
  `  | WHERE entity_euid IS NOT NULL`,
  // Nested single-condition CASEs: ES|QL evaluates a multi-condition CASE one row at a time.
  `  | EVAL level_low = CASE(risk_level == "Low", 1, 0),`,
  `         level_moderate = CASE(risk_level == "Moderate", 2, level_low),`,
  `         level_high = CASE(risk_level == "High", 3, level_moderate),`,
  `         level_num = CASE(risk_level == "Critical", 4, level_high)`,
  `  | STATS ${outputColumn} = LAST(level_num, @timestamp) BY entity_euid`,
  `  | RENAME entity_euid AS \`entity.id\``,
];
