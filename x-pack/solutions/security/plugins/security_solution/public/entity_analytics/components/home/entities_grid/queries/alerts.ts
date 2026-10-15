/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEuidEsqlFilterBasedOnDocument } from '@kbn/entity-store/common/domain/euid';
import {
  ALLOWED_ENTITY_TYPES,
  ENTITY_TYPE_FIELD,
  SEVERITY_COUNT_FIELDS,
  getEntityId,
  getEntityIds,
  isOneOf,
} from '../common';
import type { QueryArgs, Row } from '../common';
import {
  IN_VIEW_AGGREGATION,
  IN_VIEW_FIELD,
  buildEntitiesInViewConditions,
} from './entities_in_view';
import {
  buildAliasesToResolvedEntitySteps,
  buildEntityAggregations,
  buildIdentityPrefilter,
  buildJoinedPageSteps,
  buildLookback,
  buildStatsByEntityClause,
  getAlertsIndex,
  getEntityAlias,
  toList,
} from './esql';
import type { EntityAggregation } from './esql';
import { buildAlertEuidPipeline } from './euid_pipeline';
import { getPartsByResolvedEntity, withEntityAliases } from './resolved_entities';
import type { ColumnQuerySpec, EnrichedFields, SortPageContext } from './types';
import { fetchComputedColumnSortPage } from './computed_column';
import type { ComputedColumn } from './computed_column';

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

const ALERT_COLUMNS_STATS = buildStatsByEntityClause(buildEntityAggregations(ALERT_AGGREGATIONS));

const ALERT_EMPTY_COLUMNS = [
  ...ALERT_COUNT_FIELDS.map((field) => `${field} = TO_LONG(0)`),
  `${LAST_SEEN_ALERT_FIELD} = TO_DATETIME(null)`,
].join(', ');

// ── what the columns do ──────────────────────────────────────────────────────

/** A column sorted by one alert field; every alert field rides along. */
const getAlertColumn = (field: string, emptyValue: 0 | null): ComputedColumn => ({
  field,
  emptyValue,
  emptyColumns: ALERT_EMPTY_COLUMNS,
  columns: [field, ...ALERT_FIELDS],
  buildSourceRows: (args) => buildOpenAlertRowsSteps(args),
  aggregations: ALERT_AGGREGATIONS,
  rollsUpOverAliases: true,
  fetchValues: (rows, args, ctx) => fetchAlertFields(rows, args, ctx),
  buildMergedSortQuery: (args) => buildMergedAlertSortQuery(args, field),
});

// Entities without alerts count 0, so they sort first ascending; their last alert is null.
const alertCountColumn = getAlertColumn(ALERT_COUNT_FIELD, 0);
const lastSeenAlertColumn = getAlertColumn(LAST_SEEN_ALERT_FIELD, null);

export const alertCountQuerySpec = {
  fetchSortPage: (args, ctx) => fetchComputedColumnSortPage(alertCountColumn, args, ctx),
  enricher: {
    fields: ALERT_FIELDS,
    fetch: (rows, args, ctx) => fetchAlertFields(rows, args, ctx),
  },
} satisfies ColumnQuerySpec;

export const lastSeenAlertQuerySpec = {
  fetchSortPage: (args, ctx) => fetchComputedColumnSortPage(lastSeenAlertColumn, args, ctx),
  // No enricher: the alerts enricher of the alert count reads this field too.
} satisfies ColumnQuerySpec;

// ── source rows ──────────────────────────────────────────────────────────────

/** Open alerts in the time range, as rows of `entity.id`. */
const buildOpenAlertRowsSteps = ({ namespace, timeRange }: QueryArgs): string[] => [
  `FROM ${getAlertsIndex(namespace)}`,
  `| WHERE \`@timestamp\` >= ${buildLookback(timeRange)} AND (${ALERT_OPEN_STATUS_FILTER})`,
  ...buildAlertEuidPipeline(),
];

// ── a search that matches too many entities to look up ───────────────────────

