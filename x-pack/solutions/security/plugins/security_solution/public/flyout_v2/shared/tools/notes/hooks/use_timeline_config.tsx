/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { TimelineModel } from '../../../../..';
import type { State } from '../../../../../common/store';
import { timelineSelectors } from '../../../../../timelines/store';
import { TimelineId } from '../../../../../../common/types';
import { TimelineStatusEnum } from '../../../../../../common/api/timeline';
import { pinEvent } from '../../../../../timelines/store/actions';
import { AttachToActiveTimeline } from '../components/attach_to_active_timeline';
import type { NotesDetailsContentTimelineConfig } from '../components/notes_details_content';

/**
 * Builds the `timelineConfig` object required by `NotesDetailsContent` when the document is
 * opened inside the Timeline flyout. Returns `undefined` when the active flyout is not the
 * Timeline flyout, which disables "attach to timeline" behavior in the notes panel.
 */
export const useTimelineConfig = (
  documentId: string,
  isTimelineFlyout: boolean
): NotesDetailsContentTimelineConfig | undefined => {
  const dispatch = useDispatch();
  const [attachToTimeline, setAttachToTimeline] = useState<boolean>(true);

  const timeline: TimelineModel = useSelector((state: State) =>
    timelineSelectors.selectTimelineById(state, TimelineId.active)
  );

  const timelineSavedObjectId = useMemo(
    () => timeline.savedObjectId ?? '',
    [timeline.savedObjectId]
  );

  const isTimelineSaved: boolean = useMemo(
    () => timeline.status === TimelineStatusEnum.active,
    [timeline.status]
  );

  const onNoteAddInTimeline = useCallback(() => {
    const isEventPinned = documentId ? timeline?.pinnedEventIds[documentId] === true : false;
    if (!isEventPinned && documentId && timelineSavedObjectId) {
      dispatch(
        pinEvent({
          id: TimelineId.active,
          eventId: documentId,
        })
      );
    }
  }, [dispatch, documentId, timelineSavedObjectId, timeline.pinnedEventIds]);

  return useMemo(
    () =>
      isTimelineFlyout
        ? {
            timelineSavedObjectId,
            isTimelineSaved,
            onNoteAddInTimeline,
            attachToTimeline,
            setAttachToTimeline,
            attachToTimelineElement: (
              <AttachToActiveTimeline
                setAttachToTimeline={setAttachToTimeline}
                isCheckboxDisabled={!isTimelineSaved}
              />
            ),
          }
        : undefined,

    [
      isTimelineFlyout,
      timelineSavedObjectId,
      isTimelineSaved,
      onNoteAddInTimeline,
      attachToTimeline,
    ]
  );
};
