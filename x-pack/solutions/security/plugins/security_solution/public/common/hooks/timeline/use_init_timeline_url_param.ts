/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { safeDecode } from '@kbn/rison';
import { useSelector } from 'react-redux-v7';

import type { State } from '../../store';
import { TimelineId } from '../../../../common/types';
import { useInitializeUrlParam } from '../../utils/global_query_string';
import { useQueryTimelineById } from '../../../timelines/components/open_timeline/helpers';
import { useOpenSuperTimeline } from '../../../timelines/components/super_timeline/use_open_super_timeline';
import type { TimelineModel, TimelineUrl } from '../../../timelines/store/model';
import { selectTimelineById } from '../../../timelines/store/selectors';
import { URL_PARAM_KEY } from '../use_url_state';

export const useInitTimelineFromUrlParam = () => {
  const queryTimelineById = useQueryTimelineById();
  const { openSuperTimeline } = useOpenSuperTimeline();
  const activeTimeline = useSelector((state: State) =>
    selectTimelineById(state, TimelineId.active)
  );

  const onInitialize = useCallback(
    (initialState: TimelineUrl | null) => {
      if (initialState != null) {
        if (initialState.superTimelineSourceIds?.length) {
          openSuperTimeline(initialState.superTimelineSourceIds);
        } else {
          queryTimelineById({
            activeTimelineTab: initialState.activeTab,
            duplicate: false,
            timelineId: initialState.id,
            openTimeline: initialState.isOpen,
            savedSearchId: initialState.savedSearchId,
            query: initialState.query,
          });
        }
      }
    },
    [queryTimelineById, openSuperTimeline]
  );

  useEffect(() => {
    const listener = () => {
      const timelineState = new URLSearchParams(window.location.search).get(URL_PARAM_KEY.timeline);

      if (!timelineState) {
        return;
      }

      const parsedState = safeDecode(timelineState) as TimelineUrl | null;

      // Only re-initialize when the URL state differs from the active timeline.
      // Without this guard a popstate event carrying the same timeline param would silently
      // re-load the timeline and discard in-progress edits (filters, data providers, etc.).
      // When there is no active timeline yet, always initialize.
      if (!activeTimeline || hasTimelineStateChanged(activeTimeline, parsedState)) {
        onInitialize(parsedState);
      }
    };

    // This is needed to initialize the timeline from the URL when the user clicks the back / forward buttons
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
  }, [onInitialize, activeTimeline]);

  useInitializeUrlParam(URL_PARAM_KEY.timeline, onInitialize);
};

export function hasTimelineStateChanged(
  activeTimeline: TimelineModel | null,
  newState: TimelineUrl | null
) {
  return (
    activeTimeline &&
    newState &&
    ((activeTimeline.savedObjectId ?? null) !== (newState.id ?? null) ||
      (activeTimeline.savedSearchId ?? null) !== (newState.savedSearchId ?? null) ||
      JSON.stringify([...(activeTimeline.superTimelineSourceIds ?? [])].sort()) !==
        JSON.stringify([...(newState.superTimelineSourceIds ?? [])].sort()))
  );
}
