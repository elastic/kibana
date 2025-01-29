/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { TimelineTabs } from '../../../../../common/types';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { appSelectors } from '../../../../common/store';
import { timelineActions } from '../../../store';

export interface UseNotesInFlyoutArgs {
  eventIdToNoteIds: Record<string, string[]>;
  refetch?: () => void;
  timelineId: string;
  activeTab: TimelineTabs;
}

const EMPTY_STRING_ARRAY: string[] = [];

function isNoteNotNull<T>(note: T | null): note is T {
  return note !== null;
}

export const useNotesInFlyout = (args: UseNotesInFlyoutArgs) => {
  const [isNotesFlyoutVisible, setIsNotesFlyoutVisible] = useState(false);

  const [eventId, setNotesEventId] = useState<string>();

  const closeNotesFlyout = useCallback(() => {
    setIsNotesFlyoutVisible(false);
  }, []);

  const showNotesFlyout = useCallback(() => {
    setIsNotesFlyoutVisible(true);
  }, []);

  const { eventIdToNoteIds, refetch, timelineId, activeTab } = args;

  const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);

  const notesById = useDeepEqualSelector(getNotesByIds);

  useEffect(() => {
    if (activeTab) {
      // if activeTab changes, close the notes flyout
      closeNotesFlyout();
    }
  }, [activeTab, closeNotesFlyout]);

  const dispatch = useDispatch();

  const noteIds: string[] = useMemo(
    () => (eventId && eventIdToNoteIds?.[eventId]) || EMPTY_STRING_ARRAY,
    [eventIdToNoteIds, eventId]
  );

  const associateNote = useCallback(
    (currentNoteId: string) => {
      if (!eventId) return;
      dispatch(
        timelineActions.addNoteToEvent({
          eventId,
          id: timelineId,
          noteId: currentNoteId,
        })
      );
      if (refetch) {
        refetch();
      }
    },
    [dispatch, eventId, refetch, timelineId]
  );

  const notes = useMemo(
    () =>
      noteIds
        .map((currentNoteId) => {
          const note = notesById[currentNoteId];
          if (note) {
            return {
              savedObjectId: note.saveObjectId,
              note: note.note,
              noteId: note.id,
              updated: (note.lastEdit ?? note.created).getTime(),
              updatedBy: note.user,
            };
          } else {
            return null;
          }
        })
        .filter(isNoteNotNull),
    [noteIds, notesById]
  );

  return {
    associateNote,
    notes,
    isNotesFlyoutVisible,
    closeNotesFlyout,
    showNotesFlyout,
    eventId,
    setNotesEventId,
  };
};
