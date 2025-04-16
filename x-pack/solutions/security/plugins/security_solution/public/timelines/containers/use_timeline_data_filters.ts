/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import {
  isLoadingSelector,
  startSelector,
  endSelector,
} from '../../common/components/super_date_picker/selectors';
import { SourcererScopeName } from '../../sourcerer/store/model';
import { useSelectedPatterns } from '../../data_view_manager/hooks/use_selected_patterns';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useEnableExperimental } from '../../common/hooks/use_experimental_features';

export function useTimelineDataFilters(isActiveTimelines: boolean) {
  const getStartSelector = useMemo(() => startSelector(), []);
  const getEndSelector = useMemo(() => endSelector(), []);
  const getIsLoadingSelector = useMemo(() => isLoadingSelector(), []);

  const shouldUpdate = useDeepEqualSelector((state) => {
    if (isActiveTimelines) {
      return getIsLoadingSelector(state.inputs.timeline);
    } else {
      return getIsLoadingSelector(state.inputs.global);
    }
  });
  const from = useDeepEqualSelector((state) => {
    if (isActiveTimelines) {
      return getStartSelector(state.inputs.timeline);
    } else {
      return getStartSelector(state.inputs.global);
    }
  });
  const to = useDeepEqualSelector((state) => {
    if (isActiveTimelines) {
      return getEndSelector(state.inputs.timeline);
    } else {
      return getEndSelector(state.inputs.global);
    }
  });

  const { newDataViewPickerEnabled } = useEnableExperimental();
  let { selectedPatterns: analyzerPatterns } = useSourcererDataView(SourcererScopeName.analyzer);
  const experimentalAnalyzerPatterns = useSelectedPatterns(SourcererScopeName.analyzer);

  if (newDataViewPickerEnabled) {
    analyzerPatterns = experimentalAnalyzerPatterns;
  }

  return useMemo(() => {
    return {
      selectedPatterns: analyzerPatterns,
      from,
      to,
      shouldUpdate,
    };
  }, [from, to, shouldUpdate, analyzerPatterns]);
}
