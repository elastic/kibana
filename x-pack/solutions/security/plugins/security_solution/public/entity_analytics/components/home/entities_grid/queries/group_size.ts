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
import { buildComputedColumnSortQuery } from './computed_column_sort';
import { ENTITY_TYPE_FILTER, getEntityAlias, toList } from './esql';
import type { ColumnQuerySpec, EnrichedFields, SortPageContext } from './types';
import { fetchComputedColumnSortPage } from './computed_column';
import type { ComputedColumn } from './computed_column';

/** The resolved entity of an alias, and the entity itself otherwise. */
const GROUP_KEY = `COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`;

// ── what the column does ─────────────────────────────────────────────────────

/**
 * A group's size is its aliases plus itself. Only resolved entities with aliases have a value
 * over 1, and their alias docs are few, so they are the column's source rows; every other entity
 * is a group of one.
 */
const groupSizeColumn: ComputedColumn = {
  field: GROUP_SIZE_FIELD,
  emptyValue: 1,
  emptyColumns: `${GROUP_SIZE_FIELD} = TO_LONG(1)`,
  buildSourceRows: ({ namespace }) => [
    `FROM ${getEntityAlias(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
    `| EVAL \`entity.id\` = ${RESOLVED_TO_FIELD}`,
  ],
  aggregations: [{ field: 'alias_count', aggregation: 'COUNT(*)', resolvedEntity: 'SUM' }],
  // The source rows are already counted for the resolved entity.
  rollsUpOverAliases: false,
  afterStats: [`| EVAL ${GROUP_SIZE_FIELD} = alias_count + 1`],
  fetchValues: (rows, args, ctx) => fetchGroupSizes(rows, args, ctx),
  buildMergedSortQuery: (args) =>
    buildComputedColumnSortQuery(args, {
      sourceRows: [
        `FROM ${getEntityAlias(args.namespace)}`,
        `| WHERE ${ENTITY_TYPE_FILTER}`,
        `| EVAL group_key = ${GROUP_KEY}`,
        `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
        '| RENAME group_key AS `entity.id`',
      ],
      mergeAggregations: [`${GROUP_SIZE_FIELD} = MAX(${GROUP_SIZE_FIELD})`],
      sortField: GROUP_SIZE_FIELD,
    }),
};

export const groupSizeQuerySpec = {
  fetchSortPage: (args, ctx) => fetchComputedColumnSortPage(groupSizeColumn, args, ctx),
  enricher: {
    fields: [GROUP_SIZE_FIELD],
    fetch: (rows, args, ctx) => fetchGroupSizes(rows, args, ctx),
  },
} satisfies ColumnQuerySpec;

// ── values of given rows ─────────────────────────────────────────────────────

/** The size of each row's group: a resolved entity counts its aliases, an alias is one record. */
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
