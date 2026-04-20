/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { AttachmentType } from '@kbn/cases-plugin/common';
import type { ClientMessage } from '@kbn/elastic-assistant';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { removeContentReferences } from '@kbn/elastic-assistant-common';
import { useAssistantAvailability } from '../use_assistant_availability';
import { useKibana, useToasts } from '../../common/lib/kibana';
import type { Note } from '../../common/lib/note';
import { appActions } from '../../common/store/actions';
import { TimelineId } from '../../../common/types';
import { updateAndAssociateNode } from '../../timelines/components/notes/helpers';
import { timelineActions } from '../../timelines/store';
import * as i18n from './translations';

interface Props {
  message: ClientMessage;
}

/**
 * Returns the content of the message compatible with a standard markdown renderer.
 *
 * Content references are removed as they can only be rendered by the assistant.
 */
function getSelfContainedContent(content: string): string {
  return removeContentReferences(content).trim();
}

const CommentActionsComponent: React.FC<Props> = ({ message }) => {
  const toasts = useToasts();
  const { cases } = useKibana().services;
  const dispatch = useDispatch();
  const { hasSearchAILakeConfigurations } = useAssistantAvailability();

  const associateNote = useCallback(
    (noteId: string) => dispatch(timelineActions.addNote({ id: TimelineId.active, noteId })),
    [dispatch]
  );

  const updateNote = useCallback(
    (note: Note) => dispatch(appActions.updateNote({ note })),
    [dispatch]
  );

  const content = message.content ?? '';

  const onAddNoteToTimeline = useCallback(() => {
    updateAndAssociateNode({
      associateNote,
      newNote: getSelfContainedContent(content),
      updateNewNote: () => {},
      updateNote,
      user: '', // TODO: attribute assistant messages
    });

    toasts.addSuccess(i18n.ADDED_NOTE_TO_TIMELINE);
  }, [associateNote, toasts, updateNote, content]);

  // Attach to case support
  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal({
    onClose: () => {},
    onSuccess: () => {},
  });

  const onAddToExistingCase = useCallback(() => {
    selectCaseModal.open({
      getAttachments: () => [
        {
          comment: getSelfContainedContent(content),
          type: AttachmentType.user,
          owner: i18n.ELASTIC_AI_ASSISTANT,
        },
      ],
    });
  }, [selectCaseModal, content]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      {!hasSearchAILakeConfigurations && (
        <EuiFlexItem grow={false} data-test-subj="addMessageContentAsTimelineNote">
          <EuiToolTip position="top" content={i18n.ADD_NOTE_TO_TIMELINE}>
            <EuiButtonIcon
              aria-label={i18n.ADD_MESSAGE_CONTENT_AS_TIMELINE_NOTE}
              color="primary"
              iconType="comment"
              onClick={onAddNoteToTimeline}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false} data-test-subj="addToExistingCaseButton">
        <EuiToolTip
          position="top"
          content={i18n.ADD_TO_CASE_EXISTING_CASE}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            aria-label={i18n.ADD_TO_CASE_EXISTING_CASE}
            color="primary"
            iconType="addDataApp"
            onClick={onAddToExistingCase}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const CommentActions = React.memo(CommentActionsComponent);
