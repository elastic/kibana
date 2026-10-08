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
  EuiConfirmModal,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTextColor,
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
          <EuiPanel
            hasBorder
            hasShadow={false}
            css={{ maxWidth: 800 }}
            data-test-subj="streamsSlackAppCard"
          >
            <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="logoSlack" size="l" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>
                    {i18n.translate('xpack.nightshift.settings.apps.slackWorkspaceTitle', {
                      defaultMessage: 'Elastic Slack App',
                    })}
                  </h4>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.nightshift.settings.apps.slackCardDescription', {
                    defaultMessage:
                      'Ask @Elastic questions in connected Slack channels and send automation results there.',
                  })}
                </EuiText>
              </EuiFlexItem>
              {status === RELAY_APP_CONNECTION_STATUS.connected && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success" iconType="check">
                    {i18n.translate('xpack.nightshift.settings.apps.slackConnected', {
                      defaultMessage: 'Connected',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <SlackCardBody
              status={status}
              error={error}
              workspace={workspace}
              canEdit={canEdit}
              isMutating={isMutating}
              onConnect={connect}
              onConfirm={confirm}
              onDisconnect={disconnect}
            />
          </EuiPanel>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
}

interface SlackCardBodyProps {
  status: RelayAppConnectionStatus;
  error?: string;
  workspace?: SlackAppWorkspace;
  canEdit: boolean;
  isMutating: boolean;
  onConnect: () => void;
  onConfirm: (tenantKey: string) => Promise<void>;
  onDisconnect: (tenantKey?: string) => Promise<void>;
}

function SlackCardBody({
  status,
  error,
  workspace,
  canEdit,
  isMutating,
  onConnect,
  onConfirm,
  onDisconnect,
}: SlackCardBodyProps) {
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
            onClick={() => onDisconnect()}
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
      <>
        <EuiFlexGroup
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            {workspace && <WorkspaceLabel workspace={workspace} />}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DisconnectWorkspaceButton
              canEdit={canEdit}
              isMutating={isMutating}
              onDisconnect={onDisconnect}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <SlackConnectionBindings canEdit={canEdit} />
      </>
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

const toHost = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

function WorkspaceLabel({ workspace: { tenantKey, name, url } }: { workspace: SlackAppWorkspace }) {
  const host = url ? toHost(url) : undefined;
  return (
    <EuiText size="s" data-test-subj="streamsSlackAppWorkspace">
      <strong>
        {i18n.translate('xpack.nightshift.settings.apps.slackWorkspaceLabel', {
          defaultMessage: 'Workspace:',
        })}
      </strong>{' '}
      {name ?? host ?? tenantKey}
      {name && host && <EuiTextColor color="subdued">{` (${host})`}</EuiTextColor>}
    </EuiText>
  );
}

interface ConfirmWorkspaceCalloutProps {
  workspace: SlackAppWorkspace;
  canEdit: boolean;
  isMutating: boolean;
  onConfirm: (tenantKey: string) => Promise<void>;
  onReject: (tenantKey: string) => Promise<void>;
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
      css={{ maxWidth: '50%', minWidth: 360 }}
      data-test-subj="streamsSlackAppConfirmWorkspace"
      title={i18n.translate('xpack.nightshift.settings.apps.slackConfirmWorkspaceTitle', {
        defaultMessage: 'Is this the right workspace?',
      })}
    >
      <EuiDescriptionList type="column" compressed listItems={listItems} />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color="warning"
            fill
            // Failures are surfaced via a toast in useRelayAppConnection.
            onClick={() => void onConfirm(tenantKey).catch(() => undefined)}
            isDisabled={!canEdit || isMutating}
            data-test-subj="streamsSlackAppConfirmWorkspaceButton"
          >
            {i18n.translate('xpack.nightshift.settings.apps.slackConfirmWorkspaceConfirm', {
              defaultMessage: 'Yes',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="warning"
            onClick={() => void onReject(tenantKey).catch(() => undefined)}
            isDisabled={!canEdit || isMutating}
            data-test-subj="streamsSlackAppRejectWorkspaceButton"
          >
            {i18n.translate('xpack.nightshift.settings.apps.slackConfirmWorkspaceReject', {
              defaultMessage: 'No',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
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
