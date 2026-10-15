/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { CriticalityLevels } from '../../../../../../common/entity_analytics/asset_criticality/constants';
import {
  CRITICALITY_FIELD,
  ENTITY_ID_FIELD,
  RESOLVED_TO_FIELD,
  getEntityId,
  getEntityIds,
  getString,
} from '../common';
import type { QueryArgs, Row } from '../common';
import {
  ENTITY_TYPE_FILTER,
  ID_LIST_CHUNK_SIZE,
  buildLookupJoinClause,
  buildRowFieldsSteps,
  buildStatsByEntityClause,
  fetchPerIdChunk,
  getEntityAlias,
  toList,
} from './esql';
import type { EntityAggregation } from './esql';
import type { EsqlRunner } from './types';

const SOURCE_FIELD = 'entity.source';
const WATCHLISTS_FIELD = 'entity.attributes.watchlists';
const FIRST_SEEN_FIELD = 'entity.lifecycle.first_seen';
const LAST_SEEN_FIELD = '`@timestamp`';

/** The resolved entity values a grid column sorts by, under their column ids. */
export const SORTABLE_RESOLVED_ENTITY_FIELDS: readonly string[] = [
  CRITICALITY_FIELD,
  FIRST_SEEN_FIELD,
  '@timestamp',
];

const RESOLVED_ENTITY_VALUE_FIELDS = [
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
  `| KEEP \`entity.id\`, ${RESOLVED_ENTITY_VALUE_FIELDS.join(', ')}`,
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
export const needsResolvedEntityFilterOverrides = ({
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
  args: QueryArgs,
  runQuery: EsqlRunner
): Promise<ResolvedEntityFilterOverrides> => {
  const { entityExpression } = args;
  if (!entityExpression || !needsResolvedEntityFilterOverrides(args)) return EMPTY_OVERRIDES;
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

/** Aliases' data counts for their resolved entity, so reads of other data need the aliases too. */
export const withEntityAliases = async (
  rows: readonly Row[],
  args: QueryArgs,
  runQuery: EsqlRunner
): Promise<readonly Row[]> => {
  const ids = getEntityIds(rows);
  if (!ids.length) return rows;
  const aliases = await runQuery([
    `FROM ${getEntityAlias(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IN (${toList(ids)})`,
    ...buildRowFieldsSteps(args),
    `| LIMIT ${ID_LIST_CHUNK_SIZE + 1}`,
  ]);
  // The ids and identities of the aliases go into the query of the read, which has a size limit.
  if (aliases.length > ID_LIST_CHUNK_SIZE) {
    throw new Error(
      'The resolved entities of this page have too many aliases to read their columns'
    );
  }
  return [...rows, ...aliases];
};

/** A resolved entity and its aliases must share a query to be aggregated together. */
export const getPartsByResolvedEntity = (rows: readonly Row[], maxRows: number): Row[][] => {
  const byResolvedEntity = new Map<string, Row[]>();
  rows.forEach((row) => {
    const key = getString(row, RESOLVED_TO_FIELD) ?? getEntityId(row) ?? '';
    byResolvedEntity.set(key, [...(byResolvedEntity.get(key) ?? []), row]);
  });
  const parts: Row[][] = [];
  let part: Row[] = [];
  for (const group of byResolvedEntity.values()) {
    if (group.length > maxRows) {
      throw new Error('A resolved entity has too many aliases to read its columns');
    }
    if (part.length + group.length > maxRows) {
      parts.push(part);
      part = [];
    }
    part = [...part, ...group];
  }
  return part.length ? [...parts, part] : parts;
};
