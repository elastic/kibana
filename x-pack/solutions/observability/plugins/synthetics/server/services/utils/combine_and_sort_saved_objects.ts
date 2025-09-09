/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';

export function combineAndSortSavedObjects<T>(
  results: Array<SavedObjectsFindResponse<T>>,
  { sortField, sortOrder }: Omit<SavedObjectsFindOptions, 'type'>,
  page: number,
  perPage: number
): SavedObjectsFindResponse<T> {
  const allObjects = results.flatMap((r) => r.saved_objects);
  const total = results.reduce((acc, r) => acc + r.total, 0);

  let sortedObjects = allObjects;
  if (sortField) {
    const field = sortField.replace(/\.keyword$/, '');
    sortedObjects = allObjects.sort((a, b) => {
      const aRaw = (a.attributes as Record<string, unknown>)[field!];
      const bRaw = (b.attributes as Record<string, unknown>)[field!];

      let aValue: string | number;
      let bValue: string | number;

      if (typeof aRaw === 'string' && typeof bRaw === 'string') {
        aValue = aRaw.toLowerCase();
        bValue = bRaw.toLowerCase();
      } else if (typeof aRaw === 'number' && typeof bRaw === 'number') {
        aValue = aRaw;
        bValue = bRaw;
      } else {
        // fallback: null/undefined always last in asc, first in desc
        if (aRaw == null && bRaw == null) return 0;
        if (aRaw == null) return sortOrder === 'desc' ? -1 : 1;
        if (bRaw == null) return sortOrder === 'desc' ? 1 : -1;
        aValue = String(aRaw).toLowerCase();
        bValue = String(bRaw).toLowerCase();
      }

      if (aValue === bValue) return 0;
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : 1;
      }
      return aValue < bValue ? -1 : 1;
    });
  }

  const startIdx = (page - 1) * perPage;
  const endIdx = startIdx + perPage;
  const pageObjects = sortedObjects.slice(startIdx, endIdx);

  return {
    page,
    per_page: perPage,
    total,
    saved_objects: pageObjects,
  } as SavedObjectsFindResponse<T>;
}
