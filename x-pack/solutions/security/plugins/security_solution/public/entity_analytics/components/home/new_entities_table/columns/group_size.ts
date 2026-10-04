/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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

const buildGroupSizeSortQuery = (args: QueryArgs): string =>
  [
    `FROM (\n${buildGroupSizeBaseQuery(args, GROUP_SIZE_FIELD)}\n)`,
    buildLookupJoinClause(args.concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildFilterClause(args.entityExpression),
    buildKeepClause(args, GROUP_SIZE_FIELD),
    ...buildCursorClause(args.cursor),
    buildSortSuffix(GROUP_SIZE_FIELD, args.sort.direction, args.pageSize),
  ].join('\n');

const buildGroupSizeCountQuery = (args: QueryArgs): string =>
  [
    `FROM (\n${buildGroupSizeBaseQuery(args, '_c')}\n)`,
    buildLookupJoinClause(args.concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
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

  const entityIds = [...new Set(pageRows.map((r) => r[ENTITY_ID_FIELD] as string))].filter(Boolean);
  if (!entityIds.length) return;

  const rows = await nullOnFailure(runQuery(buildGroupSizeEnrichQuery(args, entityIds)));
  if (!rows) return;

  const byGroupKey = new Map(
    rows.map((r) => [r.group_key as string, r[GROUP_SIZE_FIELD] as number])
  );
  for (const row of pageRows) {
    // A target row matches its group key and gets the member count. An alias row is
    // never a group key, so it gets 1: it is a single record.
    row[GROUP_SIZE_FIELD] = byGroupKey.get(row[ENTITY_ID_FIELD] as string) ?? 1;
  }
};

// ── column descriptor ─────────────────────────────────────────────────────────

export const groupSizeColumn = {
  id: GROUP_SIZE_FIELD,
  displayAsText: 'Records',
  initialWidth: 100,
  isSortable: true,
  isExpandable: false,
  buildSortQuery: buildGroupSizeSortQuery,
  buildCountQuery: buildGroupSizeCountQuery,
  enrichPage: enrichGroupSize,
} as const satisfies ColumnDescriptor;
