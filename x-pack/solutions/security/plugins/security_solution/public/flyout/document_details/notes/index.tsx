/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { OpenInvestigatedDocument } from '../shared/components/open_investigated_document';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useInvestigationGuide } from '../shared/hooks/use_investigation_guide';
import { useWhichFlyout } from '../shared/hooks/use_which_flyout';
import { Flyouts } from '../shared/constants/flyouts';
import type { TimelineModel } from '../../..';
import type { State } from '../../../common/store';
import { timelineSelectors } from '../../../timelines/store';
import { TimelineId } from '../../../../common/types';
import { type Note, TimelineStatusEnum } from '../../../../common/api/timeline';
import { pinEvent } from '../../../timelines/store/actions';
import {
  fetchNotesByDocumentIds,
  makeSelectNotesByDocumentId,
  ReqStatus,
  selectFetchNotesByDocumentIdsError,
  selectFetchNotesByDocumentIdsStatus,
} from '../../../notes';
import { useBasicDataFromDetailsData } from '../shared/hooks/use_basic_data_from_details_data';
import { NOTES_LOADING_TEST_ID } from '../../../notes/components/test_ids';
import { NotesList } from '../../../notes/components/notes_list';
import { AddNote } from '../../../notes/components/add_note';
import { AttachToActiveTimeline } from './components/attach_to_active_timeline';
import type { DocumentDetailsProps } from '../shared/types';
import { useDocumentDetailsContext } from '../shared/context';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { BasicAlertDataContext } from '../investigation_guide/components/investigation_guide_view';

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

export const NotesPanel: FC<Partial<DocumentDetailsProps>> = memo(({ path }) => {
  const { euiTheme } = useEuiTheme();
  const { addError: addErrorToast } = useAppToasts();
  const dispatch = useDispatch();
  const { eventId, dataFormattedForFieldBrowser, indexName, scopeId } = useDocumentDetailsContext();
  const { notesPrivileges } = useUserPrivileges();
  const { basicAlertData: basicData } = useInvestigationGuide({
    dataFormattedForFieldBrowser,
  });

  const canCreateNotes = notesPrivileges.crud;

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
  const selectNotesByDocumentId = useMemo(() => makeSelectNotesByDocumentId(), []);
  const notes: Note[] = useSelector((state: State) => selectNotesByDocumentId(state, eventId));
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
    <FlyoutBody
      css={css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <OpenInvestigatedDocument eventId={eventId} indexName={indexName} scopeId={scopeId} />
        </EuiFlexItem>
      </EuiFlexGroup>
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
    </FlyoutBody>
  );
});

NotesPanel.displayName = 'NotesPanel';
