/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';

export function sortSavedObjectsByField<T>(
  objects: SavedObjectsFindResponse<T>['saved_objects'],
  sortField: string,
  sortOrder: 'asc' | 'desc' = 'asc'
) {
  const fieldName = sortField.replace('.keyword', '');
  objects.sort((a, b) => {
    const attrsA = a.attributes as Record<string, unknown>;
    const attrsB = b.attributes as Record<string, unknown>;
    const fieldA = attrsA?.[fieldName];
    const fieldB = attrsB?.[fieldName];

    // Handle null/undefined values
    if (fieldA == null && fieldB == null) return 0;
    if (fieldA == null) return sortOrder === 'asc' ? -1 : 1;
    if (fieldB == null) return sortOrder === 'asc' ? 1 : -1;

    // Case-insensitive sort for strings
    if (typeof fieldA === 'string' && typeof fieldB === 'string') {
      const cmp = fieldA.localeCompare(fieldB, undefined, { sensitivity: 'base' });
      return sortOrder === 'asc' ? cmp : -cmp;
    }
    if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}
