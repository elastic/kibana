/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAlertsIndex,
  getEntityAlias,
  buildLookback,
  buildJoinedPageSteps,
  SET_UNMAPPED_NULLIFY,
  toList,
} from './esql';
import { getEntityIds, getEntityId, SEVERITY_COUNT_FIELDS } from '../common';
import {
  buildAlertEntityFilter,
  buildAlertEuidPipeline,
  buildAlertForkSteps,
  buildStampedAlertBranch,
  buildUnstampedAlertBranch,
} from './euid_pipeline';
import { buildEntitiesInViewConditions, IN_VIEW_FIELD } from './entities_in_view';
import type { QueryArgs, Row } from '../common';
import { buildEntityListSortPlan, fetchSplitSortPage } from './split_sort';
import type { SplitSortPlan } from './split_sort';
import type { ColumnQuerySpec, PageEnricher } from './types';

const ALERT_COUNT_FIELD = 'alert_count';
const LAST_SEEN_ALERT_FIELD = 'last_seen_alert';

const ALERT_OPEN_STATUS_FILTER =
  'kibana.alert.workflow_status IS NULL OR kibana.alert.workflow_status != "closed"';

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
    SET_UNMAPPED_NULLIFY,
    `FROM ${getAlertsIndex(namespace)}, ${getEntityAlias(namespace)} METADATA _index`,
    `| WHERE (NOT ${isEntityDoc} AND \`@timestamp\` >= ${buildLookback(
      timeRange
    )} AND (${ALERT_OPEN_STATUS_FILTER})) OR (${[isEntityDoc, ...entityConditions].join(' AND ')})`,
    ...buildAlertForkSteps([
      buildStampedAlertBranch(),
      buildUnstampedAlertBranch({ guard: `NOT ${isEntityDoc}` }),
      [
        `WHERE ${isEntityDoc}`,
        `| EVAL _ea_entity_id = \`entity.id\`, ${IN_VIEW_FIELD} = 1`,
        `| KEEP _ea_entity_id, ${IN_VIEW_FIELD}`,
      ],
    ]),
    `| STATS ${[
      ...buildAlertAggregations(`${IN_VIEW_FIELD} IS NULL`),
      `${IN_VIEW_FIELD} = MAX(${IN_VIEW_FIELD})`,
    ].join(', ')} BY \`entity.id\``,
    `| WHERE ${IN_VIEW_FIELD} == 1`,
    ...buildJoinedPageSteps(args, sortField, ALERT_FIELDS),
  ].join('\n');
};

// ── split sort (see split_sort.ts) ───────────────────────────────────────────

/** Open alerts in the time range, mapped to `entity.id`, without entity docs. */
const buildOpenAlertEntityRows = ({ namespace, timeRange }: QueryArgs): string[] => [
  SET_UNMAPPED_NULLIFY,
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
    aggregations: buildAlertAggregations(),
    columns: [sortField, ...ALERT_FIELDS],
    emptyColumns: ALERT_EMPTY_COLUMNS,
  });

// ── enrichment ────────────────────────────────────────────────────────────────

const buildAlertsEnrichQuery = (args: QueryArgs, pageRows: readonly Row[]): string => {
  const { namespace, timeRange } = args;
  const filter = buildAlertEntityFilter(pageRows);
  return [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getAlertsIndex(namespace)}`,
    `| WHERE \`@timestamp\` >= ${buildLookback(timeRange)}`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    ...buildAlertEuidPipeline(filter),
    `| WHERE \`entity.id\` IN (${toList(filter.entityIds)})`,
    `| STATS ${buildAlertAggregations().join(', ')} BY \`entity.id\``,
  ].join('\n');
};

/** Reads the alert count, last alert, and per-severity counts of the page rows. */
const alertsEnricher: PageEnricher = {
  fields: ALERT_FIELDS,
  fetch: async (pageRows, args, { runQuery }) => {
    const entityIds = getEntityIds(pageRows);
    if (!entityIds.length) return new Map();

    const rows = await runQuery(buildAlertsEnrichQuery(args, pageRows));

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
