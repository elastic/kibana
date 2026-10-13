/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { CriticalityLevels } from '../../../../../../common/entity_analytics/asset_criticality/constants';
import { ENTITY_ID_FIELD, RESOLVED_TO_FIELD, getEntityId, getEntityIds } from '../common';
import type { ResolvedEntityFilterOverrides, QueryArgs, Row } from '../common';
import {
  ENTITY_TYPE_FILTER,
  buildResolvedEntitySteps,
  fetchPerIdChunk,
  getEntityAlias,
  toList,
} from './esql';
import type { EsqlRunner } from './types';

// A resolved row is a resolved entity: the main entity that other entities, its aliases, resolve to.
// The columns below show the value over the resolved entity and its aliases together. Most entities
// have no aliases and keep their own values, so only the resolved entities with aliases are read here.

const CRITICALITY_FIELD = 'asset.criticality';
const SOURCE_FIELD = 'entity.source';
const WATCHLISTS_FIELD = 'entity.attributes.watchlists';
const FIRST_SEEN_FIELD = 'entity.lifecycle.first_seen';
const LAST_SEEN_FIELD = '`@timestamp`';

const RESOLVED_ENTITY_VALUE_FIELDS = [
  CRITICALITY_FIELD,
  SOURCE_FIELD,
  WATCHLISTS_FIELD,
  FIRST_SEEN_FIELD,
  LAST_SEEN_FIELD,
];

/** Criticality levels from the highest: a resolved entity shows the highest of its aliases. */
const CRITICALITY_LEVELS = Object.values(CriticalityLevels);

const getCriticalityRank = (index: number): number => CRITICALITY_LEVELS.length - index;

const buildCriticalityRankExpression = (field: string): string =>
  `CASE(${CRITICALITY_LEVELS.map(
    (level, index) => `${field} == ${escapeStringValue(level)}, ${getCriticalityRank(index)}`
  ).join(', ')})`;

const buildCriticalityLevelExpression = (rankField: string): string =>
  `CASE(${CRITICALITY_LEVELS.map(
    (level, index) => `${rankField} == ${getCriticalityRank(index)}, ${escapeStringValue(level)}`
  ).join(', ')})`;

/** `GREATEST` or `LEAST` of two values, either of which may be missing. */
const buildExtreme = (fn: 'GREATEST' | 'LEAST', a: string, b: string): string =>
  `${fn}(COALESCE(${a}, ${b}), COALESCE(${b}, ${a}))`;

/** The distinct values of two multi-value fields, either of which may be missing. */
const buildUnion = (a: string, b: string): string =>
  `MV_DEDUPE(COALESCE(MV_APPEND(${a}, ${b}), ${a}, ${b}))`;

/** The aliases of each resolved entity, with the main entity's own values joined in. */
const buildResolvedEntityAliasSteps = ({
  concreteEntityIndexName,
}: Pick<QueryArgs, 'concreteEntityIndexName'>): string[] => [
  `| EVAL rank = ${buildCriticalityRankExpression(CRITICALITY_FIELD)}`,
  `| STATS alias_rank = MAX(rank), alias_sources = VALUES(${SOURCE_FIELD}), alias_watchlists = VALUES(${WATCHLISTS_FIELD}), alias_first_seen = MIN(${FIRST_SEEN_FIELD}), alias_last_seen = MAX(${LAST_SEEN_FIELD}) BY group_key = ${RESOLVED_TO_FIELD}`,
  '| RENAME group_key AS `entity.id`',
  ...buildResolvedEntitySteps(concreteEntityIndexName),
];

/**
 * The resolved entity values: criticality (the highest of the aliases), sources and watchlists (the
 * distinct values), first seen (the earliest) and last seen (the latest), under the entity
 * field names, over the main entity's own values and those of its aliases.
 */
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

/** The columns that show the resolved entity's value and sort: their sort has to see the resolved entities. */
export const RESOLVED_ENTITY_VALUE_SORT_FIELDS: readonly string[] = [
  CRITICALITY_FIELD,
  FIRST_SEEN_FIELD,
  '@timestamp',
];

/** The resolved entities with aliases as rows: the alias docs per resolved entity, with the resolved entity values over them. */
export const buildResolvedEntityRowSteps = (
  args: Pick<QueryArgs, 'concreteEntityIndexName'>
): string[] => [...buildResolvedEntityAliasSteps(args), ...buildResolvedEntityValueSteps()];

