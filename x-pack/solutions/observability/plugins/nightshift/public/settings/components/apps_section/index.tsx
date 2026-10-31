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
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import {
  RELAY_APP_CONNECTION_STATUS,
  type RelayAppConnectionStatus,
  type SlackAppWorkspace,
} from '@kbn/significant-events-plugin/common';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { SettingsSection } from '../settings_section';
import { useRelayAppConnection } from './use_relay_app_connection';
import { SlackConnectionBindings } from './slack_connection_bindings';

interface SlackChannelsSectionProps {
  canEdit: boolean;
}

/**
 * The Slack channels the Elastic Slack App answers in. Connecting the workspace lives here too,
 * since the channels only exist once it is connected. Hidden when the deployment has no Slack App.
 */
export function SlackChannelsSection({ canEdit }: SlackChannelsSectionProps) {
  const connection = useRelayAppConnection();
  const {
    isLoading,
    hasStatusRequestError,
    status,
    error,
    workspace,
    createdBy,
    createdAt,
    isMutating,
    retryStatusRequest,
    connect,
    confirm,
    disconnect,
  } = connection;
  const available = connection.available && !hasStatusRequestError;

  if (isLoading || (!available && !hasStatusRequestError)) {
    return null;
  }

  const isConnected = available && status === RELAY_APP_CONNECTION_STATUS.connected;

  return (
    <>
      <EuiSpacer />
      <SettingsSection
        title={i18n.translate('xpack.nightshift.settings.apps.slackChannelsSectionTitle', {
          defaultMessage: 'Slack channels',
        })}
        titleAdornment={
          isConnected ? (
            <EuiBadge
              color="success"
              iconType="check"
              data-test-subj="nightshiftSlackConnectedBadge"
            >
              {i18n.translate('xpack.nightshift.settings.apps.slackConnected', {
                defaultMessage: 'Connected',
              })}
            </EuiBadge>
          ) : undefined
        }
        headerAction={
          isConnected ? (
            <DisconnectWorkspaceButton
              canEdit={canEdit}
              isMutating={isMutating}
              onDisconnect={disconnect}
            />
          ) : undefined
        }
        data-test-subj="nightshiftSlackChannelsSection"
      >
        {hasStatusRequestError ? (
          <KbnDangerCallout
            announceOnMount
            data-test-subj="nightshiftSlackStatusError"
            title={i18n.translate('xpack.nightshift.settings.apps.statusErrorTitle', {
              defaultMessage: 'Unable to check the Slack App status',
            })}
            text={i18n.translate('xpack.nightshift.settings.apps.statusErrorDescription', {
              defaultMessage:
                'Nightshift could not load the Slack App status. Check the connection and try again.',
            })}
            actionProps={{
              primary: {
                children: i18n.translate('xpack.nightshift.settings.apps.statusErrorRetry', {
                  defaultMessage: 'Try again',
                }),
                iconType: 'refresh',
                onClick: retryStatusRequest,
                'data-test-subj': 'nightshiftSlackStatusRetryButton',
              },
            }}
          />
        ) : (
          <SlackConnectionBody
            status={status}
            error={error}
            workspace={workspace}
            createdBy={createdBy}
            createdAt={createdAt}
            canEdit={canEdit}
            isMutating={isMutating}
            onConnect={connect}
            onConfirm={confirm}
            onDisconnect={disconnect}
          />
        )}
      </SettingsSection>
    </>
  );
}

interface SlackConnectionBodyProps {
  status: RelayAppConnectionStatus;
  error?: string;
  workspace?: SlackAppWorkspace;
  createdBy?: string;
  createdAt?: string;
  canEdit: boolean;
  isMutating: boolean;
  onConnect: () => void;
  onConfirm: (tenantKey: string) => Promise<void>;
  onDisconnect: (tenantKey?: string) => Promise<void>;
}

/** The section body for each connection state: confirm, waiting, the channels, or connect. */
function SlackConnectionBody({
  status,
  error,
  workspace,
  createdBy,
  createdAt,
  canEdit,
  isMutating,
  onConnect,
  onConfirm,
  onDisconnect,
}: SlackConnectionBodyProps) {
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
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.CANCEL_SLACK_CONNECTION,
              element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
            })}
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
        {workspace && <WorkspaceLabel workspace={workspace} />}
        {createdAt && <ConnectedByLabel createdBy={createdBy} createdAt={createdAt} />}
        {(workspace || createdAt) && <EuiSpacer size="m" />}
        <SlackConnectionBindings canEdit={canEdit} onReconnect={onConnect} />
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
        <EuiText size="s" data-test-subj="streamsSlackAppDescription">
          {i18n.translate('xpack.nightshift.settings.apps.slackDescription', {
            defaultMessage:
              'Connect the Elastic Slack App to get investigation updates in Slack and ask Nightshift for help from a channel.',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="streamsSlackAppPrivateChannelsNote">
          {i18n.translate('xpack.nightshift.settings.apps.slackPrivateChannelsNote', {
            defaultMessage:
              'To use private channels, allow private channel access when authorizing Slack. It applies to the whole workspace, including every Elastic deployment connected to it.',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          fill
          onClick={onConnect}
          isLoading={isMutating}
          isDisabled={!canEdit || isMutating}
          data-test-subj="streamsSlackAppConnectButton"
          {...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.CONNECT_SLACK,
            element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
          })}
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

function ConnectedByLabel({ createdBy, createdAt }: { createdBy?: string; createdAt: string }) {
  const date = <FormattedDate value={createdAt} year="numeric" month="short" day="numeric" />;
  return (
    <EuiText size="s" color="subdued" data-test-subj="streamsSlackAppConnectedBy">
      {createdBy ? (
        <FormattedMessage
          id="xpack.nightshift.settings.apps.slackSetUpByOn"
          defaultMessage="Set up by {user} on {date}"
          values={{ user: createdBy, date }}
        />
      ) : (
        <FormattedMessage
          id="xpack.nightshift.settings.apps.slackSetUpOn"
          defaultMessage="Set up on {date}"
          values={{ date }}
        />
      )}
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
      css={{ width: '100%' }}
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
        {...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.DISCONNECT_SLACK,
          element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
        })}
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
