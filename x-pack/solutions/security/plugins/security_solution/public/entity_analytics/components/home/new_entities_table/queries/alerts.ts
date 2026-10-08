/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidEsqlFilterBasedOnDocument } from '@kbn/entity-store/common/domain/euid';
import {
  buildIdentityPrefilter,
  alertsIndexOf,
  buildLookupJoinClause,
  entityAliasOf,
  esqlLookback,
  toList,
} from './esql';
import {
  entityIdsOf,
  getEntityId,
  ALERT_COUNT_FIELD,
  ALLOWED_ENTITY_TYPES,
  ENTITY_TYPE_FIELD,
  LAST_SEEN_ALERT_FIELD,
} from '../common';
import { buildAlertEuidPipeline } from './euid_pipeline';
import {
  buildEntitiesInViewConditions,
  buildEntitiesInViewCountQuery,
  IN_VIEW_FIELD,
} from './entities_in_view';
import { buildForeignSortPageSteps } from './foreign_sort';
import type { QueryArgs, Row, PageEnricher, ColumnQuerySpec } from '../common';
import { buildEntityListSortPlan, runSplitSortPage } from './split_sort';
import type { SplitSortPlan } from './split_sort';

const ALERT_OPEN_STATUS_FILTER =
  'kibana.alert.workflow_status IS NULL OR kibana.alert.workflow_status != "closed"';

const SEVERITY_COUNT_FIELDS = {
  critical: 'alert_critical',
  high: 'alert_high',
  medium: 'alert_medium',
  low: 'alert_low',
} as const;

const ALERT_COUNT_FIELDS = [ALERT_COUNT_FIELD, ...Object.values(SEVERITY_COUNT_FIELDS)] as const;
const ALERT_FIELDS = [LAST_SEEN_ALERT_FIELD, ...ALERT_COUNT_FIELDS] as const;

const ALERT_AGGREGATIONS: ReadonlyArray<{
  field: string;
  aggregation: string;
  condition?: string;
}> = [
  { field: LAST_SEEN_ALERT_FIELD, aggregation: 'MAX(`@timestamp`)' },
  { field: ALERT_COUNT_FIELD, aggregation: 'COUNT(*)' },
  ...Object.entries(SEVERITY_COUNT_FIELDS).map(([severity, field]) => ({
    field,
    aggregation: 'COUNT(*)',
    condition: `\`kibana.alert.severity\` == "${severity}"`,
  })),
];

/** STATS aggregations of every alert column, over the rows that match `rowCondition`. */
const buildAlertAggregations = (rowCondition?: string): string[] =>
  ALERT_AGGREGATIONS.map(({ field, aggregation, condition }) => {
    const conditions = [rowCondition, condition].filter(Boolean);
    return conditions.length
      ? `${field} = ${aggregation} WHERE ${conditions.join(' AND ')}`
      : `${field} = ${aggregation}`;
  });

const isAllowedEntityType = (type: unknown): type is (typeof ALLOWED_ENTITY_TYPES)[number] =>
  typeof type === 'string' && (ALLOWED_ENTITY_TYPES as readonly string[]).includes(type);

// ── unstamped alert filters ───────────────────────────────────────────────────

interface UnstampedIdentityFilters {
  unstampedIdentityClause: string;
  unstampedIdentityPrefilter?: string;
}

/**
 * Filters the unstamped branch to alerts of the page rows: an OR of per-row EUID
 * clauses and its pushable prefilter. Rows without a clause are left out, so the
 * filter never widens to all unstamped alerts.
 */