/**
 * One row per resolved entity with aliases among `targetIds`, with its resolved entity values under the entity
 * field names, so the page rows take them as they are.
 */
export const buildResolvedEntityValuesQuery = (
  args: Pick<QueryArgs, 'namespace' | 'concreteEntityIndexName'>,
  targetIds: readonly string[]
): string =>
  [
    `FROM ${getEntityAlias(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IN (${toList(targetIds)})`,
    ...buildResolvedEntityRowSteps(args),
    `| KEEP \`entity.id\`, ${RESOLVED_ENTITY_VALUE_FIELDS.join(', ')}`,
  ].join('\n');

/**
 * The resolved rows with their resolved entities' values: a row whose main entity has aliases takes the
 * values of the whole group, the others keep their own. Individual rows are the entities
 * themselves, so they are returned as they are.
 */
export const withResolvedEntityValues = async (
  rows: Row[],
  args: QueryArgs,
  runQuery: EsqlRunner
): Promise<Row[]> => {
  const ids = getEntityIds(rows);
  if (args.rowsMode !== 'resolved' || !ids.length) return rows;
  const groups = await fetchPerIdChunk(runQuery, ids, (chunk) =>
    buildResolvedEntityValuesQuery(args, chunk)
  );
  const valuesById = new Map(groups.map((group) => [getEntityId(group), group]));
  return rows.map((row) => {
    const values = valuesById.get(getEntityId(row));
    return values ? { ...row, ...values } : row;
  });
};

// ── filters on the resolved entity values ───────────────────────────────────────────────

/**
 * Most resolved entities the filters on the resolved entity values may add or remove.
 *
 * Why: the resolved entities go into the entity filter as id lists, and an ES|QL statement is capped at
 * 1MB (ids run to about 100 characters). 4,000 ids is about 400KB. Telemetry (Oct 2026): the
 * largest space has about 4,000 resolved entities with aliases, and only a part of them can differ.
 */
const MAX_RESOLVED_ENTITY_FILTER_OVERRIDES = 4_000;

/**
 * Whether the entity filters test a column that shows the resolved entity's value: only then can
 * a resolved entity pass them differently from its main entity.
 */
export const needsResolvedEntityFilterOverrides = ({
  rowsMode,
  entityExpression,
}: Pick<QueryArgs, 'rowsMode' | 'entityExpression'>): boolean =>
  rowsMode === 'resolved' &&
  !!entityExpression &&
  [CRITICALITY_FIELD, SOURCE_FIELD, WATCHLISTS_FIELD].some((field) =>
    entityExpression.includes(field)
  );

/**
 * The resolved entities with aliases that pass the entity filters differently from their main
 * entity: `resolved_entity_matches` is whether the resolved entity passes, where `own_matches` of
 * the main entity is the opposite. Every other resolved entity passes as its main entity does.
 */
export const buildResolvedEntityFilterOverridesQuery = (
  args: Required<Pick<QueryArgs, 'namespace' | 'concreteEntityIndexName' | 'entityExpression'>>
): string =>
  [
    `FROM ${getEntityAlias(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
    ...buildResolvedEntityAliasSteps(args),
    `| EVAL own_matches = COALESCE(${args.entityExpression}, false)`,
    ...buildResolvedEntityValueSteps(),
    `| EVAL resolved_entity_matches = COALESCE(${args.entityExpression}, false)`,
    '| WHERE own_matches != resolved_entity_matches',
    '| KEEP `entity.id`, resolved_entity_matches',
    `| LIMIT ${MAX_RESOLVED_ENTITY_FILTER_OVERRIDES + 1}`,
  ].join('\n');

const EMPTY_OVERRIDES: ResolvedEntityFilterOverrides = { include: [], exclude: [] };

/** Reads the overrides of the entity filters; none when they don't test the resolved entity's values. */
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

/**
 * The entity filters as one predicate on the entity docs, which hold the own values: the
 * entities that pass on their own, without the resolved entities that do not, with the resolved
 * entities that do. Individual rows have no overrides.
 */
export const applyResolvedEntityFilterOverrides = (
  expression: string,
  { include = [], exclude = [] }: Partial<ResolvedEntityFilterOverrides> = {}
): string => {
  const passing = exclude.length
    ? `(${expression}) AND NOT ${ENTITY_ID_FIELD} IN (${toList(exclude)})`
    : expression;
  return include.length ? `(${passing}) OR ${ENTITY_ID_FIELD} IN (${toList(include)})` : passing;
};
