/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_GRID_CASES_INTERNAL_URL } from '../../../../../../common/entity_analytics/entity_analytics/constants';
import { entityIdsOf, nullOnFailure } from '../common';
import type { RunContext, PageEnricher, ColumnDescriptor } from '../common';

export const CASE_COUNT_FIELD = 'case_count';

const batchCaseCounts = async (
  { http, signal }: RunContext,
  entityIds: readonly string[]
): Promise<Map<string, number>> => {
  if (entityIds.length === 0) return new Map();
  const result = await nullOnFailure(
    http.post<Record<string, number>>(ENTITY_GRID_CASES_INTERNAL_URL, {
      body: JSON.stringify({ entity_ids: entityIds }),
      version: '1',
      signal,
    })
  );
  return new Map(Object.entries(result ?? {}));
};

const caseCountEnricher: PageEnricher = {
  fields: [CASE_COUNT_FIELD],
  read: async (pageRows, _args, ctx) => {
    const entityIds = entityIdsOf(pageRows);
    const counts = await batchCaseCounts(ctx, entityIds);
    return new Map(entityIds.map((id) => [id, { [CASE_COUNT_FIELD]: counts.get(id) ?? 0 }]));
  },
};

// ── column descriptor ─────────────────────────────────────────────────────────

export const caseCountColumn = {
  id: CASE_COUNT_FIELD,
  displayAsText: 'Cases',
  initialWidth: 100,
  isSortable: false,
  isExpandable: false,
  enricher: caseCountEnricher,
} as const satisfies ColumnDescriptor;
