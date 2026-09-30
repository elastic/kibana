/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiCallOut,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiLink,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { css } from '@emotion/react';
import { type EscalationModalRenderProps } from '@kbn/agentic-investigations-common';
import {
  useListEscalations,
  useCreateEscalation,
  useAttachToEscalation,
  useCurrentUserProfile,
  useSuggestUserProfiles,
  useEscalationsForInvestigation,
} from '@kbn/agentic-investigations-plugin/public';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { ALERTZERO_APP_ID } from '@kbn/alertzero-common';
import {
  ESCALATION_MODAL_TRANSLATIONS,
  ESCALATION_ERRORS,
  ESCALATION_SUCCESS,
} from './escalation_modal_translations';
import { SELECTED_CONVERSATION_ID_PARAM } from './conversations_url_params';
import { AddToExistingEscalationForm } from './add_to_existing_escalation_form';
import { CreateEscalationForm } from './create_escalation_form';
import { useAgenticInvestigationsCapabilities } from '../../hooks/use_agentic_investigations_capabilities';

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
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const {
      services: { notifications, application },
    } = useKibana<CoreStart>();

    const { showEscalations } = useAgenticInvestigationsCapabilities();

    const escalationPath = useCallback(
      (escalationId: string) => `/escalations?${SELECTED_CONVERSATION_ID_PARAM}=${escalationId}`,
      []
    );

    const makeViewEscalationPrimary = useCallback(
      (escalationId: string) => {
        const path = escalationPath(escalationId);
        return {
          children: ESCALATION_SUCCESS.linkText,
          href: application.getUrlForApp(ALERTZERO_APP_ID, { path }),
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            void application.navigateToApp(ALERTZERO_APP_ID, { path });
          },
        };
      },
      [application, escalationPath]
    );

    const {
      data: currentUserProfile,
      isLoading: isLoadingUserProfile,
      isError: isUserProfileError,
      refetch: refetchUserProfile,
    } = useCurrentUserProfile();
    const { data: suggestedAssignees = [], isFetching: isSearchingAssignees } =
      useSuggestUserProfiles(assigneeSearch);
    const {
      data: escalationsData,
      isLoading: isLoadingEscalations,
      isError: isEscalationsError,
      error: escalationsError,
      refetch: refetchEscalations,
    } = useListEscalations({ searchQuery: incidentSearch, enabled: showEscalations });

    const { data: existingEscalationsData } = useEscalationsForInvestigation(conversationId, {
      enabled: showEscalations,
    });
    const createEscalation = useCreateEscalation();
    const attachToEscalation = useAttachToEscalation();

    if (!conversationId) return null;

    const existingEscalations = existingEscalationsData?.results ?? [];

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
        style={{ maxWidth: 640, width: '100%', borderRadius: euiTheme.size.s }}
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

          {existingEscalations.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                size="s"
                color="warning"
                iconType="warning"
                title={T.alreadyEscalatedCallout.title(existingEscalations.length)}
                data-test-subj="escalationModalAlreadyEscalatedCallout"
              >
                <ul style={{ marginBottom: 0 }}>
                  {existingEscalations.map((e) => {
                    const path = escalationPath(e.id);
                    return (
                      <li key={e.id}>
                        <EuiLink
                          href={application.getUrlForApp(ALERTZERO_APP_ID, { path })}
                          onClick={(ev: React.MouseEvent) => {
                            ev.preventDefault();
                            void application.navigateToApp(ALERTZERO_APP_ID, { path });
                            onClose();
                          }}
                          data-test-subj={`escalationModalExistingEscalationLink-${e.id}`}
                        >
                          {e.title}
                        </EuiLink>
                      </li>
                    );
                  })}
                </ul>
              </EuiCallOut>
            </>
          )}

          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiCheckableCard
                id="escalation-mode-create"
                label={
                  <EuiTitle size="xs">
                    <h4>{T.modes.create.label}</h4>
                  </EuiTitle>
                }
                checked={mode === 'create'}
                onChange={() => setMode('create')}
                data-test-subj="escalationModalModeCreate"
              >
                <EuiText size="xs" color="subdued">
                  {T.modes.create.description}
                </EuiText>
              </EuiCheckableCard>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiCheckableCard
                id="escalation-mode-add-to-existing"
                label={
                  <EuiTitle size="xs">
                    <h4>{T.modes.addToExisting.label}</h4>
                  </EuiTitle>
                }
                checked={mode === 'addToExisting'}
                onChange={() => setMode('addToExisting')}
                data-test-subj="escalationModalModeAddToExisting"
              >
                <EuiText size="xs" color="subdued">
                  {T.modes.addToExisting.description}
                </EuiText>
              </EuiCheckableCard>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        {mode === 'create' ? (
          <>
            {isLoadingUserProfile && (
              <EuiFlexGroup justifyContent="center" css={{ padding: euiTheme.size.l }}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexGroup>
            )}

            {!isLoadingUserProfile && isUserProfileError && (
              <div css={{ padding: `0 ${euiTheme.size.l} ${euiTheme.size.l}` }}>
                <KbnDangerCallout
                  announceOnMount
                  title={ESCALATION_ERRORS.userProfileLoadFailed}
                  actionProps={{
                    primary: {
                      children: ESCALATION_ERRORS.retryButton,
                      onClick: () => void refetchUserProfile(),
                    },
                  }}
                />
              </div>
            )}

            {!isLoadingUserProfile && !isUserProfileError && currentUserProfile === null && (
              <div css={{ padding: `0 ${euiTheme.size.l} ${euiTheme.size.l}` }}>
                <KbnWarningCallout
                  announceOnMount
                  title={ESCALATION_ERRORS.userProfileUnavailable}
                />
              </div>
            )}

            {!isLoadingUserProfile && !isUserProfileError && !!currentUserProfile && (
              <CreateEscalationForm
                investigationTitle={investigation.title}
                suggestedAssignees={suggestedAssignees}
                isSearchingAssignees={isSearchingAssignees}
                currentUser={currentUserProfile}
                currentUserName={getUserDisplayName(currentUserProfile.user)}
                isSubmitting={createEscalation.isLoading}
                onSearchAssignees={setAssigneeSearch}
                onSubmit={({ title, visibility, assigneeUids }) =>
                  createEscalation.mutate(
                    {
                      linked_investigation_id: conversationId,
                      title,
                      visibility,
                      // For private escalations, assigneeUids already includes the creator uid.
                      // For public escalations, add the creator alone as the sole assignee.
                      assignees:
                        visibility === 'private'
                          ? assigneeUids
                          : [currentUserProfile.uid].filter(
                              (uid): uid is string => typeof uid === 'string' && uid.length > 0
                            ),
                    },
                    {
                      onSuccess: (escalation) => {
                        notifications?.toasts.addSuccess({
                          title: ESCALATION_SUCCESS.createTitle,
                          actionProps: { primary: makeViewEscalationPrimary(escalation.id) },
                        });
                        onClose();
                      },
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
            )}
          </>
        ) : null}

        {mode === 'addToExisting' ? (
          <AddToExistingEscalationForm
            incidents={incidents}
            isLoading={isLoadingEscalations}
            isError={isEscalationsError}
            error={escalationsError}
            onRetry={refetchEscalations}
            searchQuery={incidentSearch}
            onSearchChange={setIncidentSearch}
            onSubmit={(escalationId) =>
              attachToEscalation.mutate(
                { escalationId, linkedInvestigationId: conversationId },
                {
                  onSuccess: () => {
                    notifications?.toasts.addSuccess({
                      title: ESCALATION_SUCCESS.addToTitle,
                      actionProps: { primary: makeViewEscalationPrimary(escalationId) },
                    });
                    onClose();
                  },
                  onError: (err) =>
                    notifications?.toasts.addDanger({
                      title: ESCALATION_ERRORS.addToFailed,
                      text: apiErrorText(err),
                    }),
                }
              )
            }
            isSubmitting={attachToEscalation.isLoading}
            onCancel={onClose}
          />
        ) : null}
      </EuiModal>
    );
  }
);

ConnectedEscalationModal.displayName = 'ConnectedEscalationModal';
