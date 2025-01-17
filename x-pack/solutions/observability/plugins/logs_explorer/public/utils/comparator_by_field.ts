/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function createComparatorByField<EntityType>(
  property: keyof EntityType,
  sortOrder: 'asc' | 'desc' = 'asc'
) {
  return (curr: EntityType, next: EntityType): number => {
    const currValue = curr[property];
    const nextValue = next[property];

    if (currValue < nextValue) {
      return sortOrder === 'asc' ? -1 : 1;
    } else if (currValue > nextValue) {
      return sortOrder === 'asc' ? 1 : -1;
    } else {
      return 0;
    }
  };
}
