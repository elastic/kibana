/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALLOWED_ENTITY_TYPES,
  ENTITY_ID_COALESCE,
  ENTITY_TYPE_FIELD,
  RISK_SCORE_CHANGE_FIELD,
  RISK_SCORE_COALESCE,
  RISK_SCORE_NORM_FIELD,
  keepClause,
  toList,
  sortSuffix,
  cursorClause,
} from './common';
import type { PageCursor, QueryDeps, RiskDateWindow, SortDir } from './common';

// ── query builders: risk_score_change sort ────────────────────────────────────

// TODO: when sorting by risk_score_change, only entities that have BOTH a yesterday score and
// a today score are included — entities new today (no yesterday) or with no today score are
// excluded entirely. The count reflects this subset, not the full entity count.

/** Base pipeline: risk history → LOOKUP JOIN entity store → compute delta. */
const riskScoreChangeBaseQuery = (
  riskScoreIndex: string,
  entityAlias: string,
  { yesterdayStart, todayStart }: RiskDateWindow
): string =>
  [
    `FROM ${riskScoreIndex}`,
    `| WHERE \`@timestamp\` >= "${yesterdayStart}" AND \`@timestamp\` < "${todayStart}"`,
    `| EVAL \`entity.id\` = ${ENTITY_ID_COALESCE}, yesterday_score = ${RISK_SCORE_COALESCE}`,
    `| STATS yesterday_score = MAX(yesterday_score) BY \`entity.id\``,
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(
      ALLOWED_ENTITY_TYPES
    )}) AND ${RISK_SCORE_NORM_FIELD} IS NOT NULL`,
    `| EVAL ${RISK_SCORE_CHANGE_FIELD} = ${RISK_SCORE_NORM_FIELD} - yesterday_score`,
    keepClause(RISK_SCORE_CHANGE_FIELD),
  ].join('\n');

export const riskScoreChangeDataQuery = (
  { riskScoreIndex, entityAlias, riskWindow }: QueryDeps,
  cursor: PageCursor | null,
  pageSize: number,
  dir: SortDir
): string =>
  [
    riskScoreChangeBaseQuery(riskScoreIndex, entityAlias, riskWindow),
    ...(cursor ? [cursorClause(cursor)] : []),
    sortSuffix(RISK_SCORE_CHANGE_FIELD, dir, pageSize),
  ].join('\n');

export const riskScoreChangeCountQuery = (
  { riskScoreIndex, entityAlias, riskWindow }: QueryDeps
): string =>
  [
    riskScoreChangeBaseQuery(riskScoreIndex, entityAlias, riskWindow),
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── query builders: risk_score_change enrichment ──────────────────────────────

/** Fetches (entity_id, yesterday_score) for a specific set of entity IDs. */
export const yesterdayScoreEnrichQuery = (
  riskScoreIndex: string,
  entityIds: string[],
  { yesterdayStart, todayStart }: RiskDateWindow
): string => {
  const ids = toList(entityIds);
  return [
    `FROM ${riskScoreIndex}`,
    `| WHERE \`@timestamp\` >= "${yesterdayStart}" AND \`@timestamp\` < "${todayStart}"`,
    // Pre-filter using indexed name fields so Lucene skips unrelated risk docs before EVAL.
    `| WHERE host.name IN (${ids}) OR user.name IN (${ids}) OR service.name IN (${ids})`,
    `| EVAL entity_id = ${ENTITY_ID_COALESCE}, score = ${RISK_SCORE_COALESCE}`,
    `| WHERE entity_id IN (${ids})`,
    `| STATS yesterday_score = MAX(score) BY entity_id`,
  ].join('\n');
};
