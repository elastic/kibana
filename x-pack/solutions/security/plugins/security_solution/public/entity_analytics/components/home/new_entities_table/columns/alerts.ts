/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEuidEsqlFilterBasedOnDocument,
  getEuidSourceFields,
} from '@kbn/entity-store/common/domain/euid';
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
import { isAbortError } from '../../../../../common/utils/exceptions';

const alertsIndexOf = (namespace: string) => `.alerts-security.alerts-${namespace}`;

const ALERT_OPEN_STATUS_FILTER =
  'kibana.alert.workflow_status IS NULL OR kibana.alert.workflow_status != "closed"';

const isAllowedEntityType = (type: unknown): type is (typeof ALLOWED_ENTITY_TYPES)[number] =>
  typeof type === 'string' && (ALLOWED_ENTITY_TYPES as readonly string[]).includes(type);

/** Raw identity fields every per-row euid clause matches on with `==`. */
const IDENTITY_SOURCE_FIELDS = [
  ...new Set(ALLOWED_ENTITY_TYPES.flatMap((t) => getEuidSourceFields(t).identitySourceFields)),
];

const stringValuesOf = (value: unknown): string[] =>
  [value].flat().filter((v): v is string => typeof v === 'string' && v !== '');

/**
 * `field IN (...)` over the identity values of `rows`. A superset of their euid clauses that
 * Lucene can push down; the clauses alone cannot be pushed because they cast fields with
 * `TO_STRING`, which forces a scan of every unstamped alert in the window.
 */
const buildIdentityPrefilter = (rows: Row[]): string | undefined => {
  const parts = IDENTITY_SOURCE_FIELDS.flatMap((field) => {
    const values = [...new Set(rows.flatMap((row) => stringValuesOf(row[field])))];
    return values.length ? [`${field} IN (${toList(values)})`] : [];
  });
  return parts.length ? parts.join(' OR ') : undefined;
};

interface LegacyIdentityFilters {
  legacyIdentityClause: string;
  legacyIdentityPrefilter?: string;
}

/**
 * OR of per-row identity filters for the unstamped alert branch, plus its pushable
 * prefilter. Uses existing euid helpers against page rows (identity fields kept via
 * ENTITY_FIELDS). Duplicate clauses are deduped. Rows that cannot produce a clause are
 * omitted — we never widen to bare `kibana.alert.entity.id IS NULL`.
 */
const buildLegacyIdentityFilters = (pageRows: Row[]): LegacyIdentityFilters | undefined => {
  const clauses = new Set<string>();
  const matchedRows: Row[] = [];
  for (const row of pageRows) {
    const entityType = row[ENTITY_TYPE_FIELD];
    if (isAllowedEntityType(entityType)) {
      const clause = getEuidEsqlFilterBasedOnDocument(entityType, row);
      if (clause) {
        clauses.add(clause);
        matchedRows.push(row);
      }
    }
  }
  if (clauses.size === 0) return undefined;
  return {
    legacyIdentityClause: [...clauses].join(' OR '),
    legacyIdentityPrefilter: buildIdentityPrefilter(matchedRows),
  };
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

const SEVERITY_COUNT_FIELDS = {
  critical: 'alert_critical',
  high: 'alert_high',
  medium: 'alert_medium',
  low: 'alert_low',
} as const;

const ALERT_COUNT_FIELDS = [ALERT_COUNT_FIELD, ...Object.values(SEVERITY_COUNT_FIELDS)] as const;

const buildAlertEnrichQuery = (
  alertsIndex: string,
  entityIds: readonly string[],
  cutoff: string,
  legacyIdentity?: LegacyIdentityFilters
): string => {
  const ids = toList(entityIds);
  return [
    `FROM ${alertsIndex}`,
    `| WHERE \`@timestamp\` >= "${cutoff}"`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    ...buildAlertEuidPipeline({
      stampedEntityIds: entityIds,
      ...legacyIdentity,
    }),
    `| WHERE \`entity.id\` IN (${ids})`,
    `| STATS ${[
      `${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`)`,
      `${ALERT_COUNT_FIELD} = COUNT(*)`,
      ...Object.entries(SEVERITY_COUNT_FIELDS).map(
        ([severity, field]) =>
          `${field} = COUNT(*) WHERE \`kibana.alert.severity\` == "${severity}"`
      ),
    ].join(', ')} BY \`entity.id\``,
  ].join('\n');
};

const enrichAlerts = async (
  pageRows: Row[],
  { namespace, timeRange }: QueryArgs,
  skip: Set<string>,
  { runQuery }: RunContext
): Promise<void> => {
  const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
  if (!entityIds.length) return;

  const legacyIdentity = buildLegacyIdentityFilters(pageRows);

  const rows = await runQuery(
    buildAlertEnrichQuery(
      alertsIndexOf(namespace),
      entityIds,
      alertLookbackCutoff(timeRange),
      legacyIdentity
    )
  ).catch((err) => {
    if (isAbortError(err)) throw err;
    return null;
  });
  if (!rows) return;

  const byId = new Map(rows.map((r) => [r[ENTITY_ID_FIELD] as string, r]));
  for (const row of pageRows) {
    const alerts = byId.get(row[ENTITY_ID_FIELD] as string);
    if (!skip.has(LAST_SEEN_ALERT_FIELD)) {
      row[LAST_SEEN_ALERT_FIELD] = alerts?.[LAST_SEEN_ALERT_FIELD] ?? null;
    }
    for (const field of ALERT_COUNT_FIELDS) {
      row[field] = alerts?.[field] ?? 0;
    }
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
