/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux-v7';
import { TimelineId } from '../../../../common/types/timeline';
import { getTimelineShowStatusByIdSelector } from '../../../timelines/store/selectors';
import type { State } from '../../store';

/**
 * Calls `refetch` whenever the active timeline modal transitions from visible to hidden.
 * This ensures that fields saved during a timeline session (e.g. savedSearchId for ESQL)
 * are reflected in any downstream compatibility checks without requiring a manual refresh.
 */
export const useRefetchOnTimelineClose = (refetch: () => void): void => {
  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const { show: activeTimelineVisible } = useSelector((state: State) =>
    getTimelineShowStatus(state, TimelineId.active)
  );
  const prevActiveTimelineVisible = useRef(activeTimelineVisible);

  useEffect(() => {
    if (prevActiveTimelineVisible.current && !activeTimelineVisible) {
      refetch();
    }
    prevActiveTimelineVisible.current = activeTimelineVisible;
  }, [activeTimelineVisible, refetch]);
};
