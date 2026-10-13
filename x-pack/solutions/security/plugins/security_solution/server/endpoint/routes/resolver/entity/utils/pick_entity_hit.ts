/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { toLocalIndexName } from '../../utils/index_routing';

/**
 * Picks the search hit that matches the clicked document when the same `_id` can exist in more
 * than one project. Prefers an exact `_index` match, then the local index name, then the first hit
 * (the pre-CPS behavior).
 */
export function pickEntityHit<T>(
  hits: Array<estypes.SearchHit<T>>,
  preferredIndex?: string
): estypes.SearchHit<T> | undefined {
  if (hits.length === 0) {
    return undefined;
  }

  if (!preferredIndex) {
    return hits[0];
  }

  const preferredLocal = toLocalIndexName(preferredIndex);

  return (
    hits.find((hit) => hit._index === preferredIndex) ??
    hits.find((hit) => hit._index != null && toLocalIndexName(hit._index) === preferredLocal) ??
    hits[0]
  );
}
