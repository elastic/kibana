/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Width of the window before a moment that is searched for an entity's last risk score. */
export const BOUNDARY_WINDOW_HOURS = 2;

/**
 * The score rise, in points, that makes an entity a Risk movers entity: the count, its previous
 * period, its sparkline and the tile's wording all read it from here.
 */
export const RISK_MOVER_MIN_SCORE_CHANGE = 10;

const ENTITY_EUID = 'COALESCE(host.risk.id_value, user.risk.id_value, service.risk.id_value)';

const entityEuidEval = (indent: string): string => `${indent}| EVAL entity_euid = ${ENTITY_EUID}`;
const dropWithoutEntity = (indent: string): string => `${indent}| WHERE entity_euid IS NOT NULL`;
const riskScoreEval = (indent: string): string =>
  `${indent}| EVAL risk_score = COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`;
const riskLevelEval = (indent: string): string =>
  `${indent}| EVAL risk_level = COALESCE(host.risk.calculated_level, user.risk.calculated_level, service.risk.calculated_level)`;
/**
 * Marks each risk score doc as a group (resolution) score. Every entity has its own base docs, and
 * the golden entity of a group has resolution docs as well, under the same `id_value`. Docs without
 * `score_type` (written before it existed) are base docs.
 */
export const groupMarkerEval = (indent: string): string =>
  `${indent}| EVAL is_group = CASE(COALESCE(host.risk.score_type, user.risk.score_type, service.risk.score_type) == "resolution", 1, 0)`;

/**
 * Returns the stages that turn the docs of one moment into one value per entity (`key`), in
 * `outputColumn`: the last value of the group (resolution) docs if the entity has any, else the
 * last value of its own (base) docs. The last value of each type is taken first, with the type
 * as a grouping key, because LAST() does not skip nulls: a LAST over a column that is null for the
 * other type returns null when that type's doc is the latest. A `LAST(...) WHERE` per type would
 * drop groups on multi-shard indices (elastic/elasticsearch#162505).
 */
export const pickGroupValueFirst = (
  indent: string,
  key: string,
  valueColumn: string,
  outputColumn: string
): string[] => [
  groupMarkerEval(indent),
  `${indent}| STATS last_value = LAST(${valueColumn}, @timestamp) BY ${key}, is_group`,
  `${indent}| EVAL group_part = CASE(is_group == 1, last_value, null), own_part = CASE(is_group == 0, last_value, null)`,
  `${indent}| STATS group_value = MAX(group_part), own_value = MAX(own_part) BY ${key}`,
  `${indent}| EVAL ${outputColumn} = COALESCE(group_value, own_value)`,
  `${indent}| KEEP ${key}, ${outputColumn}`,
];

// Nested single-condition CASEs: ES|QL evaluates a multi-condition CASE one row at a time.
const levelNumEvals = (indent: string): string[] => [
  `${indent}| EVAL level_low = CASE(risk_level == "Low", 1, 0),`,
  `${indent}       level_moderate = CASE(risk_level == "Moderate", 2, level_low),`,
  `${indent}       level_high = CASE(risk_level == "High", 3, level_moderate),`,
  `${indent}       level_num = CASE(risk_level == "Critical", 4, level_high)`,
];

/**
 * Returns the stages that give each risk score doc its entity id (`entity_euid`) and score
 * (`risk_score`) and drop the docs without an entity. Shared by the history branches and the
 * sparkline series, so they read a score the same way.
 */
export const buildRiskScoreEvals = (indent: string): string[] => [
  entityEuidEval(indent),
  riskScoreEval(indent),
  dropWithoutEntity(indent),
];

/**
 * Returns the stages that give each risk score doc its entity id and its level as a number
 * (`level_num`, 1 Low to 4 Critical), like {@link buildRiskScoreEvals}.
 */
export const buildRiskLevelEvals = (indent: string): string[] => [
  entityEuidEval(indent),
  riskLevelEval(indent),
  dropWithoutEntity(indent),
  ...levelNumEvals(indent),
];

/**
 * Returns the stages that give each risk score doc its entity id, its score (`risk_score`) and its
 * level as a number (`level_num`), for a query that needs both, like the risk sparklines.
 */
export const buildRiskScoreAndLevelEvals = (indent: string): string[] => [
  entityEuidEval(indent),
  riskScoreEval(indent),
  riskLevelEval(indent),
  dropWithoutEntity(indent),
  ...levelNumEvals(indent),
];

/**
 * Returns the lines of a sub-query that gives each entity's last risk score in the risk score
 * history at one moment: the last score in the two hours before `at`. Scoring runs hourly, so that
 * window always holds at least one run, and LAST() takes the actual snapshot, not the highest
 * score seen. The result has one row per `entity.id` with the score in `outputColumn`: the group's
 * score if the entity has one, else its own (see {@link pickGroupValueFirst}).
 */
export const buildRiskScoreHistoryBranch = (
  riskScoreIndex: string,
  at: string,
  outputColumn: string
): string[] => [
  `  FROM ${riskScoreIndex}`,
  `  | WHERE @timestamp >= ${at} - ${BOUNDARY_WINDOW_HOURS} hours AND @timestamp <= ${at}`,
  ...buildRiskScoreEvals('  '),
  ...pickGroupValueFirst('  ', 'entity_euid', 'risk_score', outputColumn),
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
  ...buildRiskLevelEvals('  '),
  ...pickGroupValueFirst('  ', 'entity_euid', 'level_num', outputColumn),
  `  | RENAME entity_euid AS \`entity.id\``,
];
