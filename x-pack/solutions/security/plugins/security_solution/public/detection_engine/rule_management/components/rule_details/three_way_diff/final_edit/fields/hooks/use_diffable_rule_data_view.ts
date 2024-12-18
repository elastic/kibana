/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { DataSourceType } from '../../../../../../../../../common/api/detection_engine';
import { useDefaultIndexPattern } from '../../../../../../hooks/use_default_index_pattern';
import { useDataView } from './use_data_view';

interface UseDiffableRuleDataViewResult {
  dataView: DataView | undefined;
  isLoading: boolean;
}

export function useDiffableRuleDataView(diffableRule: DiffableRule): UseDiffableRuleDataViewResult {
  const defaultIndexPattern = useDefaultIndexPattern();
  const defaultDataSource = {
    type: DataSourceType.index_patterns,
    index_patterns: defaultIndexPattern,
  } as const;
  const dataSource =
    ('data_source' in diffableRule && diffableRule.data_source) || defaultDataSource;

  return useDataView(
    dataSource.type === DataSourceType.index_patterns
      ? { indexPatterns: dataSource.index_patterns }
      : { dataViewId: dataSource.data_view_id }
  );
}