const buildUnstampedIdentityFilters = (
  pageRows: readonly Row[]
): UnstampedIdentityFilters | undefined => {
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

/**
 * Sort query over open alerts that keeps every entity in view. FORK can't run inside a
 * FROM subquery, so instead of the subquery merge the alerts and the entity index share
 * one FROM: alert docs go through the stamped/unstamped branches, entity docs in view
 * through a third branch, and the merge by `entity.id` keeps entities without alerts.
 * It computes every alert column, so the page needs no alerts enrichment.
 */
const buildAlertSortQuery = (args: QueryArgs, sortField: string): string => {
  const { namespace, timeRange, concreteEntityIndexName } = args;
  const isEntityDoc = `_index == "${concreteEntityIndexName}"`;
  const entityConditions = buildEntitiesInViewConditions(args).map((c) => `(${c})`);
  return [
    `FROM ${alertsIndexOf(namespace)}, ${entityAliasOf(namespace)} METADATA _index`,
    `| WHERE (NOT ${isEntityDoc} AND \`@timestamp\` >= ${esqlLookback(
      timeRange
    )} AND (${ALERT_OPEN_STATUS_FILTER})) OR (${[isEntityDoc, ...entityConditions].join(' AND ')})`,
    ...buildAlertEuidPipeline({
      alertBranchCondition: `NOT ${isEntityDoc}`,
      extraBranch: [
        `WHERE ${isEntityDoc}`,
        `| EVAL _ea_entity_id = \`entity.id\`, ${IN_VIEW_FIELD} = 1`,
        `| KEEP _ea_entity_id, ${IN_VIEW_FIELD}`,
      ],
    }),
    `| STATS ${[
      ...buildAlertAggregations(`${IN_VIEW_FIELD} IS NULL`),
      `${IN_VIEW_FIELD} = MAX(${IN_VIEW_FIELD})`,
    ].join(', ')} BY \`entity.id\``,
    `| WHERE ${IN_VIEW_FIELD} == 1`,
    ...buildForeignSortPageSteps(args, sortField, ALERT_FIELDS),
  ].join('\n');
};

// ── split sort (see split_sort.ts) ───────────────────────────────────────────

/** Open alerts in the time range, mapped to `entity.id`, without entity docs. */
const buildOpenAlertEntityRows = ({ namespace, timeRange }: QueryArgs): string[] => [
  `FROM ${alertsIndexOf(namespace)}`,
  `| WHERE \`@timestamp\` >= ${esqlLookback(timeRange)} AND (${ALERT_OPEN_STATUS_FILTER})`,
  ...buildAlertEuidPipeline(),
];

/** Entities in view with open alerts, with their entity docs. */
const buildAlertedEntitiesInView = (args: QueryArgs, groupBy: string): string[] => [
  ...buildOpenAlertEntityRows(args),
  groupBy,
  buildLookupJoinClause(args.concreteEntityIndexName),
  ...buildEntitiesInViewConditions(args).map((condition) => `| WHERE ${condition}`),
];

const ALERT_EMPTY_COLUMNS = [
  ...ALERT_COUNT_FIELDS.map((field) => `${field} = TO_LONG(0)`),
  `${LAST_SEEN_ALERT_FIELD} = TO_DATETIME(null)`,
].join(', ');

export const alertSplitSortPlan = (sortField: string): SplitSortPlan =>
  buildEntityListSortPlan({
    sortField,
    // Entities without alerts count 0, so they sort first ascending; their last alert is null.
    emptyValue: sortField === ALERT_COUNT_FIELD ? 0 : null,
    buildEntitiesWithValues: buildAlertedEntitiesInView,
    aggregations: buildAlertAggregations(),
    columns: [sortField, ...ALERT_FIELDS],
    emptyColumns: ALERT_EMPTY_COLUMNS,
    buildSortQuery: (args) => buildAlertSortQuery(args, sortField),
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
    `| WHERE \`@timestamp\` >= ${esqlLookback(timeRange)}`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    ...buildAlertEuidPipeline({ stampedEntityIds: entityIds, ...unstampedIdentity }),
    `| WHERE \`entity.id\` IN (${toList(entityIds)})`,
    `| STATS ${buildAlertAggregations().join(', ')} BY \`entity.id\``,
  ].join('\n');
};

/** Reads the alert count, last alert, and per-severity counts of the page rows. */
const alertsEnricher: PageEnricher = {
  fields: ALERT_FIELDS,
  read: async (pageRows, args, { runQuery }) => {
    const entityIds = entityIdsOf(pageRows);
    if (!entityIds.length) return new Map();

    const unstampedIdentity = buildUnstampedIdentityFilters(pageRows);
    const rows = await runQuery(buildAlertsEnrichQuery(args, entityIds, unstampedIdentity));

    const byId = new Map(rows.map((r) => [getEntityId(r), r]));
    return new Map(
      entityIds.map((id) => {
        const alerts = byId.get(id);
        return [
          id,
          {
            [LAST_SEEN_ALERT_FIELD]: alerts?.[LAST_SEEN_ALERT_FIELD] ?? null,
            ...Object.fromEntries(ALERT_COUNT_FIELDS.map((field) => [field, alerts?.[field] ?? 0])),
          },
        ];
      })
    );
  },
};

// ── query specs ───────────────────────────────────────────────────────────────

export const alertCountQuerySpec = {
  sort: {
    // Entities without alerts count 0, so they sort first in ascending order.
    buildSortQuery: (args) => buildAlertSortQuery(args, ALERT_COUNT_FIELD),
    buildCountQuery: buildEntitiesInViewCountQuery,
    runSortPage: (args, ctx) => runSplitSortPage(alertSplitSortPlan(ALERT_COUNT_FIELD), args, ctx),
  },
  enricher: alertsEnricher,
} satisfies ColumnQuerySpec;

export const lastSeenAlertQuerySpec = {
  sort: {
    buildSortQuery: (args) => buildAlertSortQuery(args, LAST_SEEN_ALERT_FIELD),
    buildCountQuery: buildEntitiesInViewCountQuery,
    runSortPage: (args, ctx) =>
      runSplitSortPage(alertSplitSortPlan(LAST_SEEN_ALERT_FIELD), args, ctx),
  },
  // No enricher: the alerts enricher of the alert count reads this field too.
} satisfies ColumnQuerySpec;
