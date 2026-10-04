/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_GRID_CASES_INTERNAL_URL } from '../../../../../../common/entity_analytics/entity_analytics/constants';
import { isAbortError } from '../../../../../common/utils/exceptions';
import { ENTITY_ID_FIELD } from '../common';
import type { QueryArgs, RunContext, Row, ColumnDescriptor } from '../common';

export const CASE_COUNT_FIELD = 'case_count';

const batchCaseCounts = async (
  { http, signal }: RunContext,
  entityIds: readonly string[]
): Promise<Map<string, number>> => {
  if (entityIds.length === 0) return new Map();
  try {
    const result = await http.post<Record<string, number>>(ENTITY_GRID_CASES_INTERNAL_URL, {
      body: JSON.stringify({ entity_ids: entityIds }),
      version: '1',
      signal,
    });
    return new Map(Object.entries(result));
  } catch (err) {
    if (isAbortError(err)) throw err;
    return new Map();
  }
};

const enrichCaseCounts = async (
  pageRows: Row[],
  _args: QueryArgs,
  _skip: Set<string>,
  ctx: RunContext
): Promise<void> => {
  const entityIds = pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean);
  const counts = await batchCaseCounts(ctx, entityIds);
  for (const row of pageRows) {
    row[CASE_COUNT_FIELD] = counts.get(row[ENTITY_ID_FIELD] as string) ?? 0;
  }
};

// ── column descriptor ─────────────────────────────────────────────────────────

export const caseCountColumn = {
  id: CASE_COUNT_FIELD,
  displayAsText: 'Cases',
  initialWidth: 100,
  isSortable: false,
  isExpandable: false,
  enrichPage: enrichCaseCounts,
} as const satisfies ColumnDescriptor;
