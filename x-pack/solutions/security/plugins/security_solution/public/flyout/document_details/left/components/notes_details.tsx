/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import type { TimelineModel } from '../../../..';
import { Flyouts } from '../../shared/constants/flyouts';
import { timelineSelectors } from '../../../../timelines/store';
import { TimelineId } from '../../../../../common/types';
import { AttachToActiveTimeline } from './attach_to_active_timeline';
import { AddNote } from '../../../../notes/components/add_note';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { NOTES_LOADING_TEST_ID } from '../../../../notes/components/test_ids';
import { NotesList } from '../../../../notes/components/notes_list';
import { pinEvent } from '../../../../timelines/store/actions';
import type { State } from '../../../../common/store';
import type { Note } from '../../../../../common/api/timeline';
import { TimelineStatusEnum } from '../../../../../common/api/timeline';
import {
  fetchNotesByDocumentIds,
  ReqStatus,
  selectFetchNotesByDocumentIdsError,
  selectFetchNotesByDocumentIdsStatus,
  selectSortedNotesByDocumentId,
} from '../../../../notes/store/notes.slice';
import { useDocumentDetailsContext } from '../../shared/context';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import { BasicAlertDataContext } from './investigation_guide_view';
import { useInvestigationGuide } from '../../shared/hooks/use_investigation_guide';

export const FETCH_NOTES_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.fetchNotesErrorLabel',
  {
    defaultMessage: 'Error fetching notes',
  }
);
export const NO_NOTES = (isAlert: boolean) =>
  i18n.translate('xpack.securitySolution.flyout.left.notes.noNotesLabel', {
    defaultMessage: 'No notes have been created for this {value}.',
    values: { value: isAlert ? 'alert' : 'event' },
  });

/**
 * List all the notes for a document id and allows to create new notes associated with that document.
 * Displayed in the document details expandable flyout left section.
 */
export const NotesDetails = memo(() => {
  const { addError: addErrorToast } = useAppToasts();
  const dispatch = useDispatch();
  const { eventId, dataFormattedForFieldBrowser } = useDocumentDetailsContext();
  const { kibanaSecuritySolutionsPrivileges } = useUserPrivileges();
  const { basicAlertData: basicData } = useInvestigationGuide({
    dataFormattedForFieldBrowser,
  });

  const canCreateNotes = kibanaSecuritySolutionsPrivileges.crud;

  // will drive the value we send to the AddNote component
  // if true (timeline is saved and the user kept the checkbox checked) we'll send the timelineId to the AddNote component
  // if false (timeline is not saved or the user unchecked the checkbox manually ) we'll send an empty string
  const [attachToTimeline, setAttachToTimeline] = useState<boolean>(true);

  // if the flyout is open from a timeline and that timeline is saved, we automatically check the checkbox to associate the note to it
  const isTimelineFlyout = useWhichFlyout() === Flyouts.timeline;

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

  // Automatically pin an associated event if it's attached to a timeline and it's not pinned yet
  const onNoteAddInTimeline = useCallback(() => {
    const isEventPinned = eventId ? timeline?.pinnedEventIds[eventId] === true : false;
    if (!isEventPinned && eventId && timelineSavedObjectId) {
      dispatch(
        pinEvent({
          id: TimelineId.active,
          eventId,
        })
      );
    }
  }, [dispatch, eventId, timelineSavedObjectId, timeline.pinnedEventIds]);

  const notes: Note[] = useSelector((state: State) =>
    selectSortedNotesByDocumentId(state, {
      documentId: eventId,
      sort: { field: 'created', direction: 'asc' },
    })
  );
  const fetchStatus = useSelector((state: State) => selectFetchNotesByDocumentIdsStatus(state));
  const fetchError = useSelector((state: State) => selectFetchNotesByDocumentIdsError(state));

  const fetchNotes = useCallback(
    () => dispatch(fetchNotesByDocumentIds({ documentIds: [eventId] })),
    [dispatch, eventId]
  );

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // show a toast if the fetch notes call fails
  useEffect(() => {
    if (fetchStatus === ReqStatus.Failed && fetchError) {
      addErrorToast(null, {
        title: FETCH_NOTES_ERROR,
      });
    }
  }, [addErrorToast, fetchError, fetchStatus]);

  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const noNotesMessage = useMemo(
    () => (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <p>{NO_NOTES(isAlert)}</p>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [isAlert]
  );

  return (
    <BasicAlertDataContext.Provider value={basicData}>
      {fetchStatus === ReqStatus.Loading && (
        <EuiLoadingElastic data-test-subj={NOTES_LOADING_TEST_ID} size="xxl" />
      )}
      {fetchStatus === ReqStatus.Succeeded && notes.length === 0 ? (
        <>{noNotesMessage}</>
      ) : (
        <NotesList notes={notes} options={{ hideFlyoutIcon: true }} />
      )}
      {canCreateNotes && (
        <>
          <EuiSpacer />
          <AddNote
            eventId={eventId}
            timelineId={isTimelineFlyout && attachToTimeline ? timelineSavedObjectId : ''}
            onNoteAdd={isTimelineFlyout && attachToTimeline ? onNoteAddInTimeline : undefined}
          >
            {isTimelineFlyout && (
              <AttachToActiveTimeline
                setAttachToTimeline={setAttachToTimeline}
                isCheckboxDisabled={!isTimelineSaved}
              />
            )}
          </AddNote>
        </>
      )}
    </BasicAlertDataContext.Provider>
  );
});

NotesDetails.displayName = 'NotesDetails';
