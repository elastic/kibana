/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseResultsRollupReturnValue } from '../../../hooks/use_results_rollup/types';
import { mockUseResultsRollup } from '../../use_results_rollup/mock_use_results_rollup';

export const getMergeResultsRollupContextProps = (
  resultsRollupContextProps?: Partial<UseResultsRollupReturnValue>
) => {
  const {
    onCheckCompleted,
    patternIndexNames,
    patternRollups,
    totalDocsCount,
    totalIncompatible,
    totalIndices,
    totalIndicesChecked,
    totalSameFamily,
    totalSizeInBytes,
    updatePatternIndexNames,
    updatePatternRollup,
  } = {
    ...mockUseResultsRollup,
    ...resultsRollupContextProps,
  };

  return {
    onCheckCompleted,
    patternIndexNames,
    patternRollups,
    totalDocsCount,
    totalIncompatible,
    totalIndices,
    totalIndicesChecked,
    totalSameFamily,
    totalSizeInBytes,
    updatePatternIndexNames,
    updatePatternRollup,
  };
};
