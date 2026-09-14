/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_COUNT_FIELD,
  ENTITY_ID_FIELD,
  ENTITY_JOIN_FILTER,
  LAST_SEEN_ALERT_FIELD,
  indent,
  keepClause,
  toList,
  sortSuffix,
  cursorClause,
} from './common';
import type { PageCursor, QueryDeps, SortDir } from './common';
import { buildAlertEuidPipeline } from './alert_euid_pipeline';

// ── module-level ES|QL fragments ──────────────────────────────────────────────

const ALERT_OPEN_STATUS_FILTER =
  'kibana.alert.workflow_status IS NULL OR kibana.alert.workflow_status != "closed"';

// ── query builders: last_seen_alert sort ──────────────────────────────────────

// No status filter: last-seen captures any alert activity, including closed.
const alertLastSeenBaseQuery = (alertsIndex: string, cutoff: string): string =>
  [
    `FROM ${alertsIndex}`,
    `| WHERE \`@timestamp\` >= "${cutoff}"`,
    ...buildAlertEuidPipeline(),
    `| STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`) BY \`entity.id\``,
  ].join('\n');

// TODO: when sorting by last_seen_alert, entities without any alert in the last 30 days are
// excluded from results entirely — the count reflects this subset, not the full entity count.
// A future improvement: include all entities and treat no-alert as null (sort last).

export const lastSeenAlertDataQuery = (
  { alertsIndex, entityAlias, alertCutoff }: QueryDeps,
  cursor: PageCursor | null,
  pageSize: number,
  dir: SortDir
): string => {
  const inner = [
    alertLastSeenBaseQuery(alertsIndex, alertCutoff),
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_JOIN_FILTER}`,
    keepClause(LAST_SEEN_ALERT_FIELD),
    ...(cursor ? [cursorClause(cursor)] : []),
  ].join('\n');
  return [`FROM (`, indent(inner), `)`, sortSuffix(LAST_SEEN_ALERT_FIELD, dir, pageSize)].join(
    '\n'
  );
};

export const lastSeenAlertCountQuery = (
  { alertsIndex, entityAlias, alertCutoff }: QueryDeps
): string =>
  [
    alertLastSeenBaseQuery(alertsIndex, alertCutoff),
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_JOIN_FILTER}`,
    `| KEEP \`${ENTITY_ID_FIELD}\``,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── query builders: alert enrichment (count + last_seen for a page of entities) ──

// Single-query enrichment using the EUID pipeline: derives entity.id from alert identity
// fields via MV_EXPAND + COALESCE(stamped, derived), then filters to the current page's
// entity IDs. Replaces the previous two-leg (new/old) UNION — entity.id handles both
// stamped and unstamped alerts uniformly, and multi-entity alerts are expanded correctly.
export const alertEnrichQuery = (
  alertsIndex: string,
  entityIds: readonly string[],
  cutoff: string
): string => {
  const ids = toList(entityIds);
  return [
    `FROM ${alertsIndex}`,
    `| WHERE \`@timestamp\` >= "${cutoff}"`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    `| WHERE \`kibana.alert.entity.id\` IN (${ids}) OR \`kibana.alert.entity.id\` IS NULL`,
    ...buildAlertEuidPipeline(),
    `| WHERE \`entity.id\` IN (${ids})`,
    `| STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`), ${ALERT_COUNT_FIELD} = COUNT(*) BY \`entity.id\`, severity = \`kibana.alert.severity\``,
  ].join('\n');
};

// ── query builders: alert_count sort ─────────────────────────────────────────

const alertCountSortBaseQuery = (alertsIndex: string, cutoff: string): string =>
  [
    `FROM ${alertsIndex}`,
    `| WHERE \`@timestamp\` >= "${cutoff}"`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    ...buildAlertEuidPipeline(),
    `| STATS ${ALERT_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
  ].join('\n');

export const alertCountSortDataQuery = (
  { alertsIndex, entityAlias, alertCutoff }: QueryDeps,
  cursor: PageCursor | null,
  pageSize: number,
  dir: SortDir
): string => {
  const inner = [
    alertCountSortBaseQuery(alertsIndex, alertCutoff),
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_JOIN_FILTER}`,
    keepClause(ALERT_COUNT_FIELD),
    ...(cursor ? [cursorClause(cursor)] : []),
  ].join('\n');
  return [`FROM (`, indent(inner), `)`, sortSuffix(ALERT_COUNT_FIELD, dir, pageSize)].join('\n');
};

export const alertCountSortCountQuery = (
  { alertsIndex, entityAlias, alertCutoff }: QueryDeps
): string =>
  [
    alertCountSortBaseQuery(alertsIndex, alertCutoff),
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_JOIN_FILTER}`,
    `| KEEP \`${ENTITY_ID_FIELD}\``,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── alert enrichment result helpers ──────────────────────────────────────────

export interface AlertBucket {
  last_seen: string | null;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/** Folds per-severity alert rows into a per-entity-id bucket map. */
export const buildAlertBuckets = (
  alertRows: Array<Record<string, unknown>>
): Map<string, AlertBucket> => {
  const byId = new Map<string, AlertBucket>();
  for (const r of alertRows) {
    const id = r['entity.id'] as string;
    const sev = (r.severity as string | null) ?? '';
    const cnt = (r[ALERT_COUNT_FIELD] as number) ?? 0;
    const ts = r[LAST_SEEN_ALERT_FIELD] as string | null;
    if (!byId.has(id))
      byId.set(id, { last_seen: null, total: 0, critical: 0, high: 0, medium: 0, low: 0 });
    const bucket = byId.get(id)!;
    bucket.total += cnt;
    if (ts != null && (bucket.last_seen == null || ts > bucket.last_seen)) bucket.last_seen = ts;
    if (sev === 'critical') bucket.critical += cnt;
    else if (sev === 'high') bucket.high += cnt;
    else if (sev === 'medium') bucket.medium += cnt;
    else if (sev === 'low') bucket.low += cnt;
  }
  return byId;
};
