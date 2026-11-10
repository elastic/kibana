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
    return [{ 'original_workflow.title.keyword': direction }];
  },
  installedWorkflowId(direction: estypes.SortOrder = 'asc'): estypes.SortCombinations[] {
    return getFieldExistenceSort('elastic_workflow.id')(direction);
  },
};

const DEFAULT_SORT: estypes.Sort = [
  ...sortOptions.translationResult('desc'),
  ...sortOptions.installedWorkflowId('desc'),
  ...sortOptions.name('asc'),
];

const sortOptionsMap: Record<string, SiemMigrationSortHandler> = {
  'original_workflow.title': sortOptions.name,
  'elastic_workflow.id': sortOptions.installedWorkflowId,
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
