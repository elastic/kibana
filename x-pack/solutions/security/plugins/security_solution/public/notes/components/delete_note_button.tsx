/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { DELETE_NOTE_BUTTON_TEST_ID } from './test_ids';
import type { State } from '../../common/store';
import type { Note } from '../../../common/api/timeline';
import {
  ReqStatus,
  selectDeleteNotesError,
  selectDeleteNotesStatus,
  userSelectedNotesForDeletion,
} from '../store/notes.slice';
import { useAppToasts } from '../../common/hooks/use_app_toasts';

export const DELETE_NOTE = i18n.translate('xpack.securitySolution.notes.deleteNote.buttonLabel', {
  defaultMessage: 'Delete note',
});
export const DELETE_NOTE_ERROR = i18n.translate(
  'xpack.securitySolution.notes.deleteNote.errorLabel',
  {
    defaultMessage: 'Error deleting note',
  }
);

export interface DeleteNoteButtonIconProps {
  /**
   * The note that contains the id of the timeline to open
   */
  note: Note;
  /**
   * The index of the note in the list of notes (used to have unique data-test-subj)
   */
  index: number;
}

/**
 * Renders a button to delete a note.
 * This button works in combination with the DeleteConfirmModal.
 */
export const DeleteNoteButtonIcon = memo(({ note, index }: DeleteNoteButtonIconProps) => {
  const dispatch = useDispatch();
  const { addError: addErrorToast } = useAppToasts();

  const deleteStatus = useSelector((state: State) => selectDeleteNotesStatus(state));
  const deleteError = useSelector((state: State) => selectDeleteNotesError(state));
  const [deletingNoteId, setDeletingNoteId] = useState('');

  const deleteNoteFc = useCallback(
    (noteId: string) => {
      dispatch(userSelectedNotesForDeletion(noteId));
      setDeletingNoteId(noteId);
    },
    [dispatch]
  );

  useEffect(() => {
    if (deleteStatus === ReqStatus.Failed && deleteError) {
      addErrorToast(null, {
        title: DELETE_NOTE_ERROR,
      });
    }
  }, [addErrorToast, deleteError, deleteStatus]);

  return (
    <EuiButtonIcon
      data-test-subj={`${DELETE_NOTE_BUTTON_TEST_ID}-${index}`}
      title={DELETE_NOTE}
      aria-label={DELETE_NOTE}
      color="text"
      iconType="trash"
      onClick={() => deleteNoteFc(note.noteId)}
      disabled={deletingNoteId !== note.noteId && deleteStatus === ReqStatus.Loading}
      isLoading={deletingNoteId === note.noteId && deleteStatus === ReqStatus.Loading}
    />
  );
});

DeleteNoteButtonIcon.displayName = 'DeleteNoteButtonIcon';
