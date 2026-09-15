/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
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
import type { PageCursor, QueryDeps, RawQuery, Row, SortDir } from './common';

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

// ── enrichment ────────────────────────────────────────────────────────────────

/** Populates group_size for a page of entity rows. */
export const enrichGroupSize = async (
  pageRows: Row[],
  { entityAlias }: QueryDeps,
  skip: Set<string>,
  enrichPageQuery: RawQuery,
  logger: Logger
): Promise<void> => {
  if (skip.has(GROUP_SIZE_FIELD)) return;

  const groupKeys = [
    ...new Set(pageRows.map((r) => (r[RESOLVED_TO_FIELD] ?? r[ENTITY_ID_FIELD]) as string)),
  ].filter(Boolean);
  if (!groupKeys.length) return;

  const rows = await enrichPageQuery(
    groupSizeEnrichQuery(entityAlias, groupKeys),
    'group size enrich'
  ).catch((e: unknown) => {
    logger.warn(`group size enrich: ${e}`);
    return null;
  });
  if (!rows) return;

  const byGroupKey = new Map(
    rows.map((r) => [r.group_key as string, r[GROUP_SIZE_FIELD] as number])
  );
  for (const row of pageRows) {
    const gk = (row[RESOLVED_TO_FIELD] as string | null) ?? (row[ENTITY_ID_FIELD] as string);
    row[GROUP_SIZE_FIELD] = byGroupKey.get(gk) ?? 1;
  }
};
