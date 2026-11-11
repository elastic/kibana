/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import type { TimelineTabs } from '../../../../../common/types/timeline';
import type { TimelineType } from '../../../../../common/api/timeline';
import { createHistoryEntry } from '../../../../common/utils/global_query_string/helpers';
import { timelineActions } from '../../../store';
import type { State } from '../../../../common/store';
import { selectTitleByTimelineById, selectTimelineById } from '../../../store/selectors';

export interface TimelineModalHeaderData {
  title: string;
  activeTab: TimelineTabs;
  timelineType: TimelineType;
  closeTimeline: () => void;
}

export const useTimelineModalHeaderData = (
  timelineId: string,
  openToggleRef: React.MutableRefObject<null | HTMLAnchorElement | HTMLButtonElement>
): TimelineModalHeaderData => {
  const dispatch = useDispatch();

  const title = useSelector((state: State) => selectTitleByTimelineById(state, timelineId));
  const { activeTab, timelineType } = useSelector((state: State) =>
    selectTimelineById(state, timelineId)
  );

  const closeTimeline = useCallback(() => {
    if (openToggleRef.current != null) {
      openToggleRef.current.focus();
    }
    createHistoryEntry();
    dispatch(timelineActions.showTimeline({ id: timelineId, show: false }));
  }, [dispatch, openToggleRef, timelineId]);

  return { title, activeTab, timelineType, closeTimeline };
};
