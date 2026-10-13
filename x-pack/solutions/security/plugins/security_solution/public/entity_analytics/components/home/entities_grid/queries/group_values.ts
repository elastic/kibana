/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { CriticalityLevels } from '../../../../../../common/entity_analytics/asset_criticality/constants';
import { RESOLVED_TO_FIELD, getEntityId, getEntityIds } from '../common';
import type { QueryArgs, Row } from '../common';
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

/**
 * The group values of the groups with aliases among `targetIds`: criticality (the highest of
 * the members), sources and watchlists (the distinct values), first seen (the earliest) and
 * last seen (the latest). One row per group, under the entity field names, so the page rows
 * take them as they are. The aliases are read first, then the main entity's own values are
 * joined in, which also drops the groups whose main entity is missing, as the group size does.
 */
export const buildGroupValuesQuery = (
  { namespace, concreteEntityIndexName }: Pick<QueryArgs, 'namespace' | 'concreteEntityIndexName'>,
  targetIds: readonly string[]
): string =>
  [
    `FROM ${getEntityAlias(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IN (${toList(targetIds)})`,
    `| EVAL rank = ${buildCriticalityRankExpression(CRITICALITY_FIELD)}`,
    `| STATS alias_rank = MAX(rank), alias_sources = VALUES(${SOURCE_FIELD}), alias_watchlists = VALUES(${WATCHLISTS_FIELD}), alias_first_seen = MIN(${FIRST_SEEN_FIELD}), alias_last_seen = MAX(${LAST_SEEN_FIELD}) BY group_key = ${RESOLVED_TO_FIELD}`,
    '| RENAME group_key AS `entity.id`',
    buildLookupJoinClause(concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NULL`,
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
    `| KEEP \`entity.id\`, ${[
      CRITICALITY_FIELD,
      SOURCE_FIELD,
      WATCHLISTS_FIELD,
      FIRST_SEEN_FIELD,
      LAST_SEEN_FIELD,
    ].join(', ')}`,
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
