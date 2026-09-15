/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  ALLOWED_ENTITY_TYPES,
  ENTITY_ID_COALESCE,
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FIELD,
  RISK_SCORE_CHANGE_FIELD,
  RISK_SCORE_COALESCE,
  RISK_SCORE_NORM_FIELD,
  keepClause,
  toList,
  sortSuffix,
  cursorClause,
} from './common';
import type { PageCursor, QueryDeps, RawQuery, RiskDateWindow, Row, SortDir } from './common';

// ── query builders: risk_score_change sort ────────────────────────────────────

// TODO: when sorting by risk_score_change, only entities that have BOTH a reference score and
// a current score are included — entities with no reference score or no current score are
// excluded entirely. The count reflects this subset, not the full entity count.

/** Base pipeline: risk history → LOOKUP JOIN entity store → compute delta.
 *  Scans the first 24h of the observation window [windowStart, windowEnd] and uses
 *  TOP(@timestamp, 1, "asc", score) to pick the earliest score — the one closest to
 *  the reference boundary. Entities with no score in that window are excluded. */
const riskScoreChangeBaseQuery = (
  riskScoreIndex: string,
  entityAlias: string,
  { windowStart, windowEnd }: RiskDateWindow
): string =>
  [
    `FROM ${riskScoreIndex}`,
    `| WHERE \`@timestamp\` >= "${windowStart}" AND \`@timestamp\` < "${windowEnd}"`,
    `| EVAL \`entity.id\` = ${ENTITY_ID_COALESCE}, score = ${RISK_SCORE_COALESCE}`,
    `| STATS reference_score = TOP(\`@timestamp\`, 1, "asc", score) BY \`entity.id\``,
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(
      ALLOWED_ENTITY_TYPES
    )}) AND ${RISK_SCORE_NORM_FIELD} IS NOT NULL`,
    `| EVAL ${RISK_SCORE_CHANGE_FIELD} = ${RISK_SCORE_NORM_FIELD} - reference_score`,
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
 *  Same window as riskScoreChangeBaseQuery — earliest score in [windowStart, windowEnd).
 *  Entities with no score in that window return no row. */
// ── enrichment ────────────────────────────────────────────────────────────────

/** Populates risk_score_change for a page of entity rows using the earliest reference score in the window. */
export const enrichRiskScoreChange = async (
  pageRows: Row[],
  { riskScoreIndex, riskWindow }: QueryDeps,
  skip: Set<string>,
  enrichPageQuery: RawQuery,
  logger: Logger
): Promise<void> => {
  if (skip.has(RISK_SCORE_CHANGE_FIELD)) return;

  const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
  const rows = await enrichPageQuery(
    referenceScoreEnrichQuery(riskScoreIndex, entityIds, riskWindow),
    'score enrich'
  ).catch((e: unknown) => {
    logger.warn(`score enrich: ${e}`);
    return null;
  });
  if (!rows) return;

  const byId = new Map(rows.map((r) => [r.entity_id as string, r.reference_score as number]));
  for (const row of pageRows) {
    const cur = row[RISK_SCORE_NORM_FIELD] as number | null;
    const ref = byId.get(row[ENTITY_ID_FIELD] as string) ?? null;
    row[RISK_SCORE_CHANGE_FIELD] = cur != null && ref != null ? cur - ref : null;
  }
};

export const referenceScoreEnrichQuery = (
  riskScoreIndex: string,
  entityIds: string[],
  { windowStart, windowEnd }: RiskDateWindow
): string => {
  const ids = toList(entityIds);
  return [
    `FROM ${riskScoreIndex}`,
    `| WHERE \`@timestamp\` >= "${windowStart}" AND \`@timestamp\` < "${windowEnd}"`,
    // Pre-filter using indexed name fields so Lucene skips unrelated risk docs before EVAL.
    `| WHERE host.name IN (${ids}) OR user.name IN (${ids}) OR service.name IN (${ids})`,
    `| EVAL entity_id = ${ENTITY_ID_COALESCE}, score = ${RISK_SCORE_COALESCE}`,
    `| WHERE entity_id IN (${ids})`,
    `| STATS reference_score = TOP(\`@timestamp\`, 1, "asc", score) BY entity_id`,
  ].join('\n');
};
