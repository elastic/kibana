/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { CriticalityLevels } from '../../../../../../common/entity_analytics/asset_criticality/constants';
import { ENTITY_ID_FIELD, RESOLVED_TO_FIELD, getEntityId, getEntityIds } from '../common';
import type { GroupValueCorrections, QueryArgs, Row } from '../common';
import {
  ENTITY_TYPE_FILTER,
  buildLookupJoinClause,
  fetchPerIdChunk,
  getEntityAlias,
  toList,
} from './esql';
import type { EsqlRunner } from './types';

// A resolved row is a group: its main entity and the entities resolved to it. The columns
// below show the group's value, from all of its members. Most entities are alone in their
// group and keep their own values, so only the groups with aliases are read here.

const CRITICALITY_FIELD = 'asset.criticality';
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

/** Criticality levels from the highest: a group shows the highest of its members. */
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

/** The aliases of each group read per group, with the main entity's own values joined in. */
const buildAliasGroupSteps = ({
  concreteEntityIndexName,
}: Pick<QueryArgs, 'concreteEntityIndexName'>): string[] => [
  `| EVAL rank = ${buildCriticalityRankExpression(CRITICALITY_FIELD)}`,
  `| STATS alias_rank = MAX(rank), alias_sources = VALUES(${SOURCE_FIELD}), alias_watchlists = VALUES(${WATCHLISTS_FIELD}), alias_first_seen = MIN(${FIRST_SEEN_FIELD}), alias_last_seen = MAX(${LAST_SEEN_FIELD}) BY group_key = ${RESOLVED_TO_FIELD}`,
  '| RENAME group_key AS `entity.id`',
  buildLookupJoinClause(concreteEntityIndexName),
  // Drops the groups whose main entity is missing, as the group size does.
  `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NULL`,
];

/**
 * The group values: criticality (the highest of the members), sources and watchlists (the
 * distinct values), first seen (the earliest) and last seen (the latest), under the entity
 * field names, over the main entity's own values and those of its aliases.
 */
const buildGroupValueSteps = (): string[] => [
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

/** The columns that show the group's value and sort: their sort has to see the groups. */
export const GROUP_VALUE_SORT_FIELDS: readonly string[] = [
  CRITICALITY_FIELD,
  FIRST_SEEN_FIELD,
  '@timestamp',
];

/** The groups with aliases as rows: the alias docs per group, with the group values over them. */
export const buildGroupRowSteps = (args: Pick<QueryArgs, 'concreteEntityIndexName'>): string[] => [
  ...buildAliasGroupSteps(args),
  ...buildGroupValueSteps(),
];

/**
 * One row per group with aliases among `targetIds`, with its group values under the entity
 * field names, so the page rows take them as they are.
 */
export const buildGroupValuesQuery = (
  args: Pick<QueryArgs, 'namespace' | 'concreteEntityIndexName'>,
  targetIds: readonly string[]
): string =>
  [
    `FROM ${getEntityAlias(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IN (${toList(targetIds)})`,
    ...buildGroupRowSteps(args),
    `| KEEP \`entity.id\`, ${GROUP_VALUE_FIELDS.join(', ')}`,
  ].join('\n');

/**
 * The resolved rows with their groups' values: a row whose main entity has aliases takes the
 * values of the whole group, the others keep their own. Individual rows are the entities
 * themselves, so they are returned as they are.
 */
export const withGroupValues = async (
  rows: Row[],
  args: QueryArgs,
  runQuery: EsqlRunner
): Promise<Row[]> => {
  const ids = getEntityIds(rows);
  if (args.rowsMode !== 'resolved' || !ids.length) return rows;
  const groups = await fetchPerIdChunk(runQuery, ids, (chunk) =>
    buildGroupValuesQuery(args, chunk)
  );
  const valuesById = new Map(groups.map((group) => [getEntityId(group), group]));
  return rows.map((row) => {
    const values = valuesById.get(getEntityId(row));
    return values ? { ...row, ...values } : row;
  });
};

// ── filters on the group values ───────────────────────────────────────────────

/**
 * Most groups the filters on the group values may add or remove.
 *
 * Why: the groups go into the entity filter as id lists, and an ES|QL statement is capped at
 * 1MB (ids run to about 100 characters). 4,000 ids is about 400KB. Telemetry (Oct 2026): the
 * largest space has about 4,000 groups with aliases, and only a part of them can differ.
 */
const MAX_GROUP_VALUE_CORRECTIONS = 4_000;

/**
 * The groups with aliases that pass `groupValueExpression` differently from their main entity:
 * `group_matches` is whether the group passes, where `own_matches` of the main entity is the
 * opposite. Every other group passes as its main entity does.
 */
export const buildGroupValueCorrectionsQuery = (
  args: Required<Pick<QueryArgs, 'namespace' | 'concreteEntityIndexName' | 'groupValueExpression'>>
): string =>
  [
    `FROM ${getEntityAlias(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
    ...buildAliasGroupSteps(args),
    `| EVAL own_matches = COALESCE(${args.groupValueExpression}, false)`,
    ...buildGroupValueSteps(),
    `| EVAL group_matches = COALESCE(${args.groupValueExpression}, false)`,
    '| WHERE own_matches != group_matches',
    '| KEEP `entity.id`, group_matches',
    `| LIMIT ${MAX_GROUP_VALUE_CORRECTIONS + 1}`,
  ].join('\n');

const EMPTY_CORRECTIONS: GroupValueCorrections = { include: [], exclude: [] };

/** Reads the corrections of the filters on the group values; none without such filters. */
export const fetchGroupValueCorrections = async (
  args: QueryArgs,
  runQuery: EsqlRunner
): Promise<GroupValueCorrections> => {
  const { groupValueExpression } = args;
  if (args.rowsMode !== 'resolved' || !groupValueExpression) return EMPTY_CORRECTIONS;
  const rows = await runQuery(buildGroupValueCorrectionsQuery({ ...args, groupValueExpression }));
  if (rows.length > MAX_GROUP_VALUE_CORRECTIONS) {
    throw new Error(
      'The filters match too many groups of entities differently from their main entity'
    );
  }
  const idsOf = (matches: boolean) =>
    rows.filter((row) => row.group_matches === matches).flatMap((row) => getEntityId(row) ?? []);
  return { include: idsOf(true), exclude: idsOf(false) };
};

/**
 * The filters on the group values as one predicate on the entity docs, which hold the own
 * values: the entities that pass on their own, without the groups that do not, with the groups
 * that do. `undefined` without such filters.
 */
export const buildGroupValueCondition = ({
  groupValueExpression,
  groupValueCorrections,
}: Pick<QueryArgs, 'groupValueExpression' | 'groupValueCorrections'>): string | undefined => {
  if (!groupValueExpression) return undefined;
  const { include = [], exclude = [] } = groupValueCorrections ?? {};
  const passing = exclude.length
    ? `(${groupValueExpression}) AND NOT ${ENTITY_ID_FIELD} IN (${toList(exclude)})`
    : `(${groupValueExpression})`;
  return include.length ? `(${passing}) OR ${ENTITY_ID_FIELD} IN (${toList(include)})` : passing;
};
