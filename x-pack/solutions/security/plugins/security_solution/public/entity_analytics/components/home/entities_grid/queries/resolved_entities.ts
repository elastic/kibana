/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { escapeStringValue } from '@kbn/esql-utils';
import { CriticalityLevels } from '../../../../../../common/entity_analytics/asset_criticality/constants';
import {
  CRITICALITY_FIELD,
  ENTITY_ID_FIELD,
  RESOLVED_TO_FIELD,
  getEntityId,
  getEntityIds,
} from '../common';
import type { QueryArgs, Row } from '../common';
import {
  ENTITY_TYPE_FILTER,
  ESQL_MAX_RESULT_ROWS,
  buildFilterClause,
  buildLookupJoinClause,
  buildRowFieldsSteps,
  buildStatsByEntityClause,
  fetchPerIdChunk,
  getEntityAlias,
  toList,
} from './esql';
import type { EntityAggregation } from './esql';
import { buildSearchedTargetsQuery } from './entities_in_view';
import type { EsqlRunner } from './types';

const SOURCE_FIELD = 'entity.source';
const WATCHLISTS_FIELD = 'entity.attributes.watchlists';
const FIRST_SEEN_FIELD = 'entity.lifecycle.first_seen';
const LAST_SEEN_FIELD = '`@timestamp`';

const GROUP_VALUE_FIELDS = [
  CRITICALITY_FIELD,
  SOURCE_FIELD,
  WATCHLISTS_FIELD,
  FIRST_SEEN_FIELD,
  LAST_SEEN_FIELD,
];

/** Criticality levels from the highest: a resolved entity shows the highest of its aliases. */
export const CRITICALITY_LEVELS = Object.values(CriticalityLevels);

const getCriticalityRank = (index: number): number => CRITICALITY_LEVELS.length - index;

const buildCriticalityRankExpression = (field: string): string =>
  `CASE(${CRITICALITY_LEVELS.map(
    (level, index) => `${field} == ${escapeStringValue(level)}, ${getCriticalityRank(index)}`
  ).join(', ')})`;

const buildCriticalityLevelExpression = (rankField: string): string =>
  `CASE(${CRITICALITY_LEVELS.map(
    (level, index) => `${rankField} == ${getCriticalityRank(index)}, ${escapeStringValue(level)}`
  ).join(', ')})`;

/** The sort rank of a criticality: extreme the highest, unassigned the lowest (0). */
export const getCriticalitySortRank = (level: unknown): number => {
  const index = CRITICALITY_LEVELS.findIndex((criticality) => criticality === level);
  return index === -1 ? 0 : getCriticalityRank(index);
};

/** `GREATEST` or `LEAST` of two values, either of which may be missing. */
const buildExtreme = (fn: 'GREATEST' | 'LEAST', a: string, b: string): string =>
  `${fn}(COALESCE(${a}, ${b}), COALESCE(${b}, ${a}))`;

/** The distinct values of two multi-value fields, either of which may be missing. */
const buildUnion = (a: string, b: string): string =>
  `MV_DEDUPE(COALESCE(MV_APPEND(${a}, ${b}), ${a}, ${b}))`;

/** Drops resolved entities whose main entity doc is missing. */
const buildResolvedEntitySteps = (concreteEntityIndexName: string): string[] => [
  buildLookupJoinClause(concreteEntityIndexName),
  `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NULL`,
];

const buildResolvedEntityAliasSteps = ({
  concreteEntityIndexName,
}: Pick<QueryArgs, 'concreteEntityIndexName'>): string[] => [
  `| EVAL rank = ${buildCriticalityRankExpression(CRITICALITY_FIELD)}`,
  `| STATS alias_rank = MAX(rank), alias_sources = VALUES(${SOURCE_FIELD}), alias_watchlists = VALUES(${WATCHLISTS_FIELD}), alias_first_seen = MIN(${FIRST_SEEN_FIELD}), alias_last_seen = MAX(${LAST_SEEN_FIELD}) BY group_key = ${RESOLVED_TO_FIELD}`,
  '| RENAME group_key AS `entity.id`',
  ...buildResolvedEntitySteps(concreteEntityIndexName),
];

