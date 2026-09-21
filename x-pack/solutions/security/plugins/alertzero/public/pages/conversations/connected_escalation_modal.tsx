/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { type EscalationModalRenderProps } from '@kbn/agentic-investigations-common';
import {
  useListEscalations,
  useCreateEscalation,
  useAddToEscalation,
  useCurrentUserProfile,
  useSuggestUserProfiles,
} from '@kbn/agentic-investigations-plugin/public';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { ESCALATION_MODAL_TRANSLATIONS } from './translations';
import { AddToExistingEscalationForm } from './add_to_existing_escalation_form';
import { CreateEscalationForm } from './create_escalation_form';
import { ESCALATION_ERRORS } from './translations';

const T = ESCALATION_MODAL_TRANSLATIONS;

const apiErrorText = (error: unknown): string | undefined => {
  if (isHttpFetchError(error)) {
    const body = error.body as { message?: unknown } | undefined;
    if (typeof body?.message === 'string') return body.message;
  }
};

export const ConnectedEscalationModal = memo<EscalationModalRenderProps>(
  ({ mode: initialMode, investigation, onClose }) => {
    const conversationId = investigation.conversationId;
    const { euiTheme } = useEuiTheme();
    const [mode, setMode] = useState(initialMode);
    const [incidentSearch, setIncidentSearch] = useState('');
    const [collaboratorSearch, setCollaboratorSearch] = useState('');
    const {
      services: { notifications },
    } = useKibana<CoreStart>();

    const { data: currentUserProfile } = useCurrentUserProfile();
    const { data: suggestedCollaborators = [], isFetching: isSearchingCollaborators } =
      useSuggestUserProfiles(collaboratorSearch);
    const {
      data: escalationsData,
      isLoading: isLoadingEscalations,
      isError: isEscalationsError,
      refetch: refetchEscalations,
    } = useListEscalations(incidentSearch);
    const createEscalation = useCreateEscalation();
    const addToEscalation = useAddToEscalation();

    if (!conversationId) return null;

    const incidents = (escalationsData?.results ?? []).map((e) => {
      const linkedInvestigations = e.metadata?.linked_investigations;
      const linked = Array.isArray(linkedInvestigations) ? linkedInvestigations : [];
      return {
        id: e.id,
        title: e.title,
        linkedInvestigationCount: linked.length,
        alreadyLinked: linked.includes(conversationId),
        // patchMetadata requires owner access; update_access_control uses the same gate.
        canManage: e.permissions.update_access_control,
      };
    });

    return (
      <EuiModal
        onClose={onClose}
        style={{ width: 600 }}
        aria-labelledby="escalationModalTitle"
        data-test-subj="escalationModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id="escalationModalTitle" size="s">
            {T.title}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <div
          css={css`
            padding: 0 ${euiTheme.size.l} ${euiTheme.size.m};
          `}
        >
          <EuiText size="s" color="subdued">
            <p>{T.subtitle(investigation.title)}</p>
          </EuiText>

          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiPanel
                hasBorder
                paddingSize="m"
                css={css`
                  cursor: pointer;
                  ${mode === 'create' ? `border-color: ${euiTheme.colors.primary};` : ''}
                `}
                onClick={() => setMode('create')}
                data-test-subj="escalationModalModeCreate"
              >
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiRadio
                      id="escalation-mode-create"
                      name="escalation-mode"
                      checked={mode === 'create'}
                      onChange={() => setMode('create')}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{T.modes.create.label}</strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {T.modes.create.description}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiPanel
                hasBorder
                paddingSize="m"
                css={css`
                  cursor: pointer;
                  ${mode === 'addToExisting' ? `border-color: ${euiTheme.colors.primary};` : ''}
                `}
                onClick={() => setMode('addToExisting')}
                data-test-subj="escalationModalModeAddToExisting"
              >
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiRadio
                      id="escalation-mode-add-to-existing"
                      name="escalation-mode"
                      checked={mode === 'addToExisting'}
                      onChange={() => setMode('addToExisting')}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{T.modes.addToExisting.label}</strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {T.modes.addToExisting.description}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        {mode === 'create' ? (
          <CreateEscalationForm
            investigationTitle={investigation.title}
            suggestedCollaborators={suggestedCollaborators}
            isSearchingCollaborators={isSearchingCollaborators}
            currentUserUid={currentUserProfile?.uid ?? ''}
            currentUserName={currentUserProfile ? getUserDisplayName(currentUserProfile.user) : ''}
            isSubmitting={createEscalation.isLoading}
            onSearchCollaborators={setCollaboratorSearch}
            onSubmit={({ title, visibility, collaboratorUids }) =>
              createEscalation.mutate(
                {
                  linked_investigation_id: conversationId,
                  title,
                  visibility,
                  collaborators: collaboratorUids,
                },
                {
                  onSuccess: onClose,
                  onError: (err) =>
                    notifications?.toasts.addDanger({
                      title: ESCALATION_ERRORS.createFailed,
                      text: apiErrorText(err),
                    }),
                }
              )
            }
            onCancel={onClose}
          />
        ) : (
          <AddToExistingEscalationForm
            incidents={incidents}
            isLoading={isLoadingEscalations}
            isError={isEscalationsError}
            onRetry={refetchEscalations}
            searchQuery={incidentSearch}
            onSearchChange={setIncidentSearch}
            onSubmit={(escalationId) =>
              addToEscalation.mutate(
                { escalationId, linkedInvestigationId: conversationId },
                {
                  onSuccess: onClose,
                  onError: (err) =>
                    notifications?.toasts.addDanger({
                      title: ESCALATION_ERRORS.addToFailed,
                      text: apiErrorText(err),
                    }),
                }
              )
            }
            isSubmitting={addToEscalation.isLoading}
            onCancel={onClose}
          />
        )}
      </EuiModal>
    );
  }
);

ConnectedEscalationModal.displayName = 'ConnectedEscalationModal';
