/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_ID_FIELD,
  GROUP_SIZE_FIELD,
  RESOLVED_TO_FIELD,
  getEntityIds,
  getNumber,
  getString,
} from '../common';
import type { QueryArgs, Row } from '../common';
import { IN_VIEW_AGGREGATION, IN_VIEW_FIELD, buildEntitiesInViewBranch } from './entities_in_view';
import {
  ENTITY_TYPE_FILTER,
  buildEntityAggregations,
  buildJoinedPageSteps,
  buildStatsByEntityClause,
  getEntityAlias,
  toList,
} from './esql';
import type { EnrichedFields, SortPageContext } from './types';
import { buildSortWithValueSteps, getComputedColumnQuerySpec } from './computed_column';
import type { ComputedColumn } from './computed_column';

const GROUP_KEY = `COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`;

const buildGroupSizeSortWithValueQuery = (args: QueryArgs, limit: number): string[] => [
  `FROM ${getEntityAlias(args.namespace)}`,
  `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
  `| EVAL \`entity.id\` = ${RESOLVED_TO_FIELD}`,
  `| STATS alias_count = COUNT(*) BY \`entity.id\``,
  `| EVAL ${GROUP_SIZE_FIELD} = alias_count + 1`,
  ...buildSortWithValueSteps(args, GROUP_SIZE_FIELD, limit),
];

const buildGroupSizeSortAllQuery = (args: QueryArgs): string[] => [
  'FROM (',
  `FROM ${getEntityAlias(args.namespace)}`,
  `| WHERE ${ENTITY_TYPE_FILTER}`,
  `| EVAL group_key = ${GROUP_KEY}`,
  `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
  '| RENAME group_key AS `entity.id`',
  '), (',
  ...buildEntitiesInViewBranch(args),
  ')',
  buildStatsByEntityClause([
    `${GROUP_SIZE_FIELD} = MAX(${GROUP_SIZE_FIELD})`,
    ...buildEntityAggregations([IN_VIEW_AGGREGATION]),
  ]),
  `| WHERE ${IN_VIEW_FIELD} == 1`,
  ...buildJoinedPageSteps(args, GROUP_SIZE_FIELD),
];

const fetchGroupSizes = async (
  rows: readonly Row[],
  { namespace }: QueryArgs,
  { runQuery }: SortPageContext
): Promise<EnrichedFields> => {
  const entityIds = [...new Set(getEntityIds(rows))];
  if (!entityIds.length) return new Map();
  const keys = toList(entityIds);
  const sizes = await runQuery([
    `FROM ${getEntityAlias(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    // Pushable prefilter for the group_key filter below.
    `| WHERE ${RESOLVED_TO_FIELD} IN (${keys}) OR ${ENTITY_ID_FIELD} IN (${keys})`,
    `| EVAL group_key = ${GROUP_KEY}`,
    `| WHERE group_key IN (${keys})`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
  ]);
  const byGroupKey = new Map(
    sizes.map((row) => [getString(row, 'group_key'), getNumber(row, GROUP_SIZE_FIELD)])
  );
  // An alias row is never a group key, so it gets 1: it is a single record.
  return new Map(entityIds.map((id) => [id, { [GROUP_SIZE_FIELD]: byGroupKey.get(id) ?? 1 }]));
};

const groupSizeColumn: ComputedColumn = {
  emptyValues: { [GROUP_SIZE_FIELD]: 1 },
  buildSortAllQuery: buildGroupSizeSortAllQuery,
  buildSortWithValueQuery: buildGroupSizeSortWithValueQuery,
  fetchValues: fetchGroupSizes,
};

export const groupSizeQuerySpec = getComputedColumnQuerySpec(groupSizeColumn);