/** Group values: highest criticality, all sources and watchlists, earliest first seen, latest last seen. */
const buildResolvedEntityValueSteps = (): string[] => [
  `| EVAL own_rank = ${buildCriticalityRankExpression(CRITICALITY_FIELD)}`,
  `| EVAL group_rank = ${buildExtreme('GREATEST', 'own_rank', 'alias_rank')}`,
  `| EVAL ${CRITICALITY_FIELD} = ${buildCriticalityLevelExpression(
    'group_rank'
  )}, ${SOURCE_FIELD} = ${buildUnion(
    SOURCE_FIELD,
    'alias_sources'
  )}, ${WATCHLISTS_FIELD} = ${buildUnion(
    WATCHLISTS_FIELD,
    'alias_watchlists'
  )}, ${FIRST_SEEN_FIELD} = ${buildExtreme(
    'LEAST',
    FIRST_SEEN_FIELD,
    'alias_first_seen'
  )}, ${LAST_SEEN_FIELD} = ${buildExtreme('GREATEST', LAST_SEEN_FIELD, 'alias_last_seen')}`,
];

export const buildResolvedEntityRowSteps = (
  args: Pick<QueryArgs, 'concreteEntityIndexName'>
): string[] => [...buildResolvedEntityAliasSteps(args), ...buildResolvedEntityValueSteps()];

/** Under the entity field names, so the page rows take them as they are. */
const buildResolvedEntityValuesQuery = (
  args: Pick<QueryArgs, 'namespace' | 'concreteEntityIndexName'>,
  targetIds: readonly string[]
): string[] => [
  `FROM ${getEntityAlias(args.namespace)}`,
  `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IN (${toList(targetIds)})`,
  ...buildResolvedEntityRowSteps(args),
  `| KEEP \`entity.id\`, ${GROUP_VALUE_FIELDS.join(', ')}`,
  // One row per target; without a LIMIT, ES|QL returns only 1,000.
  `| LIMIT ${targetIds.length}`,
];

/** Rows whose main entity has aliases show the whole group's values. */
export const withResolvedEntityValues = async (
  rows: Row[],
  args: QueryArgs,
  runQuery: EsqlRunner
): Promise<Row[]> => {
  const ids = getEntityIds(rows);
  if (!ids.length) return rows;
  const groups = await fetchPerIdChunk(runQuery, ids, (chunk) =>
    buildResolvedEntityValuesQuery(args, chunk)
  );
  const valuesById = new Map(groups.map((group) => [getEntityId(group), group]));
  return rows.map((row) => {
    const values = valuesById.get(getEntityId(row));
    return values ? { ...row, ...values } : row;
  });
};

/** On resolved rows an alias's rows count for its resolved entity: counts add up (SUM), latest wins (MAX). */
export const buildRollUpOverAliasesSteps = (
  { rowsMode, concreteEntityIndexName }: Pick<QueryArgs, 'rowsMode' | 'concreteEntityIndexName'>,
  aggregations: readonly EntityAggregation[]
): string[] =>
  rowsMode === 'resolved'
    ? [
        buildLookupJoinClause(concreteEntityIndexName),
        `| EVAL \`entity.id\` = COALESCE(${RESOLVED_TO_FIELD}, \`entity.id\`)`,
        buildStatsByEntityClause(
          aggregations.map(({ field, resolvedEntity }) => `${field} = ${resolvedEntity}(${field})`)
        ),
      ]
    : [];

/** Overrides go in as id lists under the 1MB cap; the largest space has ~4k resolved entities (Oct 2026). */
/** Entity docs hold only own values, so resolved entities that pass differently are added or removed. */
export interface ResolvedEntityFilterOverrides {
  /** Resolved entities that pass, though their main entity does not. */
  include: readonly string[];
  /** Resolved entities that do not pass, though their main entity does. */
  exclude: readonly string[];
}

const MAX_RESOLVED_ENTITY_FILTER_OVERRIDES = 4_000;

/** Only filters on group-valued columns can pass a resolved entity differently from its main entity. */
export const isFilteringByGroupValue = ({
  rowsMode,
  entityExpression,
}: Pick<QueryArgs, 'rowsMode' | 'entityExpression'>): boolean =>
  rowsMode === 'resolved' &&
  !!entityExpression &&
  [CRITICALITY_FIELD, SOURCE_FIELD, WATCHLISTS_FIELD].some((field) =>
    entityExpression.includes(field)
  );

