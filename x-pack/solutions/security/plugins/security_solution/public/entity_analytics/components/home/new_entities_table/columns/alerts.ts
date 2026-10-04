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
  LAST_SEEN_ALERT_FIELD,
  alertsIndexOf,
  buildAlertEuidPipeline,
  buildForeignSortQueries,
  lookbackCutoff,
  nullOnFailure,
  toList,
} from '../common';
import type { QueryArgs, Row, RunContext, ColumnDescriptor } from '../common';

const ALERT_OPEN_STATUS_FILTER =
  'kibana.alert.workflow_status IS NULL OR kibana.alert.workflow_status != "closed"';

const SEVERITY_COUNT_FIELDS = {
  critical: 'alert_critical',
  high: 'alert_high',
  medium: 'alert_medium',
  low: 'alert_low',
} as const;

const ALERT_COUNT_FIELDS = [ALERT_COUNT_FIELD, ...Object.values(SEVERITY_COUNT_FIELDS)] as const;

/** Raw identity fields that every per-row EUID clause matches with `==`. */
const IDENTITY_SOURCE_FIELDS = [
  ...new Set(ALLOWED_ENTITY_TYPES.flatMap((t) => getEuidSourceFields(t).identitySourceFields)),
];

const isAllowedEntityType = (type: unknown): type is (typeof ALLOWED_ENTITY_TYPES)[number] =>
  typeof type === 'string' && (ALLOWED_ENTITY_TYPES as readonly string[]).includes(type);

const stringValuesOf = (value: unknown): string[] =>
  [value].flat().filter((v): v is string => typeof v === 'string' && v !== '');

// ── unstamped alert filters ───────────────────────────────────────────────────

/**
 * Pushable prefilter: `field IN (…)` over the identity values of `rows`.
 * It matches a superset of the rows' EUID clauses. The clauses cast fields with
 * `TO_STRING`, so ES|QL cannot push them down and scans every unstamped alert.
 */
const buildIdentityPrefilter = (rows: Row[]): string | undefined => {
  const parts = IDENTITY_SOURCE_FIELDS.flatMap((field) => {
    const values = [...new Set(rows.flatMap((row) => stringValuesOf(row[field])))];
    return values.length ? [`${field} IN (${toList(values)})`] : [];
  });
  return parts.length ? parts.join(' OR ') : undefined;
};

interface UnstampedIdentityFilters {
  unstampedIdentityClause: string;
  unstampedIdentityPrefilter?: string;
}

/**
 * Filters the unstamped branch to alerts of the page rows: an OR of per-row EUID
 * clauses and its pushable prefilter. Rows without a clause are left out, so the
 * filter never widens to all unstamped alerts.
 */
const buildUnstampedIdentityFilters = (pageRows: Row[]): UnstampedIdentityFilters | undefined => {
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
    unstampedIdentityClause: [...clauses].join(' OR '),
    unstampedIdentityPrefilter: buildIdentityPrefilter(matchedRows),
  };
};

// ── sort queries ──────────────────────────────────────────────────────────────

/** Open alerts in the time range, one row per alert and entity id. */
const buildOpenAlertEntityRows = ({ namespace, timeRange }: QueryArgs): string[] => [
  `FROM ${alertsIndexOf(namespace)}`,
  `| WHERE \`@timestamp\` >= "${lookbackCutoff(timeRange)}"`,
  `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
  ...buildAlertEuidPipeline(),
];

const buildAlertCountBaseQuery = (args: QueryArgs): string =>
  [
    ...buildOpenAlertEntityRows(args),
    `| STATS ${ALERT_COUNT_FIELD} = COUNT(*) BY \`entity.id\``,
  ].join('\n');

const buildLastSeenAlertBaseQuery = ({ namespace, timeRange }: QueryArgs): string =>
  [
    `FROM ${alertsIndexOf(namespace)}`,
    `| WHERE \`@timestamp\` >= "${lookbackCutoff(timeRange)}"`,
    ...buildAlertEuidPipeline(),
    `| STATS ${LAST_SEEN_ALERT_FIELD} = MAX(\`@timestamp\`) BY \`entity.id\``,
  ].join('\n');

const buildAlertCountQueries = (args: QueryArgs) =>
  buildForeignSortQueries(args, {
    baseQuery: buildAlertCountBaseQuery(args),
    sortField: ALERT_COUNT_FIELD,
  });

const buildLastSeenAlertQueries = (args: QueryArgs) =>
  buildForeignSortQueries(args, {
    baseQuery: buildLastSeenAlertBaseQuery(args),
    sortField: LAST_SEEN_ALERT_FIELD,
  });

// ── enrichment ────────────────────────────────────────────────────────────────

const buildAlertsEnrichQuery = (
  args: QueryArgs,
  entityIds: readonly string[],
  unstampedIdentity?: UnstampedIdentityFilters
): string => {
  const { namespace, timeRange } = args;
  return [
    `FROM ${alertsIndexOf(namespace)}`,
    `| WHERE \`@timestamp\` >= "${lookbackCutoff(timeRange)}"`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    ...buildAlertEuidPipeline({ stampedEntityIds: entityIds, ...unstampedIdentity }),
    `| WHERE \`entity.id\` IN (${toList(entityIds)})`,
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

/** Fills the alert count, last alert, and per-severity counts of the page rows. */
const enrichAlerts = async (
  pageRows: Row[],
  args: QueryArgs,
  skip: Set<string>,
  { runQuery }: RunContext
): Promise<void> => {
  const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
  if (!entityIds.length) return;

  const unstampedIdentity = buildUnstampedIdentityFilters(pageRows);
  const rows = await nullOnFailure(
    runQuery(buildAlertsEnrichQuery(args, entityIds, unstampedIdentity))
  );
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
  buildSortQuery: (args) => buildAlertCountQueries(args).sort,
  buildCountQuery: (args) => buildAlertCountQueries(args).count,
  enrichPage: enrichAlerts,
} as const satisfies ColumnDescriptor;

export const lastSeenAlertColumn = {
  id: LAST_SEEN_ALERT_FIELD,
  displayAsText: 'Last alert',
  initialWidth: 180,
  isSortable: true,
  isExpandable: false,
  buildSortQuery: (args) => buildLastSeenAlertQueries(args).sort,
  buildCountQuery: (args) => buildLastSeenAlertQueries(args).count,
  // No enrichPage: enrichAlerts on alertCountColumn also fills this field.
  // The registry runs each enrichPage function once.
} as const satisfies ColumnDescriptor;
