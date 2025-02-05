/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { InvestigationNoteResponse } from '@kbn/investigation-shared';
import { UserProfile } from '@kbn/security-plugin/common';
import React, { useState } from 'react';
import moment from 'moment';
import { useTheme } from '../../../../hooks/use_theme';
import { useInvestigation } from '../../contexts/investigation_context';
import { EditNoteForm } from './edit_note_form';
import { useDeleteInvestigationNote } from '../../../../hooks/use_delete_investigation_note';

const textContainerClassName = css`
  padding-top: 2px;
`;

interface Props {
  note: InvestigationNoteResponse;
  isOwner: boolean;
  userProfile?: UserProfile;
  userProfileLoading: boolean;
}

export function Note({ note, isOwner, userProfile, userProfileLoading }: Props) {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const { investigation } = useInvestigation();
  const { mutate: deleteNote, isLoading: isDeletingNote } = useDeleteInvestigationNote();

  const onDeleteNote = () => {
    deleteNote({ investigationId: investigation!.id, noteId: note.id });
  };

  const timelineContainerClassName = css`
    padding-bottom: 16px;
    border-bottom: 1px solid ${theme.colors.lightShade};
    :last-child {
      border-bottom: 0px;
    }
  `;

  const actionButtonClassname = css`
    color: ${theme.colors.mediumShade};
    :hover {
      color: ${theme.colors.darkShade};
    }
  `;

  const timestampClassName = css`
    color: ${theme.colors.darkShade};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" className={timelineContainerClassName}>
      <EuiFlexGroup direction="row" justifyContent="spaceBetween">
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            {userProfileLoading ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <EuiText size="s">
                {userProfile?.user.full_name ?? userProfile?.user.username ?? note?.createdBy}
              </EuiText>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" className={timestampClassName}>
              {moment(new Date(note.createdAt)).fromNow()}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        {isOwner && (
          <EuiFlexGroup direction="row" justifyContent="flexEnd" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="editInvestigationNoteButton"
                size="s"
                iconSize="s"
                iconType="pencil"
                disabled={isDeletingNote}
                onClick={() => {
                  setIsEditing(!isEditing);
                }}
                className={actionButtonClassname}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconSize="s"
                iconType="trash"
                disabled={isDeletingNote}
                onClick={onDeleteNote}
                data-test-subj="deleteInvestigationNoteButton"
                className={actionButtonClassname}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
      <EuiFlexItem className={textContainerClassName}>
        {isEditing ? (
          <EditNoteForm note={note} onClose={() => setIsEditing(false)} />
        ) : (
          <EuiText size="s">
            <EuiMarkdownFormat textSize="s">{note.content}</EuiMarkdownFormat>
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
