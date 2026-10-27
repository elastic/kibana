/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEVERITY_COUNT_FIELDS, getEntityId, getEntityIds } from '../common';
import type { QueryArgs, Row } from '../common';
import {
  IN_VIEW_AGGREGATION,
  IN_VIEW_FIELD,
  buildEntitiesInViewConditions,
} from './entities_in_view';
import {
  buildEntityAggregations,
  buildJoinedPageSteps,
  buildLookback,
  buildStatsByEntityClause,
  getAlertsIndex,
  getEntityAlias,
  SET_UNMAPPED_NULLIFY,
  toList,
  type EntityAggregation,
  fetchInChunks,
} from './esql';
import {
  buildAlertEntityFilter,
  buildAlertEuidPipeline,
  buildAlertForkSteps,
  buildStampedAlertBranch,
  buildUnstampedAlertBranch,
} from './euid_pipeline';
import {
  buildRollUpOverAliasesSteps,
  getMergedRowsByEntity,
  withEntityAliases,
} from './resolved_entities';
import type { ColumnQuerySpec, EnrichedFields, SortPageContext } from './types';
import { buildSortWithValueSteps, getComputedColumnQuerySpec } from './computed_column';
import type { ComputedColumn } from './computed_column';

const ALERT_COUNT_FIELD = 'alert_count';
const LAST_SEEN_ALERT_FIELD = 'last_seen_alert';

/** Keeps the alerts that are not closed. The alert based tiles count the same alerts. */
export const ALERT_OPEN_STATUS_FILTER =
  'kibana.alert.workflow_status IS NULL OR kibana.alert.workflow_status != "closed"';

const buildOpenAlertsCondition = (timeRange: QueryArgs['timeRange']): string =>
  `\`@timestamp\` >= ${buildLookback(timeRange)} AND (${ALERT_OPEN_STATUS_FILTER})`;

/** Entities without alerts aren't in the alerts query; null sorts them last both ways, as anomalies. */
const ALERT_EMPTY_VALUES: Readonly<Record<string, null>> = Object.fromEntries(
  [LAST_SEEN_ALERT_FIELD, ALERT_COUNT_FIELD, ...Object.values(SEVERITY_COUNT_FIELDS)].map(
    (field) => [field, null]
  )
);

const ALERT_FIELDS = Object.keys(ALERT_EMPTY_VALUES);

/** `resolvedEntity` says how an alias's alerts fold into its resolved entity's: counts add up, latest wins. */
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

/** Only entities with alerts; filters are on entity fields, so they apply after the join. */
const buildAlertSortWithValueQuery = (args: QueryArgs, limit: number): string[] => [
  SET_UNMAPPED_NULLIFY,
  `FROM ${getAlertsIndex(args.namespace)}`,
  `| WHERE ${buildOpenAlertsCondition(args.timeRange)}`,
  ...buildAlertEuidPipeline(),
  ALERT_COLUMNS_STATS,
  ...buildRollUpOverAliasesSteps(args, ALERT_AGGREGATIONS),
  ...buildSortWithValueSteps(args, args.sort.field, limit, ALERT_FIELDS),
];

