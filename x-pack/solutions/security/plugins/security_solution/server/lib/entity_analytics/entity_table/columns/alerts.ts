/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  ALERT_COUNT_FIELD,
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FILTER,
  LAST_SEEN_ALERT_FIELD,
  alertLookbackCutoff,
  entityAliasOf,
  keepClause,
  toList,
  sortSuffix,
  cursorClause,
} from '../common';
import type { QueryArgs, EsqlRunner, Row } from '../common';
import { buildAlertEuidPipeline } from '../euid';

const alertsIndexOf = (namespace: string) => `.alerts-security.alerts-${namespace}`;

// ── fragments ──────────────────────────────────────────────

const ALERT_OPEN_STATUS_FILTER =
  'kibana.alert.workflow_status IS NULL OR kibana.alert.workflow_status != "closed"';

// ── query builders: last_seen_alert sort ──────────────────────────────────────
// entities with no alert in the time range are excluded; count reflects this subset, not all entities.

const alertLastSeenBaseQuery = (alertsIndex: string, cutoff: string): string =>
  [
    `FROM ${alertsIndex}`,
    `| WHERE \`@timestamp\` >= "${cutoff}"`,
    ...buildAlertEuidPipeline(),
    `| STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`) BY \`entity.id\``,
  ].join('\n');

export const lastSeenAlertDataQuery = ({
  namespace,
  timeRange,
  sort: { direction: dir },
  cursor,
  pageSize,
}: QueryArgs): string => {
  const inner = [
    alertLastSeenBaseQuery(alertsIndexOf(namespace), alertLookbackCutoff(timeRange)),
    `| LOOKUP JOIN ${entityAliasOf(namespace)} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    keepClause(LAST_SEEN_ALERT_FIELD),
    ...(cursor ? [cursorClause(cursor)] : []),
  ].join('\n');

  return [`FROM (`, inner, `)`, sortSuffix(LAST_SEEN_ALERT_FIELD, dir, pageSize)].join('\n');
};

export const lastSeenAlertCountQuery = ({ namespace, timeRange }: QueryArgs): string =>
  [
    alertLastSeenBaseQuery(alertsIndexOf(namespace), alertLookbackCutoff(timeRange)),
    `| LOOKUP JOIN ${entityAliasOf(namespace)} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| KEEP \`${ENTITY_ID_FIELD}\``,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── query builders: alert_count sort ─────────────────────────────────────────

const alertCountSortBaseQuery = (alertsIndex: string, cutoff: string): string =>
  [
    `FROM ${alertsIndex}`,
    `| WHERE \`@timestamp\` >= "${cutoff}"`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    ...buildAlertEuidPipeline(),
    `| STATS ${ALERT_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
  ].join('\n');

export const alertCountSortDataQuery = ({
  namespace,
  timeRange,
  sort: { direction: dir },
  cursor,
  pageSize,
}: QueryArgs): string => {
  const inner = [
    alertCountSortBaseQuery(alertsIndexOf(namespace), alertLookbackCutoff(timeRange)),
    `| LOOKUP JOIN ${entityAliasOf(namespace)} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    keepClause(ALERT_COUNT_FIELD),
    ...(cursor ? [cursorClause(cursor)] : []),
  ].join('\n');

  return [`FROM (`, inner, `)`, sortSuffix(ALERT_COUNT_FIELD, dir, pageSize)].join('\n');
};

export const alertCountSortCountQuery = ({ namespace, timeRange }: QueryArgs): string =>
  [
    alertCountSortBaseQuery(alertsIndexOf(namespace), alertLookbackCutoff(timeRange)),
    `| LOOKUP JOIN ${entityAliasOf(namespace)} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| KEEP \`${ENTITY_ID_FIELD}\``,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── enrichment ────────────────────────────────────────────────────────────────

const alertEnrichQuery = (
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

interface AlertBucket {
  last_seen: string | null;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/** Aggregates per-severity alert rows (one row per entity+severity) into a per-entity bucket. */
const buildAlertBuckets = (alertRows: Row[]): Map<string, AlertBucket> => {
  const byId = new Map<string, AlertBucket>();

  for (const row of alertRows) {
    const entityId = row['entity.id'] as string;
    const severity = (row.severity as string | null) ?? '';
    const count = (row[ALERT_COUNT_FIELD] as number) ?? 0;
    const lastSeen = row[LAST_SEEN_ALERT_FIELD] as string | null;

    let bucket = byId.get(entityId);
    if (bucket == null) {
      bucket = { last_seen: null, total: 0, critical: 0, high: 0, medium: 0, low: 0 };
      byId.set(entityId, bucket);
    }

    bucket.total += count;
    if (lastSeen != null && (bucket.last_seen == null || lastSeen > bucket.last_seen)) {
      bucket.last_seen = lastSeen;
    }
    if (severity === 'critical') bucket.critical += count;
    else if (severity === 'high') bucket.high += count;
    else if (severity === 'medium') bucket.medium += count;
    else if (severity === 'low') bucket.low += count;
  }

  return byId;
};

/** Populates alert_count, last_seen_alert, and per-severity counts for a page of entity rows. */
export const enrichAlerts = async (
  logger: Logger,
  pageRows: Row[],
  { namespace, timeRange }: QueryArgs,
  skip: Set<string>,
  enrichPageQuery: EsqlRunner
): Promise<void> => {
  // Always runs — severity breakdown is never provided by any sort query.
  // skip only suppresses last_seen_alert (already populated by last_seen_alert sort).
  const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
  if (!entityIds.length) return;

  const rows = await enrichPageQuery(
    alertEnrichQuery(alertsIndexOf(namespace), entityIds, alertLookbackCutoff(timeRange))
  ).catch((e: unknown) => {
    logger.warn(`alert enrich: ${e}`);
    return null;
  });
  if (!rows) return;

  const byId = buildAlertBuckets(rows);
  for (const row of pageRows) {
    const bucket = byId.get(row[ENTITY_ID_FIELD] as string);
    if (!skip.has(LAST_SEEN_ALERT_FIELD)) row[LAST_SEEN_ALERT_FIELD] = bucket?.last_seen ?? null;
    row[ALERT_COUNT_FIELD] = bucket?.total ?? 0;
    row['alert_critical'] = bucket?.critical ?? 0;
    row['alert_high'] = bucket?.high ?? 0;
    row['alert_medium'] = bucket?.medium ?? 0;
    row['alert_low'] = bucket?.low ?? 0;
  }
};
