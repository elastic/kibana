/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';
import { ENTITY_CASE_COUNTS_INTERNAL_URL } from '../../../../../../common/entity_analytics/entity_analytics/constants';
import { getEntityIds } from '../common';
import type { RowsMode } from '../common';
import type { ColumnQuerySpec, PageEnricher, RunContext } from './types';

const CASE_COUNT_FIELD = 'case_count';

/** Case counts per entity id; `null` when the user can't read Security cases. */
const fetchCaseCounts = async (
  { http, signal }: RunContext,
  entityIds: readonly string[],
  rowsMode: RowsMode
): Promise<Map<string, number> | null> => {
  if (entityIds.length === 0) return new Map();
  try {
    const result = await http.post<Record<string, number>>(ENTITY_CASE_COUNTS_INTERNAL_URL, {
      // A resolved row counts the distinct cases of its resolved entity, which the server reads.
      body: JSON.stringify({
        entity_ids: entityIds,
        ...(rowsMode === 'resolved' ? { include_members: true } : {}),
      }),
      version: '1',
      signal,
    });
    return new Map(Object.entries(result));
  } catch (error) {
    if (isHttpFetchError(error) && error.response?.status === 403) return null;
    throw error;
  }
};

const caseCountEnricher: PageEnricher = {
  fields: [CASE_COUNT_FIELD],
  fetch: async (pageRows, args, ctx) => {
    const entityIds = getEntityIds(pageRows);
    const counts = await fetchCaseCounts(ctx, entityIds, args.rowsMode);
    // Without access, the counts stay unset: unknown, not zero, and not an error.
    if (counts == null) return new Map();
    return new Map(entityIds.map((id) => [id, { [CASE_COUNT_FIELD]: counts.get(id) ?? 0 }]));
  },
};

export const caseCountQuerySpec = { enricher: caseCountEnricher } satisfies ColumnQuerySpec;
