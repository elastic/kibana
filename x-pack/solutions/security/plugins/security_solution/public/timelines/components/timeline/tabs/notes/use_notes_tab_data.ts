/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import type { TimelineModel } from '../../../../..';
import { selectTimelineById, selectIsSuperTimeline } from '../../../../store/selectors';
import {
  fetchNotesBySavedObjectIds,
  makeSelectNotesBySavedObjectId,
  makeSelectNotesBySavedObjectIds,
  selectFetchNotesBySavedObjectIdsStatus,
} from '../../../../../notes';
import type { Note } from '../../../../../../common/api/timeline';
import { TimelineStatusEnum } from '../../../../../../common/api/timeline';
import type { SuperTimelineDescription } from '../../../super_timeline/super_timeline_notes';
import type { State } from '../../../../../common/store';

export interface NotesTabData {
  timeline: TimelineModel;
  isSuperTimeline: boolean;
  notes: Note[];
  fetchStatus: string;
  savedObjectId: string;
  isTimelineSaved: boolean;
  superTimelineSourceIds: string[];
  superTimelineSourceTitles: string[];
  superTimelineDescriptions: SuperTimelineDescription[];
}

/**
 * Centralises all Redux state reads for SuperTimelineNotesTab and RegularNotesTab.
 * Each sub-component destructures only the fields it needs.
 */
export const useNotesTabData = (timelineId: string): NotesTabData => {
  const timeline: TimelineModel = useSelector((state: State) =>
    selectTimelineById(state, timelineId)
  );
  const isSuperTimeline = useSelector((state: State) => selectIsSuperTimeline(state, timelineId));
  const fetchStatus = useSelector((state: State) => selectFetchNotesBySavedObjectIdsStatus(state));

  const savedObjectId = timeline?.savedObjectId ?? '';
  const isTimelineSaved = timeline?.status === TimelineStatusEnum.active;

  const superTimelineSourceIds = useMemo(
    () => timeline?.superTimelineSourceIds ?? [],
    [timeline?.superTimelineSourceIds]
  );
  const superTimelineSourceTitles = useMemo(
    () => timeline?.superTimelineSourceTitles ?? [],
    [timeline?.superTimelineSourceTitles]
  );
  const superTimelineDescriptions: SuperTimelineDescription[] = useMemo(
    () => timeline?.superTimelineDescriptions ?? [],
    [timeline?.superTimelineDescriptions]
  );

  const selectNotesBySavedObjectId = useMemo(() => makeSelectNotesBySavedObjectId(), []);
  const notesForSingle: Note[] = useSelector((state: State) =>
    selectNotesBySavedObjectId(state, savedObjectId)
  );

  const selectNotesBySavedObjectIds = useMemo(() => makeSelectNotesBySavedObjectIds(), []);
  const notesForMulti: Note[] = useSelector((state: State) =>
    selectNotesBySavedObjectIds(state, superTimelineSourceIds)
  );

  const notes = isSuperTimeline ? notesForMulti : notesForSingle;

  const dispatch = useDispatch();
  useEffect(() => {
    if (!isSuperTimeline && isTimelineSaved && savedObjectId) {
      dispatch(fetchNotesBySavedObjectIds({ savedObjectIds: [savedObjectId] }));
    }
  }, [dispatch, isSuperTimeline, isTimelineSaved, savedObjectId]);

  return {
    timeline,
    isSuperTimeline,
    notes,
    fetchStatus,
    savedObjectId,
    isTimelineSaved,
    superTimelineSourceIds,
    superTimelineSourceTitles,
    superTimelineDescriptions,
  };
};
