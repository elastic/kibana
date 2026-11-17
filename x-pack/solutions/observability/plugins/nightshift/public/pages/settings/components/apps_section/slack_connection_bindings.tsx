/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiConfirmModal,
  EuiCopy,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SlackChannelBinding } from '@kbn/significant-events-plugin/common';
import {
  formatChannelLabel,
  useRelayAppBindings,
  useUnbindChannel,
} from '../../../../data/relay_apps/use_relay_app_bindings';
import { ChannelLabel } from '../../../../components/ui/channel_label';
import { ChannelAffectedAutomationsWarning } from './affected_automations';
import { ConnectChannelModal } from './connect_channel_modal';

interface SlackConnectionBindingsProps {
  canEdit: boolean;
}

const labels = {
  connectChannels: i18n.translate('xpack.nightshift.settings.apps.slackConnectChannels', {
    defaultMessage: 'Connect channels',
  }),
  scope: i18n.translate('xpack.nightshift.settings.apps.slackChannelsScope', {
    defaultMessage: '@Elastic answers only in channels connected to this project.',
  }),
};

export function SlackConnectionBindings({ canEdit }: SlackConnectionBindingsProps) {
  // Cursor-based pagination: `cursors[i]` is the opaque cursor used to fetch page `i`
  // (undefined for the first page). The Relay only exposes forward `nextCursor` values, so
  // we remember the cursors we've visited to allow stepping back and forth.
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [isConnectOpen, setIsConnectOpen] = useState(false);

  const { bindings, isLoading, isFetching, nextCursor } = useRelayAppBindings(
    true,
    cursors[pageIndex]
  );

  const resetToFirstPage = useCallback(() => {
    setCursors([undefined]);
    setPageIndex(0);
  }, []);

  const onNextPage = () => {
    if (nextCursor == null || isFetching) {
      return;
    }
    // Record the next page's cursor the first time we advance to it; revisiting a page we've
    // already paged through keeps the existing stack.
    setCursors((prev) => (pageIndex + 1 < prev.length ? prev : [...prev, nextCursor]));
    setPageIndex((index) => index + 1);
  };

  const onPreviousPage = () => {
    if (pageIndex === 0 || isFetching) {
      return;
    }
    setPageIndex((index) => index - 1);
  };

  const columns = useMemo(
    () => [
      {
        field: 'channel' as const,
        name: i18n.translate('xpack.nightshift.settings.apps.slackTableChannel', {
          defaultMessage: 'Channel',
        }),
        render: (_: unknown, binding: SlackChannelBinding) => <ChannelCell binding={binding} />,
      },
      {
        field: 'actions' as const,
        name: i18n.translate('xpack.nightshift.settings.apps.slackTableActions', {
          defaultMessage: 'Actions',
        }),
        align: 'right' as const,
        width: '80px',
        render: (_: unknown, binding: SlackChannelBinding) => (
          <BindingActionCell
            binding={binding}
            canEdit={canEdit}
            onDisconnected={resetToFirstPage}
          />
        ),
      },
    ],
    [canEdit, resetToFirstPage]
  );

  const isSinglePage = pageIndex === 0 && nextCursor == null;
  const showPagination = !isSinglePage;
  const isEmpty = !isLoading && isSinglePage && bindings.length === 0;

  const connectButton = (
    <EuiButton
      size="s"
      iconType="plus"
      isDisabled={!canEdit}
      onClick={() => setIsConnectOpen(true)}
      data-test-subj="streamsSlackAppOpenConnectChannelButton"
    >
      {labels.connectChannels}
    </EuiButton>
  );

  return (
    <>
      {isEmpty ? (
        <EuiEmptyPrompt
          iconType="users"
          paddingSize="m"
          titleSize="xs"
          title={
            <h4>
              {i18n.translate('xpack.nightshift.settings.apps.slackNoChannelsTitle', {
                defaultMessage: 'Connect Slack channels to this project',
              })}
            </h4>
          }
          body={
            <p data-test-subj="streamsSlackAppNoChannels">
              {i18n.translate('xpack.nightshift.settings.apps.slackNoChannelsBody', {
                defaultMessage:
                  '@Elastic answers only in channels connected to this project. Invite @Elastic to a channel in Slack, then connect it here.',
              })}
            </p>
          }
          actions={connectButton}
        />
      ) : (
        <>
          <EuiFlexGroup gutterSize="m" alignItems="flexStart" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  {isSinglePage
                    ? i18n.translate('xpack.nightshift.settings.apps.slackChannelsTitleCount', {
                        defaultMessage: 'Channels ({count})',
                        values: { count: bindings.length },
                      })
                    : i18n.translate('xpack.nightshift.settings.apps.slackChannelsTitle', {
                        defaultMessage: 'Channels',
                      })}
                </h5>
              </EuiTitle>
              <EuiText size="xs" color="subdued">
                {labels.scope}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{connectButton}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiBasicTable
            css={{ width: '100%' }}
            items={bindings}
            columns={columns}
            loading={isLoading || isFetching}
            tableLayout="auto"
            tableCaption={i18n.translate(
              'xpack.nightshift.settings.apps.slackChannelsTableCaption',
              { defaultMessage: 'Slack channels bound to this deployment' }
            )}
          />
          {showPagination && (
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup
                gutterSize="s"
                alignItems="center"
                justifyContent="flexEnd"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="chevronSingleLeft"
                    isDisabled={pageIndex === 0 || isFetching}
                    onClick={onPreviousPage}
                    data-test-subj="streamsSlackAppChannelsPreviousPage"
                  >
                    {i18n.translate('xpack.nightshift.settings.apps.slackChannelsPreviousPage', {
                      defaultMessage: 'Previous',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj="streamsSlackAppChannelsPageLabel"
                  >
                    {i18n.translate('xpack.nightshift.settings.apps.slackChannelsPageLabel', {
                      defaultMessage: 'Page {page}',
                      values: { page: pageIndex + 1 },
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="chevronSingleRight"
                    iconSide="right"
                    isDisabled={nextCursor == null || isFetching}
                    onClick={onNextPage}
                    data-test-subj="streamsSlackAppChannelsNextPage"
                  >
                    {i18n.translate('xpack.nightshift.settings.apps.slackChannelsNextPage', {
                      defaultMessage: 'Next',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </>
      )}
      {isConnectOpen && (
        <ConnectChannelModal
          onClose={() => setIsConnectOpen(false)}
          onConnected={() => {
            setIsConnectOpen(false);
            resetToFirstPage();
          }}
        />
      )}
    </>
  );
}

/** A private channel's name is withheld by the Relay, so it is shown by id. */
const isPrivateChannel = ({ visibility, displayName }: SlackChannelBinding): boolean =>
  visibility === 'private' && displayName == null;

function ChannelCell({ binding }: { binding: SlackChannelBinding }) {
  const { channel } = binding;
  const isPrivate = isPrivateChannel(binding);
  const copyLabel = i18n.translate('xpack.nightshift.settings.apps.slackCopyChannelId', {
    defaultMessage: 'Copy channel ID',
  });

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <ChannelLabel
            label={formatChannelLabel(binding)}
            channelId={channel}
            isPrivate={isPrivate}
          />
        </EuiText>
      </EuiFlexItem>
      {channel != null && binding.displayName != null && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <EuiCode transparentBackground>{channel}</EuiCode>
          </EuiText>
        </EuiFlexItem>
      )}
      {channel != null && (
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={channel}>
            {(copy) => (
              <EuiToolTip content={copyLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="copy"
                  size="xs"
                  color="text"
                  onClick={copy}
                  aria-label={copyLabel}
                  data-test-subj="streamsSlackAppCopyChannelId"
                />
              </EuiToolTip>
            )}
          </EuiCopy>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

interface BindingActionCellProps {
  binding: SlackChannelBinding;
  canEdit: boolean;
  onDisconnected: () => void;
}

function BindingActionCell({ binding, canEdit, onDisconnected }: BindingActionCellProps) {
  const { unbind, isLoading: isUnbinding } = useUnbindChannel();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const channelName = formatChannelLabel(binding);
  const isPrivate = isPrivateChannel(binding);
  const disconnectLabel = i18n.translate('xpack.nightshift.settings.apps.slackDisconnectChannel', {
    defaultMessage: 'Disconnect channel',
  });

  return (
    <>
      <EuiToolTip content={disconnectLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="linkSlash"
          color="danger"
          isDisabled={!canEdit || isUnbinding}
          onClick={() => setConfirmOpen(true)}
          aria-label={disconnectLabel}
          data-test-subj="streamsSlackAppUnbindChannelButton"
        />
      </EuiToolTip>
      {confirmOpen && (
        <EuiConfirmModal
          title={
            isPrivate
              ? i18n.translate('xpack.nightshift.settings.apps.slackUnbindPrivateConfirmTitle', {
                  defaultMessage: 'Disconnect private channel?',
                })
              : i18n.translate('xpack.nightshift.settings.apps.slackUnbindConfirmTitle', {
                  defaultMessage: 'Disconnect {channel}?',
                  values: { channel: channelName },
                })
          }
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            if (binding.channel != null) {
              unbind(binding.channel)
                .then(() => onDisconnected())
                // Failure is surfaced via a toast in useUnbindChannel; swallow here so the
                // modal still closes without an unhandled rejection.
                .catch(() => undefined)
                .finally(() => setConfirmOpen(false));
            } else {
              setConfirmOpen(false);
            }
          }}
          cancelButtonText={i18n.translate(
            'xpack.nightshift.settings.apps.slackUnbindConfirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={disconnectLabel}
          buttonColor="danger"
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          data-test-subj="streamsSlackAppUnbindConfirmModal"
        >
          <EuiText size="s">
            {i18n.translate('xpack.nightshift.settings.apps.slackUnbindConfirmChannelBody', {
              defaultMessage:
                "@Elastic stops answering in {channel} for this project. It stays in the channel until someone removes it in Slack, and replies that the channel isn't connected when it's @mentioned.",
              values: {
                channel: isPrivate
                  ? i18n.translate('xpack.nightshift.settings.apps.slackUnbindThisChannel', {
                      defaultMessage: 'this channel',
                    })
                  : channelName,
              },
            })}
          </EuiText>
          {binding.channel != null && (
            <ChannelAffectedAutomationsWarning
              channel={{ id: binding.channel, displayName: binding.displayName }}
            />
          )}
        </EuiConfirmModal>
      )}
    </>
  );
}