/** Every entity in view in one slow query; alerts and entity docs share the FROM since FORK can't nest. */
export const buildAlertSortAllQuery = (args: QueryArgs): string[] => {
  const isEntityDoc = `_index == "${args.concreteEntityIndexName}"`;
  const isAlert = `NOT ${isEntityDoc}`;
  const isEntityInView = [
    isEntityDoc,
    ...buildEntitiesInViewConditions(args).map((condition) => `(${condition})`),
  ].join(' AND ');
  const entityDocsBranch = [
    `WHERE ${isEntityDoc}`,
    `| EVAL _ea_entity_id = \`entity.id\`, ${IN_VIEW_FIELD} = 1`,
    `| KEEP _ea_entity_id, ${IN_VIEW_FIELD}`,
  ];

  return [
    SET_UNMAPPED_NULLIFY,
    // 1. Open alerts and the entity docs in view.
    `FROM ${getAlertsIndex(args.namespace)}, ${getEntityAlias(args.namespace)} METADATA _index`,
    `| WHERE (${isAlert} AND ${buildOpenAlertsCondition(args.timeRange)}) OR (${isEntityInView})`,
    // 2. Each row to its entity: alerts by EUID, entity docs as themselves, marked in view.
    ...buildAlertForkSteps([
      buildStampedAlertBranch(),
      buildUnstampedAlertBranch({ guard: isAlert }),
      entityDocsBranch,
    ]),
    // 3. Per entity: its alert counts (entity docs don't count) and whether it's in view.
    buildStatsByEntityClause([
      ...buildEntityAggregations(ALERT_AGGREGATIONS, `${IN_VIEW_FIELD} IS NULL`),
      ...buildEntityAggregations([IN_VIEW_AGGREGATION]),
    ]),
    // 4. Aliases count for their resolved entity; then only entities in view.
    ...buildRollUpOverAliasesSteps(args, [...ALERT_AGGREGATIONS, IN_VIEW_AGGREGATION]),
    `| WHERE ${IN_VIEW_FIELD} == 1`,
    // 5. Entities without alerts count 0 here, but null in every other read, which sorts them last.
    `| EVAL ${[...Object.values(SEVERITY_COUNT_FIELDS), ALERT_COUNT_FIELD]
      .map((field) => `${field} = CASE(${ALERT_COUNT_FIELD} > 0, ${field})`)
      .join(', ')}`,
    ...buildJoinedPageSteps(args, args.sort.field, ALERT_FIELDS),
  ];
};

/** ES|QL fails past ~300 nested ORs, and each entity adds one. */
const MAX_ENTITIES_PER_ALERTS_QUERY = 250;

const buildOpenAlertsOfSteps = (
  { namespace, timeRange }: QueryArgs,
  entities: readonly Row[]
): string[] => {
  const entityIds = getEntityIds(entities);
  return [
    SET_UNMAPPED_NULLIFY,
    `FROM ${getAlertsIndex(namespace)}`,
    `| WHERE ${buildOpenAlertsCondition(timeRange)}`,
    ...buildAlertEuidPipeline(buildAlertEntityFilter(entities)),
    // An alert can name several entities; drop the rows of the others.
    `| WHERE \`entity.id\` IN (${toList(entityIds)})`,
  ];
};

/** Rows without alerts get the empty values, so their cells show none instead of loading. */
const toAlertFields = (rows: readonly Row[], alertColumns: Row[]): EnrichedFields => {
  const byId = new Map(alertColumns.map((row) => [getEntityId(row), row]));
  return new Map(
    getEntityIds(rows).map((id) => {
      const alerts = byId.get(id);
      return [
        id,
        Object.fromEntries(
          Object.entries(ALERT_EMPTY_VALUES).map(([field, empty]) => [
            field,
            alerts?.[field] ?? empty,
          ])
        ),
      ];
    })
  );
};

/** Alerts of the given rows only; resolved rows count their aliases' alerts, so those are read first. */
const fetchAlertFields = async (
  rows: readonly Row[],
  args: QueryArgs,
  { runQuery }: SortPageContext
): Promise<EnrichedFields> => {
  if (!getEntityIds(rows).length) return new Map();
  const entities =
    args.rowsMode === 'resolved' ? await withEntityAliases(rows, args, runQuery) : rows;
  const alertColumns = await fetchInChunks(entities, MAX_ENTITIES_PER_ALERTS_QUERY, (part) =>
    runQuery([
      ...buildOpenAlertsOfSteps(args, part),
      ALERT_COLUMNS_STATS,
      ...buildRollUpOverAliasesSteps(args, ALERT_AGGREGATIONS),
    ])
  );
  return toAlertFields(rows, getMergedRowsByEntity(alertColumns.flat(), ALERT_AGGREGATIONS));
};

/** One alerts query gives both alert count and last alert, so they share one column. */
const alertsColumn: ComputedColumn = {
  emptyValues: ALERT_EMPTY_VALUES,
  buildSortAllQuery: buildAlertSortAllQuery,
  buildSortWithValueQuery: buildAlertSortWithValueQuery,
  fetchValues: fetchAlertFields,
};

const alertsQuerySpec = getComputedColumnQuerySpec(alertsColumn);

export const alertCountQuerySpec = alertsQuerySpec;

export const lastSeenAlertQuerySpec = {
  fetchSortPage: alertsQuerySpec.fetchSortPage,
} satisfies ColumnQuerySpec;
