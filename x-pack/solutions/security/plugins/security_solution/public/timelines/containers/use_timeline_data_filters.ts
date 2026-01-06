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

  return useMemo(() => {
    return {
      from,
      to,
      shouldUpdate,
    };
  }, [from, to, shouldUpdate]);
}
