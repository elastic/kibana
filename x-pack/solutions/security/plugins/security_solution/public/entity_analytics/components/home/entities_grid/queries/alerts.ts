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
  buildStatsByEntityClause,
  buildAliasesToResolvedEntitySteps,
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
import {
  buildEntitiesInViewConditions,
  IN_VIEW_AGGREGATION,
  IN_VIEW_FIELD,
} from './entities_in_view';
import type { QueryArgs, Row } from '../common';
import { getPartsByResolvedEntity, withEntityAliases } from './resolved_entities';
import { buildEntityListSortPlan, fetchSplitSortPage } from './split_sort';
import type { SplitSortPlan } from './split_sort';
import type { ColumnQuerySpec, EnrichedFields, RunContext } from './types';

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

const isAllowedEntityType = (type: unknown): type is (typeof ALLOWED_ENTITY_TYPES)[number] =>
  isOneOf(ALLOWED_ENTITY_TYPES, type);

// ── unstamped alert filters ──────────────────────────────────────────────────

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

// ── what the columns do ──────────────────────────────────────────────────────

export const alertCountQuerySpec = {
  fetchSortPage: (args, ctx) =>
    fetchSplitSortPage(getAlertSortPlan(ALERT_COUNT_FIELD, args), args, ctx),
  enricher: {
    fields: ALERT_FIELDS,
    fetch: (rows, args, ctx) => fetchAlertFields(rows, args, ctx),
  },
} satisfies ColumnQuerySpec;

export const lastSeenAlertQuerySpec = {
  fetchSortPage: (args, ctx) =>
    fetchSplitSortPage(getAlertSortPlan(LAST_SEEN_ALERT_FIELD, args), args, ctx),
  // No enricher: the alerts enricher of the alert count reads this field too.
} satisfies ColumnQuerySpec;

// ── sorts ────────────────────────────────────────────────────────────────────

/** The plan of a sort by an alert column (see split_sort.ts); a resolved row's alerts include its aliases'. */
const getAlertSortPlan = (sortField: string, { rowsMode }: QueryArgs): SplitSortPlan =>
  buildEntityListSortPlan({
    sortField,
    // Entities without alerts count 0, so they sort first ascending; their last alert is null.
    emptyValue: sortField === ALERT_COUNT_FIELD ? 0 : null,
    buildSourceRows: buildOpenAlertRowsSteps,
    buildSortQuery: (args) =>
      rowsMode === 'resolved'
        ? buildResolvedAlertSortQuery(args, sortField)
        : buildAlertSortQuery(args, sortField),
    aggregations: ALERT_AGGREGATIONS,
    columns: [sortField, ...ALERT_FIELDS],
    emptyColumns: ALERT_EMPTY_COLUMNS,
  });

/**
 * Every entity in view, sorted by an alert column, in one query: it computes every alert
 * column, so the page needs no alerts enrichment.
 */
const buildAlertSortQuery = (args: QueryArgs, sortField: string): string[] => [
  ...buildAlertsAndEntitiesInViewSteps(args),
  ...buildEntityIdOfEachRowSteps(args),
  ALERT_COLUMNS_PER_ENTITY_STATS,
  IN_VIEW_ONLY_FILTER,
  ...buildJoinedPageSteps(args, sortField, ALERT_FIELDS),
];

/** The same, with the alerts of an alias counted for its resolved entity. */
const buildResolvedAlertSortQuery = (args: QueryArgs, sortField: string): string[] => [
  ...buildAlertsAndEntitiesInViewSteps(args),
  ...buildEntityIdOfEachRowSteps(args),
  ALERT_COLUMNS_PER_ENTITY_STATS,
  ...buildAliasesToResolvedEntitySteps(args.concreteEntityIndexName, [
    ...ALERT_AGGREGATIONS,
    IN_VIEW_AGGREGATION,
  ]),
  IN_VIEW_ONLY_FILTER,
  ...buildJoinedPageSteps(args, sortField, ALERT_FIELDS),
];

const isEntityDoc = ({ concreteEntityIndexName }: QueryArgs) =>
  `_index == "${concreteEntityIndexName}"`;

/**
 * Open alerts in the window and the entities in view, in one FROM: the merge by `entity.id` keeps
 * the entities without alerts. FORK, which maps alerts to entities, can't run inside a FROM
 * subquery, so the two indices share the FROM instead.
 */
const buildAlertsAndEntitiesInViewSteps = (args: QueryArgs): string[] => {
  const entityConditions = buildEntitiesInViewConditions(args).map((c) => `(${c})`);
  return [
    `FROM ${getAlertsIndex(args.namespace)}, ${getEntityAlias(args.namespace)} METADATA _index`,
    `| WHERE (NOT ${isEntityDoc(args)} AND \`@timestamp\` >= ${buildLookback(
      args.timeRange
    )} AND (${ALERT_OPEN_STATUS_FILTER})) OR (${[isEntityDoc(args), ...entityConditions].join(
      ' AND '
    )})`,
  ];
};

