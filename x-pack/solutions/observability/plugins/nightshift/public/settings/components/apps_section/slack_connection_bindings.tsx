/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SlackChannelBinding } from '@kbn/significant-events-plugin/common';
import { useRelayAppBindings, useBindChannel, useUnbindChannel } from './use_relay_app_bindings';

const channelLabel = (binding: SlackChannelBinding) =>
  binding.displayName != null ? `#${binding.displayName}` : binding.channel ?? '';

interface SlackConnectionBindingsProps {
  canEdit: boolean;
}

export function SlackConnectionBindings({ canEdit }: SlackConnectionBindingsProps) {
  // Cursor-based pagination: `cursors[i]` is the opaque cursor used to fetch page `i`
  // (undefined for the first page). The Relay only exposes forward `nextCursor` values, so
  // we remember the cursors we've visited to allow stepping back and forth.
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const { bindings, isLoading, isFetching, nextCursor } = useRelayAppBindings(
    true,
    cursors[pageIndex]
  );
  const { bind, isLoading: isBinding } = useBindChannel();
  const [channelId, setChannelId] = useState('');

  const trimmedChannelId = channelId.trim();
  const canBind = canEdit && !isBinding && trimmedChannelId.length > 0;

  const resetToFirstPage = useCallback(() => {
    setCursors([undefined]);
    setPageIndex(0);
  }, []);

  const onBind = () => {
    if (!canBind) {
      return;
    }
    // Binding changes the connected set, so return to the first page after it succeeds.
    // Failure is surfaced via a toast in useBindChannel; ignore the rejection here.
    bind(trimmedChannelId)
      .then(() => {
        setChannelId('');
        resetToFirstPage();
      })
      .catch(() => undefined);
  };

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
        render: (_: unknown, binding: SlackChannelBinding) => (
          <EuiText size="s">{channelLabel(binding)}</EuiText>
        ),
      },
      {
        field: 'status' as const,
        name: i18n.translate('xpack.nightshift.settings.apps.slackTableStatus', {
          defaultMessage: 'Status',
        }),
        render: () => (
          <EuiBadge color="success">
            {i18n.translate('xpack.nightshift.settings.apps.slackChannelConnected', {
              defaultMessage: 'Connected',
            })}
          </EuiBadge>
        ),
      },
      {
        field: 'actions' as const,
        name: i18n.translate('xpack.nightshift.settings.apps.slackTableActions', {
          defaultMessage: 'Actions',
        }),
        align: 'right' as const,
        width: '120px',
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

  const showPagination = pageIndex > 0 || nextCursor != null;

  return (
    <>
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5>
              {i18n.translate('xpack.nightshift.settings.apps.slackChannelsTitle', {
                defaultMessage: 'Connected channels',
              })}
            </h5>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.nightshift.settings.apps.slackChannelsDescription', {
              defaultMessage: '@Elastic only answers in these channels.',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFieldText
                compressed
                css={{ minWidth: '240px' }}
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onBind();
                  }
                }}
                disabled={!canEdit || isBinding}
                placeholder={i18n.translate(
                  'xpack.nightshift.settings.apps.slackChannelIdPlaceholder',
                  { defaultMessage: 'Enter a Slack channel ID' }
                )}
                aria-label={i18n.translate(
                  'xpack.nightshift.settings.apps.slackChannelIdAriaLabel',
                  {
                    defaultMessage: 'Slack channel ID',
                  }
                )}
                data-test-subj="streamsSlackAppChannelIdInput"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="plus"
                isDisabled={!canBind}
                isLoading={isBinding}
                onClick={onBind}
                data-test-subj="streamsSlackAppBindChannelButton"
              >
                {i18n.translate('xpack.nightshift.settings.apps.slackBindChannel', {
                  defaultMessage: 'Connect channel',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBasicTable
        css={{ width: '100%' }}
        items={bindings}
        columns={columns}
        loading={isLoading || isFetching}
        noItemsMessage={
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.nightshift.settings.apps.slackNoChannels', {
              defaultMessage:
                'Invite @Elastic to a Slack channel, enter the channel ID, and connect.',
            })}
          </EuiText>
        }
        tableLayout="auto"
        tableCaption={i18n.translate('xpack.nightshift.settings.apps.slackChannelsTableCaption', {
          defaultMessage: 'Slack channels bound to this deployment',
        })}
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
              <EuiText size="xs" color="subdued" data-test-subj="streamsSlackAppChannelsPageLabel">
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

  const channelName = channelLabel(binding);

  return (
    <>
      <EuiButtonEmpty
        size="s"
        color="danger"
        isDisabled={!canEdit || isUnbinding}
        isLoading={isUnbinding}
        onClick={() => setConfirmOpen(true)}
        data-test-subj="streamsSlackAppUnbindChannelButton"
      >
        {i18n.translate('xpack.nightshift.settings.apps.slackUnbindChannel', {
          defaultMessage: 'Disconnect',
        })}
      </EuiButtonEmpty>
      {confirmOpen && (
        <EuiConfirmModal
          title={i18n.translate('xpack.nightshift.settings.apps.slackUnbindConfirmTitle', {
            defaultMessage: 'Disconnect {channel}?',
            values: { channel: channelName },
          })}
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
          confirmButtonText={i18n.translate(
            'xpack.nightshift.settings.apps.slackUnbindConfirmConfirm',
            { defaultMessage: 'Disconnect' }
          )}
          buttonColor="danger"
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          data-test-subj="streamsSlackAppUnbindConfirmModal"
        >
          <EuiText size="s">
            {i18n.translate('xpack.nightshift.settings.apps.slackUnbindConfirmBody', {
              defaultMessage:
                'This will stop routing Slack messages for this channel to this deployment.',
            })}
          </EuiText>
        </EuiConfirmModal>
      )}
    </>
  );
}
