/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  entityIdsOf,
  getEntityId,
  getNumber,
  getString,
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FILTER,
  GROUP_SIZE_FIELD,
  RESOLVED_TO_FIELD,
  entityAliasOf,
  buildKeepClause,
  buildFilterClause,
  buildLookupJoinClause,
  nullOnFailure,
  toList,
  buildSortSuffix,
  buildCursorClause,
} from '../common';
import type { QueryArgs, RunContext, Row, ColumnDescriptor } from '../common';

const GROUP_KEY = `COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`;

// ── sort queries ──────────────────────────────────────────────────────────────

/**
 * Counts entities per resolution group, keyed by the target's `entity.id`.
 * The search expression filters the members. A group matches when any member matches,
 * even when the target does not. The inner FROM is the entity index, so KQL is valid.
 */
const buildGroupSizeBaseQuery = (
  { namespace, searchExpression }: QueryArgs,
  countColumn: string
): string =>
  [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildFilterClause(searchExpression),
    `| EVAL group_key = ${GROUP_KEY}`,
    `| STATS ${countColumn} = COUNT(*) BY group_key`,
    `| RENAME group_key AS \`entity.id\``,
  ].join('\n');

/**
 * Unfiltered page: sort and limit the groups first, then join only the page rows. The join
 * runs after STATS, on the coordinator, so joining every group is what made this sort slow.
 * `has_head` keeps a group only when its target is one of its members (a type-matching entity
 * with no resolved_to), which is the existence check the join used to do: aliases of a deleted
 * target point at nothing, and their group stays hidden. Filters break this: a search can
 * exclude the target, and entity filters apply to target fields, so filtered sorts use the
 * queries below.
 */
const buildUnfilteredGroupSizeSortQuery = (args: QueryArgs): string =>
  [
    `FROM ${entityAliasOf(args.namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| EVAL group_key = ${GROUP_KEY}, is_head = CASE(${RESOLVED_TO_FIELD} IS NULL, 1, 0)`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*), has_head = MAX(is_head) BY group_key`,
    '| WHERE has_head == 1',
    '| RENAME group_key AS `entity.id`',
    ...buildCursorClause(args.cursor),
    buildSortSuffix(GROUP_SIZE_FIELD, args.sort.direction, args.pageSize),
    buildLookupJoinClause(args.concreteEntityIndexName),
    buildKeepClause(args, GROUP_SIZE_FIELD),
    // LOOKUP JOIN may not keep the input order.
    buildSortSuffix(GROUP_SIZE_FIELD, args.sort.direction, args.pageSize),
  ].join('\n');

/**
 * Upper bound on the groups with aliases that the entity filters keep. Below it, the size-one
 * branch reads enough targets to fill the page after dropping the targets that have aliases.
 * Above it, a page of size-one groups can come back short.
 */
const MAX_ALIAS_GROUPS = 10_000;

/**
 * Entity filters without a search: build the groups that have aliases from the alias docs only
 * (few), and read every other target as a group of one, filtered and sorted natively. The merge
 * keeps the larger size per target. This avoids grouping and joining every entity, which timed
 * out at 10M entities. Same rows as the join-first query, as entity filters apply to the target.
 */
const buildAliasFirstGroupSizeSortQuery = (args: QueryArgs): string => {
  const entityFilter = buildFilterClause(args.entityExpression);
  const cursor = buildCursorClause(args.cursor);
  const indent = (steps: string[]) => steps.map((step) => `  ${step}`);
  return [
    'FROM (',
    ...indent([
      `FROM ${entityAliasOf(args.namespace)}`,
      `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NOT NULL`,
      `| STATS alias_count = COUNT(*) BY group_key = ${RESOLVED_TO_FIELD}`,
      '| RENAME group_key AS `entity.id`',
      buildLookupJoinClause(args.concreteEntityIndexName),
      `| WHERE ${ENTITY_TYPE_FILTER}`,
      ...entityFilter,
      // The target is a member of its own group unless it resolves to another entity.
      `| EVAL ${GROUP_SIZE_FIELD} = alias_count + CASE(${RESOLVED_TO_FIELD} IS NULL, 1, 0)`,
      `| KEEP \`entity.id\`, ${GROUP_SIZE_FIELD}`,
    ]),
    '), (',
    ...indent([
      `FROM ${entityAliasOf(args.namespace)}`,
      `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NULL`,
      ...entityFilter,
      `| EVAL ${GROUP_SIZE_FIELD} = TO_LONG(1)`,
      ...cursor,
      `| SORT \`entity.id\` ASC`,
      `| LIMIT ${args.pageSize + 1 + MAX_ALIAS_GROUPS}`,
      `| KEEP \`entity.id\`, ${GROUP_SIZE_FIELD}`,
    ]),
    ')',
    `| STATS ${GROUP_SIZE_FIELD} = MAX(${GROUP_SIZE_FIELD}) BY \`entity.id\``,
    ...cursor,
    buildSortSuffix(GROUP_SIZE_FIELD, args.sort.direction, args.pageSize),
    buildLookupJoinClause(args.concreteEntityIndexName),
    buildKeepClause(args, GROUP_SIZE_FIELD),
    // LOOKUP JOIN may not keep the input order.
    buildSortSuffix(GROUP_SIZE_FIELD, args.sort.direction, args.pageSize),
  ].join('\n');
};