/** Resolved entities whose group passes the filters differently from their main entity alone. */
const buildResolvedEntityFilterOverridesQuery = (
  args: Required<Pick<QueryArgs, 'namespace' | 'concreteEntityIndexName' | 'entityExpression'>>
): string[] => [
  `FROM ${getEntityAlias(args.namespace)}`,
  `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
  ...buildResolvedEntityAliasSteps(args),
  `| EVAL own_matches = COALESCE(${args.entityExpression}, false)`,
  ...buildResolvedEntityValueSteps(),
  `| EVAL resolved_entity_matches = COALESCE(${args.entityExpression}, false)`,
  '| WHERE own_matches != resolved_entity_matches',
  '| KEEP `entity.id`, resolved_entity_matches',
  `| LIMIT ${MAX_RESOLVED_ENTITY_FILTER_OVERRIDES + 1}`,
];

const EMPTY_OVERRIDES: ResolvedEntityFilterOverrides = { include: [], exclude: [] };

export const fetchResolvedEntityFilterOverrides = async (
  args: Pick<QueryArgs, 'namespace' | 'concreteEntityIndexName' | 'entityExpression' | 'rowsMode'>,
  runQuery: EsqlRunner
): Promise<ResolvedEntityFilterOverrides> => {
  const { entityExpression } = args;
  if (!entityExpression || !isFilteringByGroupValue(args)) return EMPTY_OVERRIDES;
  const rows = await runQuery(
    buildResolvedEntityFilterOverridesQuery({ ...args, entityExpression })
  );
  if (rows.length > MAX_RESOLVED_ENTITY_FILTER_OVERRIDES) {
    throw new Error(
      'The filters match too many resolved entities differently from their main entity'
    );
  }
  const idsOf = (matches: boolean) =>
    rows
      .filter((row) => row.resolved_entity_matches === matches)
      .flatMap((row) => getEntityId(row) ?? []);
  return { include: idsOf(true), exclude: idsOf(false) };
};

/** Entity docs hold own values, so the filters add or drop the resolved entities that pass differently. */
export const applyResolvedEntityFilterOverrides = (
  expression: string,
  { include = [], exclude = [] }: Partial<ResolvedEntityFilterOverrides> = {}
): string => {
  const passing = exclude.length
    ? `(${expression}) AND NOT ${ENTITY_ID_FIELD} IN (${toList(exclude)})`
    : expression;
  return include.length ? `(${passing}) OR ${ENTITY_ID_FIELD} IN (${toList(include)})` : passing;
};

/** The DSL form of `applyResolvedEntityFilterOverrides`, for the reads that run on DSL. */
export const applyResolvedEntityFilterOverridesToQuery = (
  filters: QueryDslQueryContainer[],
  { include = [], exclude = [] }: Partial<ResolvedEntityFilterOverrides> = {}
): QueryDslQueryContainer[] => {
  if (!include.length && !exclude.length) return filters;
  const passing: QueryDslQueryContainer = {
    bool: {
      filter: filters,
      ...(exclude.length ? { must_not: [{ terms: { [ENTITY_ID_FIELD]: [...exclude] } }] } : {}),
    },
  };
  return include.length
    ? [
        {
          bool: {
            should: [passing, { terms: { [ENTITY_ID_FIELD]: [...include] } }],
            minimum_should_match: 1,
          },
        },
      ]
    : [passing];
};

/** How many resolved entities a value of a group-valued field gains (positive) or loses (negative). */
export interface ResolvedEntityValueChange {
  field: string;
  value: string | null;
  change: number;
}

const VALUE_CHANGE_FIELDS = [
  [CRITICALITY_FIELD, 'own_criticality'],
  [SOURCE_FIELD, 'own_sources'],
  [WATCHLISTS_FIELD, 'own_watchlists'],
] as const;

/** Each value counted once per group showing it, and once less per main entity holding it itself. */
const buildResolvedEntityCountsChangesQuery = (
  args: Pick<QueryArgs, 'namespace' | 'concreteEntityIndexName'>,
  targetIds?: readonly string[]
): string[] => [
  `FROM ${getEntityAlias(args.namespace)}`,
  `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
  ...buildFilterClause(targetIds && `${RESOLVED_TO_FIELD} IN (${toList(targetIds)})`),
  ...buildResolvedEntityAliasSteps(args),
  // The value steps write the group's values over the main entity's own, so these are kept first.
  `| EVAL ${VALUE_CHANGE_FIELDS.map(([field, own]) => `${own} = ${field}`).join(', ')}`,
  ...buildResolvedEntityValueSteps(),
  `| FORK ${VALUE_CHANGE_FIELDS.flatMap(([field, own]) => [
    `(STATS n = COUNT(*) BY change_value = ${field} | EVAL change_field = "${field}", change = n)`,
    `(STATS n = COUNT(*) BY change_value = ${own} | EVAL change_field = "${field}", change = -n)`,
  ]).join(' ')}`,
  '| KEEP change_field, change_value, change',
  `| LIMIT ${ESQL_MAX_RESULT_ROWS}`,
];

