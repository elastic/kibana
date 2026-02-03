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

const sortOptions = {
  ...commonSortingOptions,
  name(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return [{ 'original_dashboard.title.keyword': direction }];
  },
  installedDashboardId(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    const field = 'elastic_dashboard.id';
    return getFieldExistenceSort(field)(direction);
  },
  originalDashboardLastUpdate(direction: estypes.SortOrder = 'desc'): estypes.SortCombinations[] {
    return [{ 'original_dashboard.last_updated': direction }];
  },
  splunkApp(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return [{ 'original_dashboard.splunk_properties.app': direction }];
  },
};

const DEFAULT_SORT: estypes.Sort = [
  ...sortOptions.translationResult('desc'),
  ...sortOptions.installedDashboardId('desc'),
  ...sortOptions.name('asc'),
];

const sortOptionsMap: {
  [key: string]: SiemMigrationSortHandler;
} = {
  'original_dashboard.title': sortOptions.name,
  'original_dashboard.last_updated': (direction?: estypes.SortOrder) => [
    ...sortOptions.originalDashboardLastUpdate(direction),
    ...sortOptions.translationResult(direction),
    ...sortOptions.installedDashboardId(direction),
  ],
  'original_dashboard.splunk_properties.app': sortOptions.splunkApp,
  updated: sortOptions.updated,
  translation_result: (direction?: estypes.SortOrder) => [
    ...sortOptions.translationResult(direction),
  ],
};

export const getSortingOptions = (sort?: SiemMigrationSort): estypes.Sort => {
  if (!sort?.sortField) {
    return DEFAULT_SORT;
  }

  return sortOptionsMap[sort.sortField]?.(sort.sortDirection) ?? DEFAULT_SORT;
};
