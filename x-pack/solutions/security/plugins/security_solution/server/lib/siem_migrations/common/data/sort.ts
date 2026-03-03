/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

export type SiemMigrationSortHandler = (
  direction?: estypes.SortOrder
) => estypes.SortCombinations[];

export const commonSortingOptions = {
  translationResult(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    const field = 'translation_result';
    return [
      {
        _script: {
          order: direction,
          type: 'number',
          script: {
            source: `
          if (doc.containsKey('${field}') && !doc['${field}'].empty) {
            def value = doc['${field}'].value.toLowerCase();
            if (value == 'full') { return 2 }
            if (value == 'partial') { return 1 }
            if (value == 'untranslatable') { return 0 }
          }
          return -1;
          `,
            lang: 'painless',
          },
        },
      },
    ];
  },

  updated(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return [{ updated_at: direction }];
  },
};

/**
 * Sort Direction `asc` - Missing values come last
 * Sort Direction `desc` - Missing values come first
 *
 * values that exist can be distinct but are treated as same.
 *
 * */
export const getFieldExistenceSort = (field: string): SiemMigrationSortHandler => {
  return (direction: estypes.SortOrder = 'asc') => [
    {
      _script: {
        order: direction,
        type: 'number',
        script: {
          source: `
          if (doc.containsKey('${field}') && !doc['${field}'].empty) {
            return 0;
          }
          return 1;
          `,
          lang: 'painless',
        },
      },
    },
  ];
};
