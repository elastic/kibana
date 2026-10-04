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
  toList,
  buildSortSuffix,
  buildCursorClause,
} from '../common';
import type { QueryArgs, RunContext, Row, ColumnDescriptor } from '../common';

// ── query builders: group_size sort ──────────────────────────────────────────
// Inner FROM is the entity index, so searchFilters can stay in WHERE (KQL legal).

const buildGroupSizeSortDataQuery = ({
  namespace,
  sort: { direction: dir },
  cursor,
  pageSize,
  concreteEntityIndexName,
  searchExpression,
  entityExpression,
}: QueryArgs): string => {
  const entityAlias = entityAliasOf(namespace);
  const inner = [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildFilterClause(searchExpression),
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
    `| RENAME group_key AS \`entity.id\``,
  ].join('\n');

  return [
    `FROM (\n${inner}\n)`,
    buildLookupJoinClause(concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildFilterClause(entityExpression),
    buildKeepClause(GROUP_SIZE_FIELD),
    ...buildCursorClause(cursor),
    buildSortSuffix(GROUP_SIZE_FIELD, dir, pageSize),
  ].join('\n');
};

const buildGroupSizeSortCountQuery = ({
  namespace,
  concreteEntityIndexName,
  searchExpression,
  entityExpression,
}: QueryArgs): string => {
  const entityAlias = entityAliasOf(namespace);
  const inner = [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildFilterClause(searchExpression),
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| STATS _c = COUNT(*) BY group_key`,
    `| RENAME group_key AS \`entity.id\``,
  ].join('\n');

  return [
    `FROM (\n${inner}\n)`,
    buildLookupJoinClause(concreteEntityIndexName),
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    ...buildFilterClause(entityExpression),
    `| STATS total = COUNT(*)`,
  ].join('\n');
};

// ── enrichment ────────────────────────────────────────────────────────────────

const buildGroupSizeEnrichQuery = (namespace: string, groupKeys: readonly string[]): string =>
  [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| WHERE group_key IN (${toList(groupKeys)})`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
  ].join('\n');

const enrichGroupSize = async (
  pageRows: Row[],
  { namespace }: QueryArgs,
  skip: Set<string>,
  { runQuery }: RunContext
): Promise<void> => {
  if (skip.has(GROUP_SIZE_FIELD)) return;

  const entityIds = [...new Set(pageRows.map((r) => r[ENTITY_ID_FIELD] as string))].filter(Boolean);
  if (!entityIds.length) return;

  const rows = await runQuery(buildGroupSizeEnrichQuery(namespace, entityIds)).catch(() => null);
  if (!rows) return;

  const byGroupKey = new Map(
    rows.map((r) => [r.group_key as string, r[GROUP_SIZE_FIELD] as number])
  );
  for (const row of pageRows) {
    // Targets: group_key == entity.id → COUNT(*) of all members. Aliases: nothing maps to
    // their entity.id as a group leader → miss → 1 (they are a single record).
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
  buildSortQuery: buildGroupSizeSortDataQuery,
  buildCountQuery: buildGroupSizeSortCountQuery,
  enrichPage: enrichGroupSize,
} as const satisfies ColumnDescriptor;