/** The resolved entities whose main entity the search matches: KQL can't run after their join. */
const fetchSearchedResolvedEntityIds = async (
  args: Pick<QueryArgs, 'namespace' | 'searchExpression'>,
  runQuery: EsqlRunner
): Promise<string[]> => {
  const resolvedEntityIds = getEntityIds(
    await runQuery([
      `FROM ${getEntityAlias(args.namespace)}`,
      `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
      `| STATS BY \`${ENTITY_ID_FIELD}\` = ${RESOLVED_TO_FIELD}`,
      `| LIMIT ${ESQL_MAX_RESULT_ROWS}`,
    ])
  );
  if (resolvedEntityIds.length === ESQL_MAX_RESULT_ROWS) {
    throw new Error('Too many groups of entities to count with a search');
  }
  return getEntityIds(
    await fetchPerIdChunk(runQuery, resolvedEntityIds, (ids) =>
      buildSearchedTargetsQuery({ ...args, rowsMode: 'resolved' }, ids)
    )
  );
};

/** Entity docs hold own values, so counts by a group-valued field change for the resolved entities. */
export const fetchResolvedEntityValueChanges = async (
  args: Pick<QueryArgs, 'namespace' | 'concreteEntityIndexName' | 'searchExpression'>,
  runQuery: EsqlRunner
): Promise<ResolvedEntityValueChange[]> => {
  const rows = args.searchExpression
    ? await fetchPerIdChunk(runQuery, await fetchSearchedResolvedEntityIds(args, runQuery), (ids) =>
        buildResolvedEntityCountsChangesQuery(args, ids)
      )
    : await runQuery(buildResolvedEntityCountsChangesQuery(args));
  return rows.map((row) => ({
    field: String(row.change_field),
    value: typeof row.change_value === 'string' ? row.change_value : null,
    change: Number(row.change),
  }));
};

/** Aliases' data counts for their resolved entity, so reads of other data need the aliases too. */
export const withEntityAliases = async (
  rows: readonly Row[],
  args: QueryArgs,
  runQuery: EsqlRunner
): Promise<readonly Row[]> => {
  const ids = getEntityIds(rows);
  if (!ids.length) return rows;
  const aliases: Row[] = [];
  let page: Row[];
  // A response holds at most ESQL_MAX_RESULT_ROWS rows, so a large group's aliases come in pages.
  do {
    const afterId = aliases.length ? getEntityId(aliases[aliases.length - 1]) : undefined;
    page = await runQuery([
      `FROM ${getEntityAlias(args.namespace)}`,
      `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IN (${toList(ids)})`,
      ...buildFilterClause(afterId && `${ENTITY_ID_FIELD} > ${escapeStringValue(afterId)}`),
      `| SORT ${ENTITY_ID_FIELD} ASC`,
      `| LIMIT ${ESQL_MAX_RESULT_ROWS}`,
      ...buildRowFieldsSteps(args),
    ]);
    aliases.push(...page);
  } while (page.length === ESQL_MAX_RESULT_ROWS);
  return [...rows, ...aliases];
};

const mergeValues = (
  aggregation: EntityAggregation['resolvedEntity'],
  a: unknown,
  b: unknown
): unknown => {
  if (a == null) return b;
  if (b == null) return a;
  if (aggregation === 'SUM') return Number(a) + Number(b);
  // Latest-wins values are numbers, or ISO dates, which compare in order as strings.
  if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
  return String(a) > String(b) ? a : b;
};

/**
 * A group read in several queries comes back as a row per query; this merges them the way
 * `buildRollUpOverAliasesSteps` merges aliases, so reads can split a group across queries.
 */
export const getMergedRowsByEntity = (
  rows: readonly Row[],
  aggregations: readonly EntityAggregation[]
): Row[] => {
  const mergeRows = (a: Row, b: Row): Row => ({
    ...a,
    ...Object.fromEntries(
      aggregations.map(({ field, resolvedEntity }) => [
        field,
        mergeValues(resolvedEntity, a[field], b[field]),
      ])
    ),
  });
  const byId = new Map<string, Row>();
  for (const row of rows) {
    const id = getEntityId(row);
    if (id != null) {
      const merged = byId.get(id);
      byId.set(id, merged ? mergeRows(merged, row) : row);
    }
  }
  return [...byId.values()];
};
