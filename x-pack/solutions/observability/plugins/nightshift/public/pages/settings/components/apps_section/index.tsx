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
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
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
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../../common/ebt_constants';
import { useAllRelayAppBindings } from '../../../../data/relay_apps/use_relay_app_bindings';
import { SettingsSection } from '../settings_section';
import { useRelayAppConnection } from './use_relay_app_connection';
import { SlackConnectionBindings } from './slack_connection_bindings';
import { WorkspaceAffectedAutomationsWarning } from './affected_automations';

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
        title={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} component="span">
            <EuiFlexItem grow={false}>
              <EuiIcon type="logoSlack" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isConnected
                ? i18n.translate('xpack.nightshift.settings.apps.slackChannelsSectionTitle', {
                    defaultMessage: 'Slack channels',
                  })
                : i18n.translate('xpack.nightshift.settings.apps.slackSectionTitle', {
                    defaultMessage: 'Slack',
                  })}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        titleAdornment={
          isConnected ? (
            <WorkspaceBadge workspace={workspace} createdBy={createdBy} createdAt={createdAt} />
          ) : undefined
        }
        headerAction={
          isConnected ? (
            <WorkspaceMenu
              canEdit={canEdit}
              isMutating={isMutating}
              workspaceName={workspace?.name}
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
    return <SlackConnectionBindings canEdit={canEdit} />;
  }

  // not_connected or error
  return (
    <EuiEmptyPrompt
      iconType="logoSlack"
      paddingSize="m"
      titleSize="xs"
      title={
        <h4>
          {i18n.translate('xpack.nightshift.settings.apps.slackConnectTitle', {
            defaultMessage: 'Connect Slack to @Elastic',
          })}
        </h4>
      }
      body={
        <>
          {error && <KbnDangerCallout announceOnMount size="s" title={error} />}
          <p data-test-subj="streamsSlackAppDescription">
            {i18n.translate('xpack.nightshift.settings.apps.slackConnectDescription', {
              defaultMessage:
                'So @Elastic can answer in channels you connect to this project, and automations can post updates to Slack.',
            })}
          </p>
          <EuiText size="xs" color="subdued" data-test-subj="streamsSlackAppPrivateChannelsNote">
            {i18n.translate('xpack.nightshift.settings.apps.slackPrivateChannelsAccessNote', {
              defaultMessage:
                'To use private channels, allow private channel access when authorizing Slack.',
            })}
          </EuiText>
        </>
      }
      actions={
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
      }
    />
  );
}

const toHost = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

function WorkspaceBadge({
  workspace,
  createdBy,
  createdAt,
}: {
  workspace?: SlackAppWorkspace;
  createdBy?: string;
  createdAt?: string;
}) {
  const host = workspace?.url ? toHost(workspace.url) : undefined;
  const label =
    workspace?.name ??
    host ??
    workspace?.tenantKey ??
    i18n.translate('xpack.nightshift.settings.apps.slackConnected', {
      defaultMessage: 'Connected',
    });
  const date = <FormattedDate value={createdAt} year="numeric" month="short" day="numeric" />;
  const connectedBy = createdAt ? (
    createdBy ? (
      <FormattedMessage
        id="xpack.nightshift.settings.apps.slackConnectedByOn"
        defaultMessage="Connected by {user} on {date}"
        values={{ user: createdBy, date }}
      />
    ) : (
      <FormattedMessage
        id="xpack.nightshift.settings.apps.slackConnectedOn"
        defaultMessage="Connected on {date}"
        values={{ date }}
      />
    )
  ) : undefined;
  const badge = (
    <EuiBadge
      color="hollow"
      iconType="info"
      iconSide="right"
      tabIndex={0}
      data-test-subj="nightshiftSlackConnectedBadge"
    >
      {label}
    </EuiBadge>
  );

  if (!host && !connectedBy) return badge;
  return (
    <EuiToolTip
      content={
        <span data-test-subj="nightshiftSlackWorkspaceTooltip">
          {host}
          {host && connectedBy && ' · '}
          {connectedBy}
        </span>
      }
    >
      {badge}
    </EuiToolTip>
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

interface WorkspaceMenuProps {
  canEdit: boolean;
  isMutating: boolean;
  workspaceName?: string;
  onDisconnect: () => Promise<void>;
}

function WorkspaceMenu({ canEdit, isMutating, workspaceName, onDisconnect }: WorkspaceMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId();
  const menuLabel = i18n.translate('xpack.nightshift.settings.apps.slackWorkspaceMenu', {
    defaultMessage: 'Slack workspace actions',
  });
  const workspaceLabel =
    workspaceName ??
    i18n.translate('xpack.nightshift.settings.apps.slackDisconnectThisWorkspace', {
      defaultMessage: 'this Slack workspace',
    });

  return (
    <>
      <EuiPopover
        aria-label={menuLabel}
        isOpen={isMenuOpen}
        closePopover={() => setIsMenuOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downRight"
        button={
          <EuiToolTip content={menuLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="ellipsis"
              color="text"
              isDisabled={!canEdit || isMutating}
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={menuLabel}
              data-test-subj="streamsSlackAppWorkspaceMenuButton"
            />
          </EuiToolTip>
        }
      >
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem
              key="disconnect"
              icon="linkSlash"
              css={{ color: euiTheme.colors.textDanger }}
              onClick={() => {
                setIsMenuOpen(false);
                setConfirmOpen(true);
              }}
              data-test-subj="streamsSlackAppDisconnectButton"
              {...getEbtProps({
                action: NIGHTSHIFT_EBT_ACTIONS.DISCONNECT_SLACK,
                element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
              })}
            >
              {i18n.translate('xpack.nightshift.settings.apps.slackDisconnect', {
                defaultMessage: 'Disconnect workspace',
              })}
            </EuiContextMenuItem>,
          ]}
        />
      </EuiPopover>
      {confirmOpen && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.nightshift.settings.apps.slackDisconnectWorkspaceConfirmTitle',
            {
              defaultMessage: 'Disconnect {workspace} from this project?',
              values: { workspace: workspaceLabel },
            }
          )}
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
          <DisconnectWorkspaceBody workspaceName={workspaceLabel} />
          <WorkspaceAffectedAutomationsWarning />
        </EuiConfirmModal>
      )}
    </>
  );
}

function DisconnectWorkspaceBody({ workspaceName }: { workspaceName?: string }) {
  const { bindings, isLoading, isError, isComplete } = useAllRelayAppBindings();
  if (isLoading) return null;
  // A failed or cut-off list must not read as "no channels".
  const hasNoChannels = !isError && isComplete && bindings.length === 0;

  return (
    <EuiText size="s" data-test-subj="streamsSlackAppDisconnectConfirmBody">
      {hasNoChannels ? (
        <FormattedMessage
          id="xpack.nightshift.settings.apps.slackDisconnectConfirmBodyNoChannels"
          defaultMessage="No channels are connected to this project. Other Elastic projects that use {workspace} aren't affected."
          values={{ workspace: <strong>{workspaceName}</strong> }}
        />
      ) : (
        i18n.translate('xpack.nightshift.settings.apps.slackDisconnectConfirmBodyChannels', {
          defaultMessage:
            '@Elastic stops answering in the connected channels for this project. The bot stays in the channels until a Slack workspace admin removes it.',
        })
      )}
    </EuiText>
  );
}
