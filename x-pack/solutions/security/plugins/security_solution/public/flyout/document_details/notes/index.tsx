/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { OpenInvestigatedDocument } from '../shared/components/open_investigated_document';
import { FlyoutBody } from '../../shared/components/flyout_body';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useInvestigationGuide } from '../shared/hooks/use_investigation_guide';
import type { State } from '../../../common/store';
import { type Note } from '../../../../common/api/timeline';
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

  // Automatically pin an associated event if it's attached to a timeline and it's not pinned yet
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
            <AddNote eventId={eventId} timelineId={''} onNoteAdd={undefined} />
          </>
        )}
      </BasicAlertDataContext.Provider>
    </FlyoutBody>
  );
});

NotesPanel.displayName = 'NotesPanel';
