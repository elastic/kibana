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
import {
  buildDataTableRecord,
  type DataTableRecord,
  type EsHitRecord,
  getFieldValue,
} from '@kbn/discover-utils';
import type { SearchHit } from '../../../../common/search_strategy';
import { AddNote } from '../../../notes/components/add_note';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { NOTES_LOADING_TEST_ID } from '../../../notes/components/test_ids';
import { NotesList } from '../../../notes/components/notes_list';
import type { State } from '../../../common/store';
import type { Note } from '../../../../common/api/timeline';
import {
  fetchNotesByDocumentIds,
  makeSelectNotesByDocumentId,
  ReqStatus,
  selectFetchNotesByDocumentIdsError,
  selectFetchNotesByDocumentIdsStatus,
} from '../../../notes/store/notes.slice';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { AlertDataContext } from '../../../flyout_v2/investigation_guide/components/investigation_guide_view';

export const FETCH_NOTES_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.left.notes.fetchNotesErrorLabel',
  {
    defaultMessage: 'Error fetching notes',
  }
);
export type NotesDocumentType = 'attack' | 'alert' | 'event';

export const NO_NOTES = (documentType: NotesDocumentType) =>
  i18n.translate('xpack.securitySolution.flyout.left.notes.noNotesLabel', {
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
   * Document id used to fetch and associate notes (e.g. eventId or attackId).
   */
  documentId: string;
  /**
   * Raw search hit used to derive isAlert and provide AlertDataContext.
   */
  searchHit: SearchHit;
  /**
   * When provided, enables "Attach to current Timeline" behavior and passes timelineId/onNoteAdd to AddNote.
   */
  timelineConfig?: NotesDetailsContentTimelineConfig;
}

/**
 * Reusable notes list and add-note UI for a single document.
 * Used by both document details and attack details flyout left panels.
 */
export const NotesDetailsContent = memo(
  ({ documentId, searchHit, timelineConfig }: NotesDetailsContentProps) => {
    const { addError: addErrorToast } = useAppToasts();
    const dispatch = useDispatch();
    const { notesPrivileges } = useUserPrivileges();

    const canCreateNotes = notesPrivileges.crud;

    const selectNotesByDocumentId = useMemo(() => makeSelectNotesByDocumentId(), []);
    const notes: Note[] = useSelector((state: State) => selectNotesByDocumentId(state, documentId));
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

    const hit: DataTableRecord = useMemo(
      () => buildDataTableRecord(searchHit as unknown as EsHitRecord),
      [searchHit]
    );

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
          <NotesList notes={notes} options={{ hideFlyoutIcon: true }} />
        )}
        {canCreateNotes && (
          <>
            <EuiSpacer />
            <AddNote eventId={documentId} timelineId={timelineId} onNoteAdd={onNoteAdd}>
              {timelineConfig?.attachToTimelineElement}
            </AddNote>
          </>
        )}
      </AlertDataContext.Provider>
    );
  }
);

NotesDetailsContent.displayName = 'NotesDetailsContent';
