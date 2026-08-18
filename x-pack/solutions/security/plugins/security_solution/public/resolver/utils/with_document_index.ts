/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prepends the clicked document's `_index` so the entity lookup can disambiguate the same `_id`
 * across projects. No-ops when the index is missing or already present.
 */
export const withDocumentIndex = (indices: string[], documentIndex?: string | null): string[] => {
  if (!documentIndex || indices.includes(documentIndex)) {
    return indices;
  }

  return [documentIndex, ...indices];
};
