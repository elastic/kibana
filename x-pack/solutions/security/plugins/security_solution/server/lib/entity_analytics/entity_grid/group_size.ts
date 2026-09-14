/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALLOWED_ENTITY_TYPES,
  ENTITY_ID_FIELD,
  ENTITY_JOIN_FILTER,
  ENTITY_TYPE_FIELD,
  GROUP_SIZE_FIELD,
  RESOLVED_TO_FIELD,
  indent,
  keepClause,
  toList,
  sortSuffix,
  cursorClause,
} from './common';
import type { PageCursor, QueryDeps, SortDir } from './common';

// ── query builders: group_size sort ──────────────────────────────────────────

// Computes group sizes via STATS, then LOOKUP JOINs to fetch entity fields.
// Returns one row per resolution TARGET (aliases merge into their target's count).
export const groupSizeSortDataQuery = (
  { entityAlias }: QueryDeps,
  cursor: PageCursor | null,
  pageSize: number,
  dir: SortDir
): string => {
  const inner = [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`,
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
    `| RENAME group_key AS \`entity.id\``,
  ].join('\n');
  return [
    `FROM (\n${indent(inner)}\n)`,
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_JOIN_FILTER}`,
    keepClause(GROUP_SIZE_FIELD),
    ...(cursor ? [cursorClause(cursor)] : []),
    sortSuffix(GROUP_SIZE_FIELD, dir, pageSize),
  ].join('\n');
};

export const groupSizeSortCountQuery = ({ entityAlias }: QueryDeps): string =>
  [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`,
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| STATS _c = COUNT(*) BY group_key`,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── query builders: group_size enrichment ────────────────────────────────────

export const groupSizeEnrichQuery = (entityAlias: string, groupKeys: readonly string[]): string =>
  [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_TYPE_FIELD} IN (${toList(ALLOWED_ENTITY_TYPES)})`,
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| WHERE group_key IN (${toList(groupKeys)})`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
  ].join('\n');
