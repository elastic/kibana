/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiAvatar, EuiComment, EuiCommentList, EuiLoadingElastic } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { DeleteConfirmModal } from './delete_confirm_modal';
import { OpenFlyoutButtonIcon } from './open_flyout_button';
import { OpenTimelineButtonIcon } from './open_timeline_button';
import { DeleteNoteButtonIcon } from './delete_note_button';
import { MarkdownRenderer } from '../../common/components/markdown_editor';
import { ADD_NOTE_LOADING_TEST_ID, NOTE_AVATAR_TEST_ID, NOTES_COMMENT_TEST_ID } from './test_ids';
import type { State } from '../../common/store';
import type { Note } from '../../../common/api/timeline';
import {
  ReqStatus,
  selectCreateNoteStatus,
  selectNotesTablePendingDeleteIds,
} from '../store/notes.slice';
import { useUserPrivileges } from '../../common/components/user_privileges';

export const ADDED_A_NOTE = i18n.translate('xpack.securitySolution.notes.addedANoteLabel', {
  defaultMessage: 'added a note',
});
export const DELETE_NOTE = i18n.translate('xpack.securitySolution.notes.deleteNoteLabel', {
  defaultMessage: 'Delete note',
});

export interface NotesListProps {
  /**
   * The notes to display as a EuiComment
   */
  notes: Note[];
  /**
   * Options to customize the rendering of the notes list
   */
  options?: {
    /**
     * If true, the timeline icon will be hidden (this is useful for the timeline Notes tab)
     */
    hideTimelineIcon?: boolean;
    /**
     * If true, the flyout icon will be hidden (this is useful for the flyout Notes tab)
     */
    hideFlyoutIcon?: boolean;
  };
}

/**
 * Renders a list of notes for the document.
 * If a note belongs to a timeline, a timeline icon will be shown the top right corner.
 * Also, a delete icon is shown in the top right corner to delete a note.
 * When a note is being created, the component renders a loading spinner when the new note is about to be added.
 */
export const NotesList = memo(({ notes, options }: NotesListProps) => {
  const { kibanaSecuritySolutionsPrivileges } = useUserPrivileges();
  const canDeleteNotes = kibanaSecuritySolutionsPrivileges.crud;

  const createStatus = useSelector((state: State) => selectCreateNoteStatus(state));

  const pendingDeleteIds = useSelector(selectNotesTablePendingDeleteIds);
  const isDeleteModalVisible = pendingDeleteIds.length > 0;

  return (
    <>
      <EuiCommentList>
        {notes.map((note, index) => (
          <EuiComment
            data-test-subj={`${NOTES_COMMENT_TEST_ID}-${index}`}
            key={note.noteId}
            username={note.createdBy}
            timestamp={<>{note.created && <FormattedRelative value={new Date(note.created)} />}</>}
            event={ADDED_A_NOTE}
            actions={
              <>
                {note.eventId && !options?.hideFlyoutIcon && (
                  <OpenFlyoutButtonIcon
                    eventId={note.eventId}
                    timelineId={note.timelineId}
                    iconType="arrowRight"
                  />
                )}
                {note.timelineId && note.timelineId.length > 0 && !options?.hideTimelineIcon && (
                  <OpenTimelineButtonIcon note={note} index={index} />
                )}
                {canDeleteNotes && <DeleteNoteButtonIcon note={note} index={index} />}
              </>
            }
            timelineAvatar={
              <EuiAvatar
                data-test-subj={`${NOTE_AVATAR_TEST_ID}-${index}`}
                size="l"
                name={note.updatedBy || '?'}
              />
            }
          >
            <MarkdownRenderer>{note.note || ''}</MarkdownRenderer>
          </EuiComment>
        ))}
        {createStatus === ReqStatus.Loading && (
          <EuiLoadingElastic size="xxl" data-test-subj={ADD_NOTE_LOADING_TEST_ID} />
        )}
      </EuiCommentList>
      {isDeleteModalVisible && <DeleteConfirmModal />}
    </>
  );
});

NotesList.displayName = 'NotesList';
