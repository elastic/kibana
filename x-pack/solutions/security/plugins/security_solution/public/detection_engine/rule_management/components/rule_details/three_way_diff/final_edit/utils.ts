/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSourceType } from '../../../../../../detections/pages/detection_engine/rules/types';
import { DataSourceType as DataSourceTypeSnakeCase } from '../../../../../../../common/api/detection_engine';
import type { DiffableRule } from '../../../../../../../common/api/detection_engine';

interface UseRuleIndexPatternParameters {
  dataSourceType: DataSourceType;
  index: string[];
  dataViewId: string | undefined;
}

export function getUseRuleIndexPatternParameters(
  finalDiffableRule: DiffableRule,
  defaultIndexPattern: string[]
): UseRuleIndexPatternParameters {
  if (!('data_source' in finalDiffableRule) || !finalDiffableRule.data_source) {
    return {
      dataSourceType: DataSourceType.IndexPatterns,
      index: defaultIndexPattern,
      dataViewId: undefined,
    };
  }
  if (finalDiffableRule.data_source.type === DataSourceTypeSnakeCase.data_view) {
    return {
      dataSourceType: DataSourceType.DataView,
      index: [],
      dataViewId: finalDiffableRule.data_source.data_view_id,
    };
  }
  return {
    dataSourceType: DataSourceType.IndexPatterns,
    index: finalDiffableRule.data_source.index_patterns,
    dataViewId: undefined,
  };
}
