/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiAvatar,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModalBody,
  EuiModalFooter,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { UserProfilesSelectable } from '@kbn/user-profile-components';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { ESCALATION_MODAL_TRANSLATIONS } from './escalation_modal_translations';

const T = ESCALATION_MODAL_TRANSLATIONS.createForm;

export interface CreateEscalationFormProps {
  investigationTitle: string;
  suggestedCollaborators: UserProfileWithAvatar[];
  onSearchCollaborators: (query: string) => void;
  isSearchingCollaborators: boolean;
  onSubmit: (params: {
    title: string;
    visibility: 'public' | 'private';
    collaboratorUids: string[];
  }) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  currentUserUid: string;
  currentUserName: string;
}

export const CreateEscalationForm = memo<CreateEscalationFormProps>(
  ({
    investigationTitle,
    suggestedCollaborators,
    onSearchCollaborators,
    isSearchingCollaborators,
    onSubmit,
    isSubmitting,
    onCancel,
    currentUserUid,
    currentUserName,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [title, setTitle] = useState(investigationTitle);
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedCollaborators, setSelectedCollaborators] = useState<UserProfileWithAvatar[]>([]);

    const handleSubmit = useCallback(() => {
      onSubmit({
        title,
        visibility: isPrivate ? 'private' : 'public',
        // The owner uid is always prepended; filter it from the selected list first so
        // a user who picked themselves in the picker is not duplicated in the ACL.
        collaboratorUids: isPrivate
          ? [
              currentUserUid,
              ...selectedCollaborators.filter((p) => p.uid !== currentUserUid).map((p) => p.uid),
            ]
          : [],
      });
    }, [onSubmit, title, isPrivate, currentUserUid, selectedCollaborators]);

    const isSubmitDisabled = isSubmitting || title.trim() === '' || (isPrivate && !currentUserUid);

    return (
      <>
        <EuiModalBody>
          <EuiFormRow fullWidth label={T.titleLabel} helpText={T.titleHelpText}>
            <EuiFieldText
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-test-subj="escalationModalTitleInput"
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s">{T.publicLabel}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={T.visibilityLabel}
                showLabel={false}
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                data-test-subj="escalationModalVisibilitySwitch"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{T.privateLabel}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          {isPrivate && (
            <>
              <EuiSpacer size="m" />
              <EuiTitle size="xxxs">
                <h3
                  css={css`
                    text-transform: uppercase;
                    color: ${euiTheme.colors.subduedText};
                    letter-spacing: 0.05em;
                  `}
                >
                  {T.whoHasAccessLabel}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />

              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                css={css`
                  padding: ${euiTheme.size.s} 0;
                `}
              >
                <EuiFlexItem grow={false}>
                  <EuiAvatar size="s" name={currentUserName} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">{currentUserName}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{T.ownerLabel}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="s" />

              <UserProfilesSelectable
                options={suggestedCollaborators}
                selectedOptions={selectedCollaborators}
                onChange={setSelectedCollaborators}
                onSearchChange={onSearchCollaborators}
                isLoading={isSearchingCollaborators}
                height={200}
                data-test-subj="escalationModalCollaboratorPicker"
              />
            </>
          )}
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel} data-test-subj="escalationModalCancel">
            {ESCALATION_MODAL_TRANSLATIONS.cancelButton}
          </EuiButtonEmpty>
          <EuiButton
            fill
            color="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={isSubmitDisabled}
            data-test-subj="escalationModalCreateEscalation"
          >
            {T.submitButton}
          </EuiButton>
        </EuiModalFooter>
      </>
    );
  }
);

CreateEscalationForm.displayName = 'CreateEscalationForm';
