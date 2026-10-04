/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidEsqlFilterBasedOnDocument } from '@kbn/entity-store/common/domain/euid';
import {
  ALERT_COUNT_FIELD,
  ALLOWED_ENTITY_TYPES,
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FIELD,
  ENTITY_TYPE_FILTER,
  LAST_SEEN_ALERT_FIELD,
  alertLookbackCutoff,
  buildKeepClause,
  buildResolvedRowsFilter,
  buildFilterClause,
  buildLookupJoinClause,
  buildSearchIdInClause,
  entityAliasOf,
  toList,
  buildSortSuffix,
  buildCursorClause,
  buildAlertEuidPipeline,
} from '../common';
import type { QueryArgs, Row, RunContext, ColumnDescriptor } from '../common';

const alertsIndexOf = (namespace: string) => `.alerts-security.alerts-${namespace}`;

const ALERT_OPEN_STATUS_FILTER =
  'kibana.alert.workflow_status IS NULL OR kibana.alert.workflow_status != "closed"';

const isAllowedEntityType = (type: unknown): type is (typeof ALLOWED_ENTITY_TYPES)[number] =>
  typeof type === 'string' && (ALLOWED_ENTITY_TYPES as readonly string[]).includes(type);

/**
 * OR of per-row identity filters for the unstamped alert branch. Uses existing euid
 * helpers against page rows (identity fields kept via ENTITY_FIELDS). Duplicate clauses
 * are deduped. Rows that cannot produce a clause are omitted — we never widen to bare
 * `kibana.alert.entity.id IS NULL`.
 */
const buildLegacyIdentityClause = (pageRows: Row[]): string | undefined => {
  const clauses = new Set<string>();
  for (const row of pageRows) {
    const entityType = row[ENTITY_TYPE_FIELD];
    if (isAllowedEntityType(entityType)) {
      const clause = getEuidEsqlFilterBasedOnDocument(entityType, row);
      if (clause) clauses.add(clause);
    }
  }
  if (clauses.size === 0) return undefined;
  return [...clauses].join(' OR ');
};

// ── query builders: last_seen_alert sort ──────────────────────────────────────

const buildAlertLastSeenBaseQuery = (alertsIndex: string, cutoff: string): string =>
  [
    `FROM ${alertsIndex}`,
    `| WHERE \`@timestamp\` >= "${cutoff}"`,
    ...buildAlertEuidPipeline(),
    `| STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`) BY \`entity.id\``,
  ].join('\n');