/**
 * A search applies to every member, so the size counts matching members and a target that does
 * not match still heads a group. A search cannot run after a join, so it keeps the join-first query.
 */
const buildSearchGroupSizeSortQuery = (args: QueryArgs): string =>
  [
    `FROM (\n${buildGroupSizeBaseQuery(args, GROUP_SIZE_FIELD)}\n)`,
    buildLookupJoinClause(args.concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildFilterClause(args.entityExpression),
    buildKeepClause(args, GROUP_SIZE_FIELD),
    ...buildCursorClause(args.cursor),
    buildSortSuffix(GROUP_SIZE_FIELD, args.sort.direction, args.pageSize),
  ].join('\n');

const buildGroupSizeSortQuery = (args: QueryArgs): string => {
  if (args.searchExpression) return buildSearchGroupSizeSortQuery(args);
  if (args.entityExpression) return buildAliasFirstGroupSizeSortQuery(args);
  return buildUnfilteredGroupSizeSortQuery(args);
};

/**
 * Without a search, there is one group per target or standalone entity, and entity filters
 * apply to it: no aggregation or join needed.
 */
const buildGroupSizeCountQuery = (args: QueryArgs): string =>
  args.searchExpression
    ? [
        `FROM (\n${buildGroupSizeBaseQuery(args, '_c')}\n)`,
        buildLookupJoinClause(args.concreteEntityIndexName),
        `| WHERE ${ENTITY_TYPE_FILTER}`,
        ...buildFilterClause(args.entityExpression),
        `| STATS total = COUNT(*)`,
      ].join('\n')
    : [
        `FROM ${entityAliasOf(args.namespace)}`,
        `| WHERE ${ENTITY_TYPE_FILTER} AND ${RESOLVED_TO_FIELD} IS NULL`,
        ...buildFilterClause(args.entityExpression),
        `| STATS total = COUNT(*)`,
      ].join('\n');

// ── enrichment ────────────────────────────────────────────────────────────────

const buildGroupSizeEnrichQuery = (
  { namespace }: QueryArgs,
  groupKeys: readonly string[]
): string => {
  const keys = toList(groupKeys);
  return [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    // Pushable prefilter for the group_key filter below.
    `| WHERE ${RESOLVED_TO_FIELD} IN (${keys}) OR ${ENTITY_ID_FIELD} IN (${keys})`,
    `| EVAL group_key = ${GROUP_KEY}`,
    `| WHERE group_key IN (${keys})`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
  ].join('\n');
};

const enrichGroupSize = async (
  pageRows: Row[],
  args: QueryArgs,
  skip: Set<string>,
  { runQuery }: RunContext
): Promise<void> => {
  if (skip.has(GROUP_SIZE_FIELD)) return;

  const entityIds = [...new Set(entityIdsOf(pageRows))];
  if (!entityIds.length) return;

  const rows = await nullOnFailure(runQuery(buildGroupSizeEnrichQuery(args, entityIds)));
  if (!rows) return;

  const byGroupKey = new Map(
    rows.map((r) => [getString(r, 'group_key'), getNumber(r, GROUP_SIZE_FIELD)])
  );
  for (const row of pageRows) {
    // A target row matches its group key and gets the member count. An alias row is
    // never a group key, so it gets 1: it is a single record.
    row[GROUP_SIZE_FIELD] = byGroupKey.get(getEntityId(row)) ?? 1;
  }
};

// ── column descriptor ─────────────────────────────────────────────────────────

export const groupSizeColumn = {
  id: GROUP_SIZE_FIELD,
  displayAsText: 'Records',
  initialWidth: 100,
  isSortable: true,
  sortKind: 'foreign',
  isExpandable: false,
  buildSortQuery: buildGroupSizeSortQuery,
  buildCountQuery: buildGroupSizeCountQuery,
  enrichPage: enrichGroupSize,
} as const satisfies ColumnDescriptor;
