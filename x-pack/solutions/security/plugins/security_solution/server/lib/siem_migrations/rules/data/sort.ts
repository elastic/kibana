/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SiemMigrationSort } from '../../common/data/types';
import type { SiemMigrationSortHandler } from '../../common/data/sort';
import { commonSortingOptions, getFieldExistenceSort } from '../../common/data/sort';

const sortMissingValue = (direction: estypes.SortOrder = 'asc') =>
  direction === 'desc' ? '_last' : '_first';

const sortingOptions = {
  ...commonSortingOptions,
  installedRuleId(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return getFieldExistenceSort('elastic_rule.id')(direction);
  },
  matchedPrebuiltRule(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return [
      {
        'elastic_rule.prebuilt_rule_id': {
          order: direction,
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
        },
      },
    ];
  },
  riskScore(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return [{ 'elastic_rule.risk_score': direction }];
  },
  updated(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return [{ updated_at: direction }];
  },
  name(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return [{ 'elastic_rule.title.keyword': direction }];
  },
};

const DEFAULT_SORTING: estypes.Sort = [
  ...sortingOptions.translationResult('desc'),
  ...sortingOptions.installedRuleId('desc'),
  ...sortingOptions.matchedPrebuiltRule('desc'),
  ...sortingOptions.severity(),
  ...sortingOptions.riskScore('desc'),
  ...sortingOptions.updated(),
];

const sortingOptionsMap: {
  [key: string]: SiemMigrationSortHandler;
} = {
  'elastic_rule.title': sortingOptions.name,
  'elastic_rule.severity': (direction?: estypes.SortOrder) => [
    ...sortingOptions.severity(direction),
    ...sortingOptions.riskScore(direction),
    ...sortingOptions.translationResult('desc'),
    ...sortingOptions.installedRuleId('desc'),
    ...sortingOptions.matchedPrebuiltRule('desc'),
  ],
  'elastic_rule.risk_score': (direction?: estypes.SortOrder) => [
    ...sortingOptions.riskScore(direction),
    ...sortingOptions.severity(direction),
    ...sortingOptions.translationResult('desc'),
    ...sortingOptions.matchedPrebuiltRule('desc'),
  ],
  'elastic_rule.prebuilt_rule_id': (direction?: estypes.SortOrder) => [
    ...sortingOptions.matchedPrebuiltRule(direction),
    ...sortingOptions.translationResult('desc'),
    ...sortingOptions.severity('desc'),
    ...sortingOptions.riskScore(direction),
  ],
  translation_result: (direction?: estypes.SortOrder) => [
    ...sortingOptions.translationResult(direction),
    ...sortingOptions.matchedPrebuiltRule('desc'),
    ...sortingOptions.severity('desc'),
    ...sortingOptions.riskScore(direction),
  ],
  updated_at: sortingOptions.updated,
};

export const getSortingOptions = (sort?: SiemMigrationSort): estypes.Sort => {
  if (!sort?.sortField) {
    return DEFAULT_SORTING;
  }
  return sortingOptionsMap[sort.sortField]?.(sort.sortDirection) ?? DEFAULT_SORTING;
};