/**
 * Every entity in view, sorted by an alert column, in one query. FORK, which maps alerts to
 * entities, can't run inside a FROM subquery, so the alerts and the entity docs share the FROM.
 */
const buildMergedAlertSortQuery = (args: QueryArgs, sortField: string): string[] => [
  `FROM ${getAlertsIndex(args.namespace)}, ${getEntityAlias(args.namespace)} METADATA _index`,
  `| WHERE (NOT ${isEntityDoc(args)} AND \`@timestamp\` >= ${buildLookback(
    args.timeRange
  )} AND (${ALERT_OPEN_STATUS_FILTER})) OR (${[
    isEntityDoc(args),
    ...buildEntitiesInViewConditions(args).map((condition) => `(${condition})`),
  ].join(' AND ')})`,
  ...buildAlertEuidPipeline({
    alertBranchCondition: `NOT ${isEntityDoc(args)}`,
    extraBranch: [
      `WHERE ${isEntityDoc(args)}`,
      `| EVAL _ea_entity_id = \`entity.id\`, ${IN_VIEW_FIELD} = 1`,
      `| KEEP _ea_entity_id, ${IN_VIEW_FIELD}`,
    ],
  }),
  buildStatsByEntityClause([
    ...buildEntityAggregations(ALERT_AGGREGATIONS, `${IN_VIEW_FIELD} IS NULL`),
    `${IN_VIEW_FIELD} = MAX(${IN_VIEW_FIELD})`,
  ]),
  ...(args.rowsMode === 'resolved'
    ? buildAliasesToResolvedEntitySteps(args.concreteEntityIndexName, [
        ...ALERT_AGGREGATIONS,
        IN_VIEW_AGGREGATION,
      ])
    : []),
  `| WHERE ${IN_VIEW_FIELD} == 1`,
  ...buildJoinedPageSteps(args, sortField, ALERT_FIELDS),
];

const isEntityDoc = ({ concreteEntityIndexName }: QueryArgs) =>
  `_index == "${concreteEntityIndexName}"`;

// ── values of given rows ─────────────────────────────────────────────────────

/**
 * Most entities in one alerts query: each entity adds terms to an OR of the query, and ES|QL
 * parses at most 300 levels of one expression.
 */
const MAX_ENTITIES_PER_ALERTS_QUERY = 250;

/** The alert columns of the rows; a resolved row's alerts include its aliases'. */
const fetchAlertFields = async (
  rows: readonly Row[],
  args: QueryArgs,
  { runQuery }: SortPageContext
): Promise<EnrichedFields> => {
  if (!getEntityIds(rows).length) return new Map();
  const isResolved = args.rowsMode === 'resolved';
  const entities = isResolved ? await withEntityAliases(rows, args, runQuery) : rows;
  // A resolved entity and its aliases go in one part, which counts their alerts together.
  const parts = getPartsByResolvedEntity(entities, MAX_ENTITIES_PER_ALERTS_QUERY);
  const alertColumns = await Promise.all(
    parts.map((part) =>
      runQuery([
        ...buildOpenAlertsOfSteps(args, part),
        ALERT_COLUMNS_STATS,
        ...(isResolved
          ? buildAliasesToResolvedEntitySteps(args.concreteEntityIndexName, ALERT_AGGREGATIONS)
          : []),
      ])
    )
  );
  return toAlertFields(rows, alertColumns.flat());
};

/** Open alerts in the window of the given entities, as rows of `entity.id`. */
const buildOpenAlertsOfSteps = (
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

const isAllowedEntityType = (type: unknown): type is (typeof ALLOWED_ENTITY_TYPES)[number] =>
  isOneOf(ALLOWED_ENTITY_TYPES, type);

/**
 * Filters the unstamped alerts to those of the rows: an OR of per-row EUID clauses and its
 * pushable prefilter. Rows without a clause are left out, so the filter never widens to all
 * unstamped alerts.
 */
const buildUnstampedIdentityFilters = (rows: readonly Row[]) => {
  const clauses = new Set<string>();
  const matchedRows: Row[] = [];
  for (const row of rows) {
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
