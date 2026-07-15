/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { AddNote } from '../../../../../notes/components/add_note';
import { DeleteConfirmModal } from '../../../../../notes/components/delete_confirm_modal';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { NOTES_LOADING_TEST_ID } from '../../../../../notes/components/test_ids';
import { NotesList } from '../../../../../notes/components/notes_list';
import type { State } from '../../../../../common/store';
import type { Note } from '../../../../../../common/api/timeline';
import {
  fetchNotesByDocumentIds,
  makeSelectNotesByDocumentId,
  ReqStatus,
  selectFetchNotesByDocumentIdsError,
  selectFetchNotesByDocumentIdsStatus,
  selectNotesTablePendingDeleteIds,
} from '../../../../../notes/store/notes.slice';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { AlertDataContext } from '../../../../document/tools/investigation_guide/components/investigation_guide_view';

export const FETCH_NOTES_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.notes.fetchNotesErrorLabel',
  {
    defaultMessage: 'Error fetching notes',
  }
);
export type NotesDocumentType = 'attack' | 'alert' | 'event';

export const NO_NOTES = (documentType: NotesDocumentType) =>
  i18n.translate('xpack.securitySolution.flyout.notes.noNotesLabel', {
    defaultMessage: 'No notes have been created for this {value}.',
    values: { value: documentType },
  });

export interface NotesDetailsContentTimelineConfig {
  timelineSavedObjectId: string;
  isTimelineSaved: boolean;
  onNoteAddInTimeline: () => void;
  attachToTimeline: boolean;
  setAttachToTimeline: (v: boolean) => void;
  /** When provided, rendered inside AddNote (e.g. AttachToActiveTimeline) */
  attachToTimelineElement?: React.ReactNode;
}

export interface NotesDetailsContentProps {
  /**
   * Document record used to fetch and associate notes and to derive the document type.
   */
  hit: DataTableRecord;
  /**
   * When provided, enables "Attach to current Timeline" behavior and passes timelineId/onNoteAdd to AddNote.
   */
  timelineConfig?: NotesDetailsContentTimelineConfig;
  /**
   * When true, hides the "open in timeline" icon on each note row.
   */
  hideTimelineIcon: boolean;
}

/**
 * Reusable notes list and add-note UI for a single document.
 * Used by both document details and attack details flyout left panels.
 */
export const NotesDetailsContent = memo(
  ({ hit, timelineConfig, hideTimelineIcon }: NotesDetailsContentProps) => {
    const documentId = hit.raw._id ?? '';
    const { addError: addErrorToast } = useAppToasts();
    const dispatch = useDispatch();
    const { notesPrivileges } = useUserPrivileges();

    const canCreateNotes = notesPrivileges.crud;

    const selectNotesByDocumentId = useMemo(() => makeSelectNotesByDocumentId(), []);
    const notes: Note[] = useSelector((state: State) => selectNotesByDocumentId(state, documentId));
    const pendingDeleteIds = useSelector((state: State) => selectNotesTablePendingDeleteIds(state));
    const fetchStatus = useSelector((state: State) => selectFetchNotesByDocumentIdsStatus(state));
    const fetchError = useSelector((state: State) => selectFetchNotesByDocumentIdsError(state));

    const fetchNotes = useCallback(
      () => dispatch(fetchNotesByDocumentIds({ documentIds: [documentId] })),
      [dispatch, documentId]
    );

    useEffect(() => {
      fetchNotes();
    }, [fetchNotes]);

    useEffect(() => {
      if (fetchStatus === ReqStatus.Failed && fetchError) {
        addErrorToast(null, {
          title: FETCH_NOTES_ERROR,
        });
      }
    }, [addErrorToast, fetchError, fetchStatus]);

    const documentType = useMemo((): NotesDocumentType => {
      const flattened = hit?.flattened ?? {};
      const hasAttackDiscovery = Object.keys(flattened).some((key) =>
        key.includes('attack_discovery')
      );
      if (hasAttackDiscovery) {
        return 'attack';
      }
      const isAlert = Boolean(getFieldValue(hit, 'kibana.alert.rule.uuid') as string);
      return isAlert ? 'alert' : 'event';
    }, [hit]);

    const noNotesMessage = useMemo(
      () => (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <p>{NO_NOTES(documentType)}</p>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      [documentType]
    );

    const timelineId =
      timelineConfig && timelineConfig.attachToTimeline ? timelineConfig.timelineSavedObjectId : '';
    const onNoteAdd =
      timelineConfig && timelineConfig.attachToTimeline
        ? timelineConfig.onNoteAddInTimeline
        : undefined;

    return (
      <AlertDataContext.Provider value={hit}>
        {fetchStatus === ReqStatus.Loading && (
          <EuiLoadingElastic data-test-subj={NOTES_LOADING_TEST_ID} size="xxl" />
        )}
        {fetchStatus === ReqStatus.Succeeded && notes.length === 0 ? (
          <>{noNotesMessage}</>
        ) : (
          <NotesList notes={notes} options={{ hideFlyoutIcon: true, hideTimelineIcon }} />
        )}
        {canCreateNotes && (
          <>
            <EuiSpacer />
            <AddNote eventId={documentId} timelineId={timelineId} onNoteAdd={onNoteAdd}>
              {timelineConfig?.attachToTimelineElement}
            </AddNote>
          </>
        )}
        {pendingDeleteIds.length > 0 && <DeleteConfirmModal />}
      </AlertDataContext.Provider>
    );
  }
);

NotesDetailsContent.displayName = 'NotesDetailsContent';
