/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface RuleMigrationSort {
  sortField?: string;
  sortDirection?: estypes.SortOrder;
}

const sortMissingValue = (direction: estypes.SortOrder = 'asc') =>
  direction === 'desc' ? '_last' : '_first';

const sortingOptions = {
  matchedPrebuiltRule(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return [
      {
        'elastic_rule.prebuilt_rule_id': {
          order: direction,
          nested: { path: 'elastic_rule' },
          missing: sortMissingValue(direction),
        },
      },
    ];
  },
  severity(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    const field = 'elastic_rule.severity';
    return [
      {
        _script: {
          order: direction,
          type: 'number',
          script: {
            source: `
          if (doc.containsKey('${field}') && !doc['${field}'].empty) {
            def value = doc['${field}'].value.toLowerCase();
            if (value == 'critical') { return 3 }
            if (value == 'high') { return 2 }
            if (value == 'medium') { return 1 }
            if (value == 'low') { return 0 }
          }
          return -1;
          `,
            lang: 'painless',
          },
          nested: { path: 'elastic_rule' },
        },
      },
    ];
  },
  status(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    const field = 'translation_result';
    const installedRuleField = 'elastic_rule.id';
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
      {
        _script: {
          order: direction,
          type: 'number',
          script: {
            source: `
          if (doc.containsKey('${installedRuleField}') && !doc['${installedRuleField}'].empty) {
            return 0;
          }
          return -1;
          `,
            lang: 'painless',
          },
          nested: { path: 'elastic_rule' },
        },
      },
    ];
  },
  updated(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return [{ updated_at: direction }];
  },
  name(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return [
      { 'elastic_rule.title.keyword': { order: direction, nested: { path: 'elastic_rule' } } },
    ];
  },
};

const DEFAULT_SORTING: estypes.Sort = [
  ...sortingOptions.status('desc'),
  ...sortingOptions.matchedPrebuiltRule('desc'),
  ...sortingOptions.severity(),
  ...sortingOptions.updated(),
];

const sortingOptionsMap: {
  [key: string]: (direction?: estypes.SortOrder) => estypes.SortCombinations[];
} = {
  'elastic_rule.title': sortingOptions.name,
  'elastic_rule.severity': sortingOptions.severity,
  'elastic_rule.prebuilt_rule_id': sortingOptions.matchedPrebuiltRule,
  translation_result: sortingOptions.status,
  updated_at: sortingOptions.updated,
};

export const getSortingOptions = (sort?: RuleMigrationSort): estypes.Sort => {
  if (!sort?.sortField) {
    return DEFAULT_SORTING;
  }
  return sortingOptionsMap[sort.sortField]?.(sort.sortDirection) ?? DEFAULT_SORTING;
};