/** Each alert as the rows of its entities, and each entity doc as its own row, marked in view. */
const buildEntityIdOfEachRowSteps = (args: QueryArgs): string[] =>
  buildAlertEuidPipeline({
    alertBranchCondition: `NOT ${isEntityDoc(args)}`,
    extraBranch: [
      `WHERE ${isEntityDoc(args)}`,
      `| EVAL _ea_entity_id = \`entity.id\`, ${IN_VIEW_FIELD} = 1`,
      `| KEEP _ea_entity_id, ${IN_VIEW_FIELD}`,
    ],
  });

/** The alert columns per entity, from the alert rows only, and whether the entity is in view. */
const ALERT_COLUMNS_PER_ENTITY_STATS = buildStatsByEntityClause([
  ...buildEntityAggregations(ALERT_AGGREGATIONS, `${IN_VIEW_FIELD} IS NULL`),
  `${IN_VIEW_FIELD} = MAX(${IN_VIEW_FIELD})`,
]);

const IN_VIEW_ONLY_FILTER = `| WHERE ${IN_VIEW_FIELD} == 1`;

/** Open alerts in the time range, as rows of `entity.id`, without entity docs. */
const buildOpenAlertRowsSteps = ({ namespace, timeRange }: QueryArgs): string[] => [
  `FROM ${getAlertsIndex(namespace)}`,
  `| WHERE \`@timestamp\` >= ${buildLookback(timeRange)} AND (${ALERT_OPEN_STATUS_FILTER})`,
  ...buildAlertEuidPipeline(),
];

const ALERT_EMPTY_COLUMNS = [
  ...ALERT_COUNT_FIELDS.map((field) => `${field} = TO_LONG(0)`),
  `${LAST_SEEN_ALERT_FIELD} = TO_DATETIME(null)`,
].join(', ');

// ── enrich ───────────────────────────────────────────────────────────────────

/**
 * Most entities in one alerts query: each entity adds terms to an OR of the query, and ES|QL
 * parses at most 300 levels of one expression.
 */
const MAX_ENTITIES_PER_ALERTS_QUERY = 250;

/** The alert columns of the page's entities; a resolved row's alerts include its aliases'. */
const fetchAlertFields = async (
  rows: readonly Row[],
  args: QueryArgs,
  { runQuery }: RunContext
): Promise<EnrichedFields> => {
  if (!getEntityIds(rows).length) return new Map();
  const isResolved = args.rowsMode === 'resolved';
  const entities = isResolved ? await withEntityAliases(rows, args, runQuery) : rows;
  const buildQuery = isResolved ? buildResolvedPageAlertColumnsQuery : buildPageAlertColumnsQuery;
  // A resolved entity and its aliases go in one part, which counts their alerts together.
  const parts = getPartsByResolvedEntity(entities, MAX_ENTITIES_PER_ALERTS_QUERY);
  const alertColumns = await Promise.all(parts.map((part) => runQuery(buildQuery(args, part))));
  return toAlertFields(rows, alertColumns.flat());
};

const buildPageAlertColumnsQuery = (args: QueryArgs, entities: readonly Row[]): string[] => [
  ...buildPageOpenAlertsSteps(args, entities),
  ALERT_COLUMNS_STATS,
];

const buildResolvedPageAlertColumnsQuery = (
  args: QueryArgs,
  entities: readonly Row[]
): string[] => [
  ...buildPageOpenAlertsSteps(args, entities),
  ALERT_COLUMNS_STATS,
  ...buildAliasesToResolvedEntitySteps(args.concreteEntityIndexName, ALERT_AGGREGATIONS),
];

/** Open alerts in the window of the given entities, as rows of `entity.id`. */
const buildPageOpenAlertsSteps = (
  { namespace, timeRange }: QueryArgs,
  entities: readonly Row[]
): string[] => {
  const entityIds = getEntityIds(entities);
  return [
    `FROM ${getAlertsIndex(namespace)}`,
    `| WHERE \`@timestamp\` >= ${buildLookback(timeRange)}`,
    `| WHERE ${ALERT_OPEN_STATUS_FILTER}`,
    ...buildAlertEuidPipeline({
      stampedEntityIds: entityIds,
      ...buildUnstampedIdentityFilters(entities),
    }),
    `| WHERE \`entity.id\` IN (${toList(entityIds)})`,
  ];
};

const ALERT_COLUMNS_STATS = buildStatsByEntityClause(buildEntityAggregations(ALERT_AGGREGATIONS));

/** Every alert column of each row; 0 or null without alerts. */
const toAlertFields = (rows: readonly Row[], alertColumns: Row[]): EnrichedFields => {
  const byId = new Map(alertColumns.map((row) => [getEntityId(row), row]));
  return new Map(
    getEntityIds(rows).map((id) => {
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
};
