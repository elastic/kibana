/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiComment,
  EuiCommentList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../common/lib/kibana';
import {
  ADD_NOTE_BUTTON_DISABLE_REASON_TEST_ID,
  ADD_NOTE_BUTTON_TEST_ID,
  ADD_NOTE_MARKDOWN_TEST_ID,
} from './test_ids';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import type { State } from '../../common/store';
import {
  createNote,
  ReqStatus,
  selectCreateNoteError,
  selectCreateNoteStatus,
  userClosedCreateErrorToast,
} from '../store/notes.slice';
import { MarkdownEditor } from '../../common/components/markdown_editor';
import { NotesEventTypes } from '../../common/lib/telemetry';

export const MARKDOWN_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.notes.addNote.markdownAriaLabel',
  {
    defaultMessage: 'Note',
  }
);
export const ADD_NOTE_BUTTON = i18n.translate('xpack.securitySolution.notes.addNote.buttonLabel', {
  defaultMessage: 'Add note',
});
export const CREATE_NOTE_ERROR = i18n.translate(
  'xpack.securitySolution.notes.createNote.errorLabel',
  {
    defaultMessage: 'Error create note',
  }
);

export interface AddNewNoteProps {
  /**
   * Id of the document
   */
  eventId?: string;
  /**
   * Id of the timeline
   */
  timelineId?: string | null | undefined;
  /**
   * Allows to override the default state of the add note button
   */
  disableButton?: boolean;
  /**
   * disable reason
   */
  disableReason?: string;
  /**
   * Children to render between the markdown and the add note button
   */
  children?: React.ReactNode;
  /*
   * Callback to execute when a new note is added
   */
  onNoteAdd?: () => void;
}

/**
 * Renders a markdown editor and an add button to create new notes.
 * The checkbox is automatically checked if the flyout is opened from a timeline and that timeline is saved. It is disabled if the flyout is NOT opened from a timeline.
 */
export const AddNote = memo(
  ({
    eventId,
    timelineId,
    disableButton = false,
    disableReason,
    children,
    onNoteAdd,
  }: AddNewNoteProps) => {
    const { telemetry } = useKibana().services;
    const dispatch = useDispatch();
    const { addError: addErrorToast } = useAppToasts();
    const [editorValue, setEditorValue] = useState('');
    const [isMarkdownInvalid, setIsMarkdownInvalid] = useState(false);

    const createStatus = useSelector((state: State) => selectCreateNoteStatus(state));
    const createError = useSelector((state: State) => selectCreateNoteError(state));

    const addNote = useCallback(() => {
      dispatch(
        createNote({
          note: {
            timelineId: timelineId || '',
            eventId: eventId || '',
            note: editorValue,
          },
        })
      );
      if (onNoteAdd) {
        onNoteAdd();
      }
      telemetry.reportEvent(NotesEventTypes.AddNoteFromExpandableFlyoutClicked, {
        isRelatedToATimeline: timelineId != null,
      });
      setEditorValue('');
    }, [dispatch, editorValue, eventId, telemetry, timelineId, onNoteAdd]);

    const resetError = useCallback(() => {
      dispatch(userClosedCreateErrorToast());
    }, [dispatch]);

    // show a toast if the create note call fails
    useEffect(() => {
      if (createStatus === ReqStatus.Failed && createError) {
        addErrorToast(createError, {
          title: CREATE_NOTE_ERROR,
        });
        resetError();
      }
    }, [addErrorToast, createError, createStatus, resetError]);

    const isButtonDisabled = useMemo(
      () => disableButton || editorValue.trim().length === 0 || isMarkdownInvalid,
      [disableButton, editorValue, isMarkdownInvalid]
    );

    return (
      <>
        <EuiCommentList>
          <EuiComment username="">
            <MarkdownEditor
              dataTestSubj={ADD_NOTE_MARKDOWN_TEST_ID}
              value={editorValue}
              onChange={setEditorValue}
              ariaLabel={MARKDOWN_ARIA_LABEL}
              setIsMarkdownInvalid={setIsMarkdownInvalid}
            />
          </EuiComment>
        </EuiCommentList>
        <EuiSpacer size="m" />
        {children && (
          <>
            {children}
            <EuiSpacer size="m" />
          </>
        )}
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexEnd"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiToolTip
              data-test-subj={ADD_NOTE_BUTTON_DISABLE_REASON_TEST_ID}
              content={isButtonDisabled ? disableReason : null}
              position="top"
              repositionOnScroll={true}
            >
              <EuiButton
                onClick={addNote}
                isLoading={createStatus === ReqStatus.Loading}
                disabled={isButtonDisabled}
                data-test-subj={ADD_NOTE_BUTTON_TEST_ID}
              >
                {ADD_NOTE_BUTTON}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

AddNote.displayName = 'AddNote';
