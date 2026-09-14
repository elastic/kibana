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

// Returns the last millisecond of the UTC calendar day that windowStart falls on.
// windowStart is always UTC midnight, so this is always the same calendar day — no arithmetic leak.
const referenceWindowEnd = (windowStart: string): string => {
  const d = new Date(windowStart);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
};

// ── query builders: risk_score_change sort ────────────────────────────────────

// TODO: when sorting by risk_score_change, only entities that have BOTH a reference score and
// a current score are included — entities with no reference score or no current score are
// excluded entirely. The count reflects this subset, not the full entity count.

/** Base pipeline: risk history → LOOKUP JOIN entity store → compute delta.
 *  Scans the 24h window starting at windowStart (the reference calendar day) and uses
 *  TOP(@timestamp, 1, "desc", score) to pick the most recent score. Entities with no
 *  score that day are excluded — we never silently use a stale score from an earlier run. */
const riskScoreChangeBaseQuery = (
  riskScoreIndex: string,
  entityAlias: string,
  { windowStart }: RiskDateWindow
): string => {
  const windowEnd = referenceWindowEnd(windowStart);
  return [
    `FROM ${riskScoreIndex}`,
    `| WHERE \`@timestamp\` >= "${windowStart}" AND \`@timestamp\` <= "${windowEnd}"`,
    `| EVAL \`entity.id\` = ${ENTITY_ID_COALESCE}, score = ${RISK_SCORE_COALESCE}`,
    `| STATS reference_score = TOP(\`@timestamp\`, 1, "desc", score) BY \`entity.id\``,
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(
      ALLOWED_ENTITY_TYPES
    )}) AND ${RISK_SCORE_NORM_FIELD} IS NOT NULL`,
    `| EVAL ${RISK_SCORE_CHANGE_FIELD} = ${RISK_SCORE_NORM_FIELD} - reference_score`,
    keepClause(RISK_SCORE_CHANGE_FIELD),
  ].join('\n');
};

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

export const riskScoreChangeCountQuery = ({
  riskScoreIndex,
  entityAlias,
  riskWindow,
}: QueryDeps): string =>
  [
    riskScoreChangeBaseQuery(riskScoreIndex, entityAlias, riskWindow),
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── query builders: risk_score_change enrichment ──────────────────────────────

/** Fetches (entity_id, reference_score) for a specific set of entity IDs.
 *  Same 24h window as riskScoreChangeBaseQuery. Entities with no score that day return no
 *  row — callers must treat absence as "no reference score", not zero or stale. */
export const referenceScoreEnrichQuery = (
  riskScoreIndex: string,
  entityIds: string[],
  { windowStart }: RiskDateWindow
): string => {
  const ids = toList(entityIds);
  const windowEnd = referenceWindowEnd(windowStart);
  return [
    `FROM ${riskScoreIndex}`,
    `| WHERE \`@timestamp\` >= "${windowStart}" AND \`@timestamp\` <= "${windowEnd}"`,
    // Pre-filter using indexed name fields so Lucene skips unrelated risk docs before EVAL.
    `| WHERE host.name IN (${ids}) OR user.name IN (${ids}) OR service.name IN (${ids})`,
    `| EVAL entity_id = ${ENTITY_ID_COALESCE}, score = ${RISK_SCORE_COALESCE}`,
    `| WHERE entity_id IN (${ids})`,
    `| STATS reference_score = TOP(\`@timestamp\`, 1, "desc", score) BY entity_id`,
  ].join('\n');
};
