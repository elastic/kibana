/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCard,
  EuiConfirmModal,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import {
  RELAY_APP_CONNECTION_STATUS,
  type RelayAppConnectionStatus,
  type SlackAppWorkspace,
} from '@kbn/significant-events-plugin/common';
import { useRelayAppConnection } from './use_relay_app_connection';
import { SlackConnectionBindings } from './slack_connection_bindings';

interface AppsSectionProps {
  canEdit: boolean;
}

export function AppsSection({ canEdit }: AppsSectionProps) {
  const {
    isLoading,
    hasStatusRequestError,
    available,
    status,
    error,
    workspace,
    isMutating,
    retryStatusRequest,
    connect,
    confirm,
    disconnect,
  } = useRelayAppConnection();

  if (isLoading) {
    return null;
  }

  if (hasStatusRequestError) {
    return (
      <>
        <EuiSpacer />
        <KbnDangerCallout
          announceOnMount
          data-test-subj="nightshiftAppsStatusError"
          title={i18n.translate('xpack.nightshift.settings.apps.statusErrorTitle', {
            defaultMessage: 'Unable to check app availability',
          })}
          text={i18n.translate('xpack.nightshift.settings.apps.statusErrorDescription', {
            defaultMessage:
              'Nightshift could not load the current app status. Check the connection and try again.',
          })}
          actionProps={{
            primary: {
              children: i18n.translate('xpack.nightshift.settings.apps.statusErrorRetry', {
                defaultMessage: 'Try again',
              }),
              iconType: 'refresh',
              onClick: retryStatusRequest,
              'data-test-subj': 'nightshiftAppsStatusRetryButton',
            },
          }}
        />
      </>
    );
  }

  if (!available) {
    return (
      <>
        <EuiSpacer />
        <EuiEmptyPrompt
          data-test-subj="nightshiftAppsUnavailable"
          iconType="info"
          title={
            <h2>
              {i18n.translate('xpack.nightshift.settings.apps.unavailableTitle', {
                defaultMessage: 'Apps are unavailable',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.nightshift.settings.apps.unavailableDescription', {
                defaultMessage:
                  'No Nightshift apps are available in this deployment. Apps require Agent Builder and a configured Relay service.',
              })}
            </p>
          }
        />
      </>
    );
  }

  return (
    <>
      <EuiSpacer />
      <EuiSplitPanel.Outer hasBorder hasShadow={false} css={{ flexShrink: 0 }}>
        <EuiSplitPanel.Inner color="subdued">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.nightshift.settings.apps.sectionTitle', {
                defaultMessage: 'Apps',
              })}
            </h3>
          </EuiTitle>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>
          <EuiFlexGroup gutterSize="l" wrap>
            <EuiFlexItem grow={false} css={{ minWidth: 320, maxWidth: 600 }}>
              <EuiCard
                display="subdued"
                textAlign="left"
                icon={<EuiIcon type="logoSlack" size="xl" aria-hidden={true} />}
                data-test-subj="streamsSlackAppCard"
                title={i18n.translate('xpack.nightshift.settings.apps.slackWorkspaceTitle', {
                  defaultMessage: 'Elastic Slack App',
                })}
                description={i18n.translate('xpack.nightshift.settings.apps.slackCardDescription', {
                  defaultMessage:
                    'Send Significant Event notifications to Slack and invoke Elastic agents from a channel.',
                })}
                footer={
                  <SlackCardFooter
                    status={status}
                    error={error}
                    workspace={workspace}
                    canEdit={canEdit}
                    isMutating={isMutating}
                    onConnect={connect}
                    onConfirm={confirm}
                    onDisconnect={disconnect}
                  />
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
}

