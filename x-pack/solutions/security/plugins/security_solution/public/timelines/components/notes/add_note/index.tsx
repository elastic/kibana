/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { appActions } from '../../../../common/store/app';
import type { Note } from '../../../../common/lib/note';
import { useCurrentUser } from '../../../../common/lib/kibana';
import type { AssociateNote, UpdateInternalNewNote } from '../helpers';
import { updateAndAssociateNode } from '../helpers';
import * as i18n from '../translations';

import { NewNote } from './new_note';

const AddNotesContainer = styled.div`
  margin-bottom: 5px;
  user-select: none;
`;

AddNotesContainer.displayName = 'AddNotesContainer';

const ButtonsContainer = styled(EuiFlexGroup)`
  margin-top: ${({ theme }) => theme.eui.euiSizeS};
`;

ButtonsContainer.displayName = 'ButtonsContainer';

export const CancelButton = React.memo<{ onCancelAddNote: () => void }>(({ onCancelAddNote }) => (
  <EuiButtonEmpty data-test-subj="cancel" onClick={onCancelAddNote}>
    {i18n.CANCEL}
  </EuiButtonEmpty>
));

CancelButton.displayName = 'CancelButton';

/** Displays an input for entering a new note, with an adjacent "Add" button */
export const AddNote = React.memo<{
  associateNote: AssociateNote;
  newNote: string;
  onCancelAddNote?: () => void;
  updateNewNote: UpdateInternalNewNote;
  autoFocusDisabled?: boolean;
}>(({ associateNote, newNote, onCancelAddNote, updateNewNote, autoFocusDisabled = false }) => {
  const dispatch = useDispatch();
  const authenticatedUser = useCurrentUser();
  const [isMarkdownInvalid, setIsMarkdownInvalid] = useState(false);
  const updateNote = useCallback(
    (note: Note) => dispatch(appActions.updateNote({ note })),
    [dispatch]
  );

  const handleClick = useCallback(() => {
    const user = authenticatedUser?.username;
    if (user) {
      updateAndAssociateNode({
        associateNote,
        newNote,
        updateNewNote,
        updateNote,
        user,
      });
    }
  }, [associateNote, newNote, updateNewNote, updateNote, authenticatedUser]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // when editing notes, the row-level keyboard handlers shall not
      // receive keyboard events
      e.stopPropagation();

      if (e.key === 'Escape' && onCancelAddNote != null) {
        onCancelAddNote();
      }
    },
    [onCancelAddNote]
  );

  const isAddNoteDisabled = useMemo(() => {
    return newNote.trim().length === 0 || isMarkdownInvalid;
  }, [newNote, isMarkdownInvalid]);

  return (
    <AddNotesContainer onKeyDown={onKeyDown} role="dialog">
      <div style={{ width: '100%' }}>
        <EuiScreenReaderOnly data-test-subj="screenReaderOnly">
          <p>{i18n.YOU_ARE_EDITING_A_NOTE}</p>
        </EuiScreenReaderOnly>
        <NewNote
          note={newNote}
          noteInputHeight={200}
          updateNewNote={updateNewNote}
          autoFocusDisabled={autoFocusDisabled}
          setIsMarkdownInvalid={setIsMarkdownInvalid}
        />
        <ButtonsContainer gutterSize="none">
          {onCancelAddNote != null ? (
            <EuiFlexItem grow={false}>
              <CancelButton onCancelAddNote={onCancelAddNote} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="add-note"
              isDisabled={isAddNoteDisabled}
              fill={true}
              onClick={handleClick}
            >
              {i18n.ADD_NOTE}
            </EuiButton>
          </EuiFlexItem>
        </ButtonsContainer>
      </div>
    </AddNotesContainer>
  );
});

AddNote.displayName = 'AddNote';
