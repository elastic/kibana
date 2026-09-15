/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  ENTITY_ID_FIELD,
  ENTITY_TYPE_FILTER,
  GROUP_SIZE_FIELD,
  RESOLVED_TO_FIELD,
  entityAliasOf,
  keepClause,
  toList,
  sortSuffix,
  cursorClause,
} from '../common';
import type { QueryArgs, EsqlRunner, Row } from '../common';

// ── query builders: group_size sort ──────────────────────────────────────────

// Computes group sizes via STATS, then LOOKUP JOINs to fetch entity fields.
// Returns one row per resolution TARGET (aliases merge into their target's count).
export const groupSizeSortDataQuery = ({
  namespace,
  sort: { direction: dir },
  cursor,
  pageSize,
}: QueryArgs): string => {
  const entityAlias = entityAliasOf(namespace);
  const inner = [
    `FROM ${entityAlias}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
    `| RENAME group_key AS \`entity.id\``,
  ].join('\n');

  return [
    `FROM (\n${inner}\n)`,
    `| LOOKUP JOIN ${entityAlias} ON \`entity.id\``,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    keepClause(GROUP_SIZE_FIELD),
    ...(cursor ? [cursorClause(cursor)] : []),
    sortSuffix(GROUP_SIZE_FIELD, dir, pageSize),
  ].join('\n');
};

export const groupSizeSortCountQuery = ({ namespace }: QueryArgs): string =>
  [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| STATS _c = COUNT(*) BY group_key`,
    `| STATS total = COUNT(*)`,
  ].join('\n');

// ── enrichment ────────────────────────────────────────────────────────────────

const groupSizeEnrichQuery = (namespace: string, groupKeys: readonly string[]): string =>
  [
    `FROM ${entityAliasOf(namespace)}`,
    `| WHERE ${ENTITY_TYPE_FILTER}`,
    `| EVAL group_key = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`,
    `| WHERE group_key IN (${toList(groupKeys)})`,
    `| STATS ${GROUP_SIZE_FIELD} = COUNT(*) BY group_key`,
  ].join('\n');

/** Populates group_size for a page of entity rows. */
export const enrichGroupSize = async (
  logger: Logger,
  pageRows: Row[],
  { namespace }: QueryArgs,
  skip: Set<string>,
  enrichPageQuery: EsqlRunner
): Promise<void> => {
  if (skip.has(GROUP_SIZE_FIELD)) return;

  const groupKeys = [
    ...new Set(pageRows.map((r) => (r[RESOLVED_TO_FIELD] ?? r[ENTITY_ID_FIELD]) as string)),
  ].filter(Boolean);
  if (!groupKeys.length) return;

  const rows = await enrichPageQuery(groupSizeEnrichQuery(namespace, groupKeys)).catch(
    (e: unknown) => {
      logger.warn(`group size enrich: ${e}`);
      return null;
    }
  );
  if (!rows) return;

  const byGroupKey = new Map(
    rows.map((r) => [r.group_key as string, r[GROUP_SIZE_FIELD] as number])
  );
  for (const row of pageRows) {
    const gk = (row[RESOLVED_TO_FIELD] as string | null) ?? (row[ENTITY_ID_FIELD] as string);
    row[GROUP_SIZE_FIELD] = byGroupKey.get(gk) ?? 1;
  }
};
