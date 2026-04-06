/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsPitParams } from '@kbn/core/server';
import type { FindRulesSortField } from '../../../../../../common/api/detection_engine/rule_management';
import type { SortOrder } from '../../../../../../common/api/detection_engine';
import { decodeFindRulesWithFacetsCursor } from '../../../../../../common/api/detection_engine/rule_management';

export type ResolveGranularFindCursorResult =
  | { ok: true; searchAfter?: SortResults; pit?: SavedObjectsPitParams }
  | { ok: false; error: string };

/**
 * Decodes `_find_with_facets` opaque cursor into saved-objects `searchAfter` / optional `pit`.
 * Requires the same `sort` tokens as the request that produced the cursor.
 */
export const resolveGranularFindCursor = (
  cursor: string | undefined,
  sortField: FindRulesSortField | undefined,
  sortOrder: SortOrder | undefined
): ResolveGranularFindCursorResult => {
  const trimmed = cursor?.trim() ?? '';
  if (trimmed.length === 0) {
    return { ok: true };
  }

  const decoded = decodeFindRulesWithFacetsCursor(trimmed);
  if (!decoded.ok) {
    return { ok: false, error: decoded.error };
  }

  if (sortField == null || sortOrder == null) {
    return {
      ok: false,
      error:
        'cursor requires sort; pass the same sort tokens as the request that produced the cursor (e.g. sort=name:asc)',
    };
  }

  const searchAfter = [...decoded.value.searchAfter] as SortResults;
  let pit: SavedObjectsPitParams | undefined;
  if (decoded.value.pit != null) {
    pit = {
      id: decoded.value.pit.id,
      ...(decoded.value.pit.keepAlive != null ? { keepAlive: decoded.value.pit.keepAlive } : {}),
    };
  }

  return { ok: true, searchAfter, pit };
};
