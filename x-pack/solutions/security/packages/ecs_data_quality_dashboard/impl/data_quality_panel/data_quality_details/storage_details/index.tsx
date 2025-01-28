/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { useResultsRollupContext } from '../../contexts/results_rollup_context';
import { StorageTreemap } from './storage_treemap';
import { SelectedIndex } from '../../types';
import { useDataQualityContext } from '../../data_quality_context';
import { DOCS_UNIT } from './translations';
import { getFlattenedBuckets } from './utils/get_flattened_buckets';

export const DEFAULT_MAX_CHART_HEIGHT = 300; // px

export interface Props {
  onIndexSelected: ({ indexName, pattern }: SelectedIndex) => void;
}

const StorageDetailsComponent: React.FC<Props> = ({ onIndexSelected }) => {
  const { patternRollups } = useResultsRollupContext();
  const { isILMAvailable, ilmPhases, formatBytes, formatNumber } = useDataQualityContext();

  const flattenedBuckets = useMemo(
    () =>
      getFlattenedBuckets({
        ilmPhases,
        isILMAvailable,
        patternRollups,
      }),
    [ilmPhases, isILMAvailable, patternRollups]
  );
  const accessor = flattenedBuckets[0]?.sizeInBytes != null ? 'sizeInBytes' : 'docsCount';
  const valueFormatter = useCallback(
    (d: number) =>
      accessor === 'sizeInBytes' ? formatBytes(d) : `${formatNumber(d)} ${DOCS_UNIT(d)}`,
    [accessor, formatBytes, formatNumber]
  );

  return (
    <div data-test-subj="storageDetails">
      <StorageTreemap
        accessor={accessor}
        flattenedBuckets={flattenedBuckets}
        maxChartHeight={DEFAULT_MAX_CHART_HEIGHT}
        onIndexSelected={onIndexSelected}
        patternRollups={patternRollups}
        valueFormatter={valueFormatter}
      />
    </div>
  );
};

StorageDetailsComponent.displayName = 'StorageDetailsComponent';
export const StorageDetails = React.memo(StorageDetailsComponent);