interface SlackCardFooterProps {
  status: RelayAppConnectionStatus;
  error?: string;
  workspace?: SlackAppWorkspace;
  canEdit: boolean;
  isMutating: boolean;
  onConnect: () => void;
  onConfirm: (tenantKey: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

function SlackCardFooter({
  status,
  error,
  workspace,
  canEdit,
  isMutating,
  onConnect,
  onConfirm,
  onDisconnect,
}: SlackCardFooterProps) {
  const [showChannels, setShowChannels] = useState(false);

  if (status === RELAY_APP_CONNECTION_STATUS.pendingConfirmation && workspace) {
    return (
      <ConfirmWorkspaceCallout
        workspace={workspace}
        canEdit={canEdit}
        isMutating={isMutating}
        onConfirm={onConfirm}
        onReject={onDisconnect}
      />
    );
  }

  if (status === RELAY_APP_CONNECTION_STATUS.oauthInProgress) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.nightshift.settings.apps.slackAwaitingAuth', {
                  defaultMessage: 'Waiting for authorization…',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="danger"
            onClick={onDisconnect}
            isDisabled={!canEdit || isMutating}
            data-test-subj="streamsSlackAppCancelButton"
          >
            {i18n.translate('xpack.nightshift.settings.apps.slackCancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (status === RELAY_APP_CONNECTION_STATUS.connected) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem grow={false} css={{ width: '100%' }}>
          <EuiFlexGroup
            responsive={false}
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success" iconType="check">
                    {i18n.translate('xpack.nightshift.settings.apps.slackConnected', {
                      defaultMessage: 'Connected',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <DisconnectWorkspaceButton
                    canEdit={canEdit}
                    isMutating={isMutating}
                    onDisconnect={onDisconnect}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType={showChannels ? 'chevronSingleDown' : 'chevronSingleRight'}
                onClick={() => setShowChannels((value) => !value)}
                aria-expanded={showChannels}
                data-test-subj="streamsSlackAppToggleChannelsButton"
              >
                {showChannels
                  ? i18n.translate('xpack.nightshift.settings.apps.slackHideChannels', {
                      defaultMessage: 'Hide channels',
                    })
                  : i18n.translate('xpack.nightshift.settings.apps.slackShowChannels', {
                      defaultMessage: 'Show channels',
                    })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {showChannels && (
          <EuiFlexItem grow={false} css={{ width: '100%' }}>
            <SlackConnectionBindings canEdit={canEdit} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }

  // not_connected or error
  return (
    <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
      {error && (
        <EuiFlexItem grow={false}>
          <KbnDangerCallout announceOnMount size="s" title={error} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          fill
          onClick={onConnect}
          isLoading={isMutating}
          isDisabled={!canEdit || isMutating}
          data-test-subj="streamsSlackAppConnectButton"
        >
          {i18n.translate('xpack.nightshift.settings.apps.slackConnect', {
            defaultMessage: 'Connect Slack',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface ConfirmWorkspaceCalloutProps {
  workspace: SlackAppWorkspace;
  canEdit: boolean;
  isMutating: boolean;
  onConfirm: (tenantKey: string) => Promise<void>;
  onReject: () => Promise<void>;
}

function ConfirmWorkspaceCallout({
  workspace: { tenantKey, name, url },
  canEdit,
  isMutating,
  onConfirm,
  onReject,
}: ConfirmWorkspaceCalloutProps) {
  const listItems = [
    ...(url
      ? [
          {
            title: i18n.translate('xpack.nightshift.settings.apps.slackConfirmWorkspaceUrl', {
              defaultMessage: 'Workspace URL',
            }),
            description: url,
          },
        ]
      : []),
    ...(name
      ? [
          {
            title: i18n.translate('xpack.nightshift.settings.apps.slackConfirmWorkspaceName', {
              defaultMessage: 'Workspace name',
            }),
            description: name,
          },
        ]
      : []),
    {
      title: i18n.translate('xpack.nightshift.settings.apps.slackConfirmWorkspaceTeamId', {
        defaultMessage: 'Team ID',
      }),
      description: tenantKey,
    },
  ];

  return (
    <KbnWarningCallout
      size="s"
      data-test-subj="streamsSlackAppConfirmWorkspace"
      title={i18n.translate('xpack.nightshift.settings.apps.slackConfirmWorkspaceTitle', {
        defaultMessage: 'Confirm the Slack workspace',
      })}
      text={i18n.translate('xpack.nightshift.settings.apps.slackConfirmWorkspaceDescription', {
        defaultMessage:
          'Slack authorized the workspace below. Check the workspace URL, since anyone can choose a workspace name. Confirm only if this is the workspace you meant to connect.',
      })}
      actionProps={{
        primary: {
          children: i18n.translate('xpack.nightshift.settings.apps.slackConfirmWorkspaceConfirm', {
            defaultMessage: 'Confirm workspace',
          }),
          // Failures are surfaced via a toast in useRelayAppConnection.
          onClick: () => void onConfirm(tenantKey).catch(() => undefined),
          isDisabled: !canEdit || isMutating,
          'data-test-subj': 'streamsSlackAppConfirmWorkspaceButton',
        },
        secondary: {
          children: i18n.translate('xpack.nightshift.settings.apps.slackConfirmWorkspaceReject', {
            defaultMessage: 'Not my workspace',
          }),
          onClick: () => void onReject().catch(() => undefined),
          isDisabled: !canEdit || isMutating,
          'data-test-subj': 'streamsSlackAppRejectWorkspaceButton',
        },
      }}
    >
      <EuiDescriptionList type="column" compressed listItems={listItems} />
    </KbnWarningCallout>
  );
}

interface DisconnectWorkspaceButtonProps {
  canEdit: boolean;
  isMutating: boolean;
  onDisconnect: () => Promise<void>;
}

function DisconnectWorkspaceButton({
  canEdit,
  isMutating,
  onDisconnect,
}: DisconnectWorkspaceButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  return (
    <>
      <EuiButtonEmpty
        size="s"
        color="danger"
        onClick={() => setConfirmOpen(true)}
        isLoading={isMutating}
        isDisabled={!canEdit || isMutating}
        data-test-subj="streamsSlackAppDisconnectButton"
      >
        {i18n.translate('xpack.nightshift.settings.apps.slackDisconnect', {
          defaultMessage: 'Disconnect workspace',
        })}
      </EuiButtonEmpty>
      {confirmOpen && (
        <EuiConfirmModal
          title={i18n.translate('xpack.nightshift.settings.apps.slackDisconnectConfirmTitle', {
            defaultMessage: 'Disconnect Slack App?',
          })}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            // Failure is surfaced via a toast in useRelayAppConnection; swallow here so the
            // modal still closes without an unhandled rejection.
            void onDisconnect()
              .catch(() => undefined)
              .finally(() => setConfirmOpen(false));
          }}
          cancelButtonText={i18n.translate(
            'xpack.nightshift.settings.apps.slackDisconnectConfirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.nightshift.settings.apps.slackDisconnectConfirmConfirm',
            { defaultMessage: 'Disconnect workspace' }
          )}
          buttonColor="danger"
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          data-test-subj="streamsSlackAppDisconnectConfirmModal"
        >
          <EuiText size="s">
            {i18n.translate('xpack.nightshift.settings.apps.slackDisconnectConfirmBody', {
              defaultMessage:
                'This removes all Slack channel connections for this deployment. You can reconnect later.',
            })}
          </EuiText>
        </EuiConfirmModal>
      )}
    </>
  );
}
