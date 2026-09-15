/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FILTER,
  RISK_SCORE_CHANGE_FIELD,
  RISK_SCORE_NORM_FIELD,
  TIME_RANGE_DAYS,
  entityAliasOf,
  keepClause,
  toList,
  sortSuffix,
  cursorClause,
} from '../common';
import type { QueryArgs, EsqlRunner, Row, TimeRange } from '../common';

const riskScoreIndexOf = (namespace: string) => `risk-score.risk-score-${namespace}`;

// ── risk date window ──────────────────────────────────────────────────────────

// Returns a [from, to) 24h window starting N days ago (midnight boundaries).
// 'to' is one day after 'from', so timestamp >= from AND timestamp < to selects that slice.
const utcDayStart = (daysAgo = 0): string => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
};

const riskDateWindow = (range: TimeRange): { from: string; to: string } => {
  const days = TIME_RANGE_DAYS[range];
  return { from: utcDayStart(days), to: utcDayStart(days - 1) };
};

// ── constants ─────────────────────────────────────────────────────────────────

// Risk score history docs have one of host/user/service set per document.
const ENTITY_ID_COALESCE = `COALESCE(host.name, user.name, service.name)`;
const RISK_SCORE_COALESCE = `COALESCE(host.risk.calculated_score_norm, user.risk.calculated_score_norm, service.risk.calculated_score_norm)`;

// ── query builders: risk_score_change sort ────────────────────────────────────

/** Scans the 24h reference window [from, to) and picks the earliest risk score per entity. */
const riskScoreChangeBaseQuery = (
  namespace: string,
  { from, to }: { from: string; to: string }
): string =>
  [
    `FROM ${riskScoreIndexOf(namespace)}`,
    `| WHERE \`@timestamp\` >= "${from}" AND \`@timestamp\` < "${to}"`,
    `| EVAL \`entity.id\` = ${ENTITY_ID_COALESCE}, score = ${RISK_SCORE_COALESCE}`,
    `| STATS reference_score = TOP(\`@timestamp\`, 1, "asc", score) BY \`entity.id\``,
    `| LOOKUP JOIN ${entityAliasOf(namespace)} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RISK_SCORE_NORM_FIELD} IS NOT NULL`,
    `| EVAL ${RISK_SCORE_CHANGE_FIELD} = ${RISK_SCORE_NORM_FIELD} - reference_score`,
    keepClause(RISK_SCORE_CHANGE_FIELD),
  ].join('\n');

export const riskScoreChangeDataQuery = ({
  namespace,
  timeRange,
  sort: { direction: dir },
  cursor,
  pageSize,
}: QueryArgs): string =>
  [
    riskScoreChangeBaseQuery(namespace, riskDateWindow(timeRange)),
    ...(cursor ? [cursorClause(cursor)] : []),
    sortSuffix(RISK_SCORE_CHANGE_FIELD, dir, pageSize),
  ].join('\n');

export const riskScoreChangeCountQuery = ({ namespace, timeRange }: QueryArgs): string =>
  [
    riskScoreChangeBaseQuery(namespace, riskDateWindow(timeRange)),
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── enrichment ────────────────────────────────────────────────────────────────

/** Fetches the earliest risk score in [from, to) for the given entity IDs — used as the reference point for the delta. */
const referenceScoreEnrichQuery = (
  namespace: string,
  entityIds: string[],
  { from, to }: { from: string; to: string }
): string => {
  const ids = toList(entityIds);
  return [
    `FROM ${riskScoreIndexOf(namespace)}`,
    `| WHERE \`@timestamp\` >= "${from}" AND \`@timestamp\` < "${to}"`,
    `| WHERE host.name IN (${ids}) OR user.name IN (${ids}) OR service.name IN (${ids})`,
    `| EVAL entity_id = ${ENTITY_ID_COALESCE}, score = ${RISK_SCORE_COALESCE}`,
    `| WHERE entity_id IN (${ids})`,
    `| STATS reference_score = TOP(\`@timestamp\`, 1, "asc", score) BY entity_id`,
  ].join('\n');
};

/** Populates risk_score_change for a page of entity rows using the earliest reference score in the window. */
export const enrichRiskScoreChange = async (
  logger: Logger,
  pageRows: Row[],
  { namespace, timeRange }: QueryArgs,
  skip: Set<string>,
  enrichPageQuery: EsqlRunner
): Promise<void> => {
  if (skip.has(RISK_SCORE_CHANGE_FIELD)) return;

  const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
  const rows = await enrichPageQuery(
    referenceScoreEnrichQuery(namespace, entityIds, riskDateWindow(timeRange))
  ).catch((e: unknown) => {
    logger.warn(`score enrich: ${e}`);
    return null;
  });
  if (!rows) return;

  const byId = new Map(rows.map((r) => [r.entity_id as string, r.reference_score as number]));
  for (const row of pageRows) {
    const currentScore = row[RISK_SCORE_NORM_FIELD] as number | null;
    const referenceScore = byId.get(row[ENTITY_ID_FIELD] as string) ?? null;

    row[RISK_SCORE_CHANGE_FIELD] =
      currentScore != null && referenceScore != null ? currentScore - referenceScore : null;
  }
};
