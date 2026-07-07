/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SharedFiltersOptions {
  excludeColdAndFrozenTiers: boolean;
}

export const createSharedFilters = ({ excludeColdAndFrozenTiers }: SharedFiltersOptions) => {
  const filters = [];

  if (excludeColdAndFrozenTiers) {
    filters.push({
      bool: {
        must_not: {
          terms: {
            _tier: ['data_frozen', 'data_cold'],
          },
        },
      },
    });
  }

  return filters;
};
