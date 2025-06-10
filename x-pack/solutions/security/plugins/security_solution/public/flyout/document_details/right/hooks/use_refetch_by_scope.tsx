/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { inputsModel, State } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { isActiveTimeline } from '../../../../helpers';
import { TimelineId } from '../../../../../common/types/timeline';
import { selectTimelineById } from '../../../../timelines/store/selectors';
import { timelineDefaults } from '../../../../timelines/store/defaults';
export interface UseRefetchScopeQueryParams {
  /**
   * Scope ID
   */
  scopeId: string;
}

/**
 * Hook to refetch data within specified scope
 */
export const useRefetchByScope = ({ scopeId }: UseRefetchScopeQueryParams) => {
  const getGlobalQueries = useMemo(() => inputsSelectors.globalQuery(), []);
  const getTimelineQuery = useMemo(() => inputsSelectors.timelineQueryByIdSelectorFactory(), []);
  const { activeTab } = useSelector(
    (state: State) => selectTimelineById(state, TimelineId.active) ?? timelineDefaults
  );

  const { globalQuery, timelineQuery } = useDeepEqualSelector((state) => ({
    globalQuery: getGlobalQueries(state),
    timelineQuery: getTimelineQuery(state, `${TimelineId.active}-${activeTab}`),
  }));

  const refetchAll = useCallback(() => {
    const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
      newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
    };
    if (isActiveTimeline(scopeId)) {
      refetchQuery([timelineQuery]);
    } else {
      refetchQuery(globalQuery);
    }
  }, [scopeId, timelineQuery, globalQuery]);

  return { refetch: refetchAll };
};
