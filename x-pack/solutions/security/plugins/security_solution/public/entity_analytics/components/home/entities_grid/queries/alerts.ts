/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidEsqlFilterBasedOnDocument } from '@kbn/entity-store/common/domain/euid';
import {
  buildIdentityPrefilter,
  getAlertsIndex,
  getEntityAlias,
  buildLookback,
  buildJoinedPageSteps,
  buildEntityAggregations,
  buildResolvedEntityAggregations,
  buildResolvedEntityAggregationSteps,
  toList,
} from './esql';
import type { EntityAggregation } from './esql';
import {
  getEntityIds,
  getEntityId,
  ALLOWED_ENTITY_TYPES,
  ENTITY_TYPE_FIELD,
  SEVERITY_COUNT_FIELDS,
  isOneOf,
} from '../common';
import { buildAlertEuidPipeline } from './euid_pipeline';
import { buildEntitiesInViewConditions, IN_VIEW_FIELD } from './entities_in_view';
import type { QueryArgs, Row } from '../common';
import { withEntityAliases } from './resolved_entity_aliases';
import { buildEntityListSortPlan, fetchSplitSortPage } from './split_sort';
import type { SplitSortPlan } from './split_sort';
import type { ColumnQuerySpec, PageEnricher } from './types';

const ALERT_COUNT_FIELD = 'alert_count';
const LAST_SEEN_ALERT_FIELD = 'last_seen_alert';

const ALERT_OPEN_STATUS_FILTER =
  'kibana.alert.workflow_status IS NULL OR kibana.alert.workflow_status != "closed"';

const ALERT_COUNT_FIELDS = [ALERT_COUNT_FIELD, ...Object.values(SEVERITY_COUNT_FIELDS)] as const;
const ALERT_FIELDS = [LAST_SEEN_ALERT_FIELD, ...ALERT_COUNT_FIELDS] as const;

const ALERT_AGGREGATIONS: readonly EntityAggregation[] = [
  { field: LAST_SEEN_ALERT_FIELD, aggregation: 'MAX(`@timestamp`)', resolvedEntity: 'MAX' },
  { field: ALERT_COUNT_FIELD, aggregation: 'COUNT(*)', resolvedEntity: 'SUM' },
  ...Object.entries(SEVERITY_COUNT_FIELDS).map(([severity, field]) => ({
    field,
    aggregation: 'COUNT(*)',
    condition: `\`kibana.alert.severity\` == "${severity}"`,
    resolvedEntity: 'SUM' as const,
  })),
];

const ALERT_RESOLVED_ENTITY_AGGREGATIONS = buildResolvedEntityAggregations(ALERT_AGGREGATIONS);

const isAllowedEntityType = (type: unknown): type is (typeof ALLOWED_ENTITY_TYPES)[number] =>
  isOneOf(ALLOWED_ENTITY_TYPES, type);

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
    `FROM ${getAlertsIndex(namespace)}, ${getEntityAlias(namespace)} METADATA _index`,
    `| WHERE (NOT ${isEntityDoc} AND \`@timestamp\` >= ${buildLookback(
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
      ...buildEntityAggregations(ALERT_AGGREGATIONS, `${IN_VIEW_FIELD} IS NULL`),
      `${IN_VIEW_FIELD} = MAX(${IN_VIEW_FIELD})`,
    ].join(', ')} BY \`entity.id\``,
    ...buildResolvedEntityAggregationSteps(args, [
      ...ALERT_RESOLVED_ENTITY_AGGREGATIONS,
      `${IN_VIEW_FIELD} = MAX(${IN_VIEW_FIELD})`,
    ]),
    `| WHERE ${IN_VIEW_FIELD} == 1`,
    ...buildJoinedPageSteps(args, sortField, ALERT_FIELDS),
  ].join('\n');
};

// ── split sort (see split_sort.ts) ───────────────────────────────────────────

/** Open alerts in the time range, mapped to `entity.id`, without entity docs. */
const buildOpenAlertEntityRows = ({ namespace, timeRange }: QueryArgs): string[] => [
  `FROM ${getAlertsIndex(namespace)}`,
  `| WHERE \`@timestamp\` >= ${buildLookback(timeRange)} AND (${ALERT_OPEN_STATUS_FILTER})`,
  ...buildAlertEuidPipeline(),
];

const ALERT_EMPTY_COLUMNS = [
  ...ALERT_COUNT_FIELDS.map((field) => `${field} = TO_LONG(0)`),
  `${LAST_SEEN_ALERT_FIELD} = TO_DATETIME(null)`,
].join(', ');

const getAlertSplitSortPlan = (sortField: string): SplitSortPlan =>
  buildEntityListSortPlan({
    sortField,
    // Entities without alerts count 0, so they sort first ascending; their last alert is null.
    emptyValue: sortField === ALERT_COUNT_FIELD ? 0 : null,
    buildForeignRows: buildOpenAlertEntityRows,
    buildSortQuery: (args) => buildAlertSortQuery(args, sortField),
    aggregations: ALERT_AGGREGATIONS,
    columns: [sortField, ...ALERT_FIELDS],
    emptyColumns: ALERT_EMPTY_COLUMNS,
  });

// ── enrichment ────────────────────────────────────────────────────────────────

const buildAlertsEnrichQuery = (
  args: QueryArgs,
  entityIds: readonly string[],
  unstampedIdentity?: UnstampedIdentityFilters
): string => {
  const { namespace, timeRange } = args;
  return [
    `FROM ${getAlertsIndex(namespace)}`,
    `| WHERE \`@timestamp\` >= ${buildLookback(timeRange)}`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    ...buildAlertEuidPipeline({ stampedEntityIds: entityIds, ...unstampedIdentity }),
    `| WHERE \`entity.id\` IN (${toList(entityIds)})`,
    `| STATS ${buildEntityAggregations(ALERT_AGGREGATIONS).join(', ')} BY \`entity.id\``,
    ...buildResolvedEntityAggregationSteps(args, ALERT_RESOLVED_ENTITY_AGGREGATIONS),
  ].join('\n');
};

/**
 * Reads the alert count, last alert, and per-severity counts of the page rows. The alerts of the
 * aliases of a resolved row count for it.
 */
const alertsEnricher: PageEnricher = {
  fields: ALERT_FIELDS,
  fetch: async (pageRows, args, { runQuery }) => {
    const entityIds = getEntityIds(pageRows);
    if (!entityIds.length) return new Map();

    const alertedRows = await withEntityAliases(pageRows, args, runQuery);
    const unstampedIdentity = buildUnstampedIdentityFilters(alertedRows);
    const rows = await runQuery(
      buildAlertsEnrichQuery(args, getEntityIds(alertedRows), unstampedIdentity)
    );

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

const alertCountSplitSortPlan = getAlertSplitSortPlan(ALERT_COUNT_FIELD);
const lastSeenAlertSplitSortPlan = getAlertSplitSortPlan(LAST_SEEN_ALERT_FIELD);

export const alertCountQuerySpec = {
  fetchSortPage: (args, ctx) => fetchSplitSortPage(alertCountSplitSortPlan, args, ctx),
  enricher: alertsEnricher,
} satisfies ColumnQuerySpec;

export const lastSeenAlertQuerySpec = {
  fetchSortPage: (args, ctx) => fetchSplitSortPage(lastSeenAlertSplitSortPlan, args, ctx),
  // No enricher: the alerts enricher of the alert count reads this field too.
} satisfies ColumnQuerySpec;