const buildLastSeenAlertDataQuery = (args: QueryArgs): string => {
  const {
    namespace,
    timeRange,
    sort: { direction: dir },
    cursor,
    pageSize,
    rowsMode,
    concreteEntityIndexName,
    searchExpression,
    entityExpression,
  } = args;
  const inner = [
    buildAlertLastSeenBaseQuery(alertsIndexOf(namespace), alertLookbackCutoff(timeRange)),
    ...buildSearchIdInClause(entityAliasOf(namespace), searchExpression),
    buildLookupJoinClause(concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildResolvedRowsFilter(rowsMode),
    ...buildFilterClause(entityExpression),
    buildKeepClause(args, LAST_SEEN_ALERT_FIELD),
    ...buildCursorClause(cursor),
  ].join('\n');

  return [`FROM (`, inner, `)`, buildSortSuffix(LAST_SEEN_ALERT_FIELD, dir, pageSize)].join('\n');
};

const buildLastSeenAlertCountQuery = ({
  namespace,
  timeRange,
  rowsMode,
  concreteEntityIndexName,
  searchExpression,
  entityExpression,
}: QueryArgs): string =>
  [
    buildAlertLastSeenBaseQuery(alertsIndexOf(namespace), alertLookbackCutoff(timeRange)),
    ...buildSearchIdInClause(entityAliasOf(namespace), searchExpression),
    buildLookupJoinClause(concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildResolvedRowsFilter(rowsMode),
    ...buildFilterClause(entityExpression),
    `| KEEP \`${ENTITY_ID_FIELD}\``,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── query builders: alert_count sort ─────────────────────────────────────────

const buildAlertCountSortBaseQuery = (alertsIndex: string, cutoff: string): string =>
  [
    `FROM ${alertsIndex}`,
    `| WHERE \`@timestamp\` >= "${cutoff}"`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    ...buildAlertEuidPipeline(),
    `| STATS ${ALERT_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
  ].join('\n');

const buildAlertCountSortDataQuery = (args: QueryArgs): string => {
  const {
    namespace,
    timeRange,
    sort: { direction: dir },
    cursor,
    pageSize,
    rowsMode,
    concreteEntityIndexName,
    searchExpression,
    entityExpression,
  } = args;
  const inner = [
    buildAlertCountSortBaseQuery(alertsIndexOf(namespace), alertLookbackCutoff(timeRange)),
    ...buildSearchIdInClause(entityAliasOf(namespace), searchExpression),
    buildLookupJoinClause(concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildResolvedRowsFilter(rowsMode),
    ...buildFilterClause(entityExpression),
    buildKeepClause(args, ALERT_COUNT_FIELD),
    ...buildCursorClause(cursor),
  ].join('\n');

  return [`FROM (`, inner, `)`, buildSortSuffix(ALERT_COUNT_FIELD, dir, pageSize)].join('\n');
};

const buildAlertCountSortCountQuery = ({
  namespace,
  timeRange,
  rowsMode,
  concreteEntityIndexName,
  searchExpression,
  entityExpression,
}: QueryArgs): string =>
  [
    buildAlertCountSortBaseQuery(alertsIndexOf(namespace), alertLookbackCutoff(timeRange)),
    ...buildSearchIdInClause(entityAliasOf(namespace), searchExpression),
    buildLookupJoinClause(concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildResolvedRowsFilter(rowsMode),
    ...buildFilterClause(entityExpression),
    `| KEEP \`${ENTITY_ID_FIELD}\``,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── enrichment ────────────────────────────────────────────────────────────────

const buildAlertEnrichQuery = (
  alertsIndex: string,
  entityIds: readonly string[],
  cutoff: string,
  legacyIdentityClause?: string
): string => {
  const ids = toList(entityIds);
  return [
    `FROM ${alertsIndex}`,
    `| WHERE \`@timestamp\` >= "${cutoff}"`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    ...buildAlertEuidPipeline({
      stampedEntityIds: entityIds,
      legacyIdentityClause,
    }),
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

const enrichAlerts = async (
  pageRows: Row[],
  { namespace, timeRange }: QueryArgs,
  skip: Set<string>,
  { runQuery }: RunContext
): Promise<void> => {
  const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
  if (!entityIds.length) return;

  const legacyIdentityClause = buildLegacyIdentityClause(pageRows);

  const rows = await runQuery(
    buildAlertEnrichQuery(
      alertsIndexOf(namespace),
      entityIds,
      alertLookbackCutoff(timeRange),
      legacyIdentityClause
    )
  ).catch(() => null);
  if (!rows) return;

  const byId = buildAlertBuckets(rows);
  for (const row of pageRows) {
    const bucket = byId.get(row[ENTITY_ID_FIELD] as string);
    if (!skip.has(LAST_SEEN_ALERT_FIELD)) {
      row[LAST_SEEN_ALERT_FIELD] = bucket?.last_seen ?? null;
    }

    row[ALERT_COUNT_FIELD] = bucket?.total ?? 0;
    row['alert_critical'] = bucket?.critical ?? 0;
    row['alert_high'] = bucket?.high ?? 0;
    row['alert_medium'] = bucket?.medium ?? 0;
    row['alert_low'] = bucket?.low ?? 0;
  }
};

// ── column descriptors ────────────────────────────────────────────────────────

export const alertCountColumn = {
  id: ALERT_COUNT_FIELD,
  displayAsText: 'Alerts',
  initialWidth: 100,
  isSortable: true,
  isExpandable: false,
  buildSortQuery: buildAlertCountSortDataQuery,
  buildCountQuery: buildAlertCountSortCountQuery,
  enrichPage: enrichAlerts,
} as const satisfies ColumnDescriptor;

export const lastSeenAlertColumn = {
  id: LAST_SEEN_ALERT_FIELD,
  displayAsText: 'Last alert',
  initialWidth: 180,
  isSortable: true,
  isExpandable: false,
  buildSortQuery: buildLastSeenAlertDataQuery,
  buildCountQuery: buildLastSeenAlertCountQuery,
  // enrichPage intentionally absent — enrichAlerts (on alertCountColumn) populates this field too.
  // The registry deduplicates enrichPage by function reference before executing.
} as const satisfies ColumnDescriptor;
