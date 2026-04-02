/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { FormattedCount } from '../../../common/components/formatted_number';
import type { State } from '../../../common/store';
import type { Note } from '../../../../common/api/timeline';
import {
  fetchNotesByDocumentIds,
  ReqStatus,
  selectFetchNotesByDocumentIdsError,
  selectFetchNotesByDocumentIdsStatus,
  selectNotesByDocumentId,
} from '../../../notes/store/notes.slice';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { AlertHeaderBlock } from '../../../flyout_v2/shared/components/alert_header_block';

export const FETCH_NOTES_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.right.notes.fetchNotesErrorLabel',
  {
    defaultMessage: 'Error fetching notes',
  }
);
const ADD_NOTE_BUTTON = i18n.translate(
  'xpack.securitySolution.flyout.right.notes.addNoteButtonLabel',
  {
    defaultMessage: 'Add note',
  }
);
const VIEW_NOTES_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.right.notes.viewNoteButtonAriaLabel',
  {
    defaultMessage: 'View notes',
  }
);

export interface NotesHeaderTestIds {
  title: string;
  addNoteButton: string;
  viewNotesButton: string;
  addNoteIconButton: string;
  count: string;
  loading: string;
}

export interface NotesHeaderProps {
  /**
   * Document id used to fetch and display notes (e.g. eventId or attackId).
   */
  documentId: string;
  /**
   * Called when the user clicks to open the notes tab (View notes / Add note).
   */
  onOpenNotesTab: () => void;
  /**
   * When true, the block shows a dash and does not fetch notes (e.g. rule preview).
   */
  disabled?: boolean;
  /**
   * Test ids for the notes header block. Required so each flyout can use its own.
   */
  testIds: NotesHeaderTestIds;
}

/**
 * Reusable notes block for flyout headers. Shows note count and buttons to open the notes tab.
 * Used by both document details and attack details flyouts.
 */
export const NotesHeader = memo(
  ({ documentId, onOpenNotesTab, disabled = false, testIds }: NotesHeaderProps) => {
    const { euiTheme } = useEuiTheme();
    const dispatch = useDispatch();
    const { addError: addErrorToast } = useAppToasts();
    const { notesPrivileges } = useUserPrivileges();

    const cannotAddNotes = disabled || !notesPrivileges.crud;
    const cannotReadNotes = disabled || !notesPrivileges.read;

    useEffect(() => {
      if (!cannotReadNotes) {
        dispatch(fetchNotesByDocumentIds({ documentIds: [documentId] }));
      }
    }, [dispatch, documentId, cannotReadNotes]);

    const fetchStatus = useSelector((state: State) => selectFetchNotesByDocumentIdsStatus(state));
    const fetchError = useSelector((state: State) => selectFetchNotesByDocumentIdsError(state));
    const notes: Note[] = useSelector((state: State) => selectNotesByDocumentId(state, documentId));

    useEffect(() => {
      if (fetchStatus === ReqStatus.Failed && fetchError) {
        addErrorToast(null, {
          title: FETCH_NOTES_ERROR,
        });
      }
    }, [addErrorToast, fetchError, fetchStatus]);

    const viewNotesButton = useMemo(
      () => (
        <EuiButtonEmpty
          onClick={onOpenNotesTab}
          size="s"
          disabled={cannotReadNotes}
          aria-label={VIEW_NOTES_BUTTON_ARIA_LABEL}
          data-test-subj={testIds.viewNotesButton}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.notes.viewNoteButtonLabel"
            defaultMessage="View {count, plural, one {note} other {notes}}"
            values={{ count: notes.length }}
          />
        </EuiButtonEmpty>
      ),
      [cannotReadNotes, notes.length, onOpenNotesTab, testIds.viewNotesButton]
    );

    const addNoteButton = useMemo(
      () => (
        <EuiButtonEmpty
          iconType="plusInCircle"
          onClick={onOpenNotesTab}
          size="s"
          disabled={cannotAddNotes}
          aria-label={ADD_NOTE_BUTTON}
          data-test-subj={testIds.addNoteButton}
        >
          {ADD_NOTE_BUTTON}
        </EuiButtonEmpty>
      ),
      [cannotAddNotes, onOpenNotesTab, testIds.addNoteButton]
    );

    const addNoteButtonIcon = useMemo(
      () => (
        <EuiButtonIcon
          onClick={onOpenNotesTab}
          iconType="plusInCircle"
          disabled={cannotAddNotes}
          css={css`
            margin-left: ${euiTheme.size.xs};
          `}
          aria-label={ADD_NOTE_BUTTON}
          data-test-subj={testIds.addNoteIconButton}
        />
      ),
      [euiTheme.size.xs, cannotAddNotes, onOpenNotesTab, testIds.addNoteIconButton]
    );

    return (
      <AlertHeaderBlock
        hasBorder
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.header.notesTitle"
            defaultMessage="Notes"
          />
        }
        data-test-subj={testIds.title}
      >
        {disabled || cannotReadNotes ? (
          getEmptyTagValue()
        ) : (
          <>
            {fetchStatus === ReqStatus.Loading ? (
              <EuiLoadingSpinner data-test-subj={testIds.loading} size="m" />
            ) : (
              <>
                {notes.length === 0 ? (
                  <>{notesPrivileges.crud ? addNoteButton : getEmptyTagValue()}</>
                ) : (
                  <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
                    <EuiFlexItem data-test-subj={testIds.count}>
                      <FormattedCount count={notes.length} />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      {notesPrivileges.crud ? addNoteButtonIcon : viewNotesButton}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
              </>
            )}
          </>
        )}
      </AlertHeaderBlock>
    );
  }
);

NotesHeader.displayName = 'NotesHeader';
