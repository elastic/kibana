/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, type KbnCalloutProps } from '@kbn/ui-callout';
import {
  useAvailableChannels,
  useBindChannel,
  type BindFailure,
} from '../../../../data/relay_apps/use_relay_app_bindings';
import { parseSlackChannelInput } from '../../../../common/parse_slack_channel_input';

const failureCopy = ({ reason, message }: BindFailure): string => {
  switch (reason) {
    case 'not_a_member':
      return i18n.translate('xpack.nightshift.settings.apps.bindNotMember', {
        defaultMessage:
          'Invite @Elastic to the channel, then try again. If the channel is private, the workspace also needs private channel access. To allow it, disconnect the workspace and connect it again. A Slack admin may need to approve it, and you will need to reconnect your channels.',
      });
    case 'private_channel_access_required':
      return i18n.translate('xpack.nightshift.settings.apps.bindPrivateAccessRequired', {
        defaultMessage:
          'Private channels need private channel access, which applies to the whole Slack workspace and every Elastic deployment connected to it. To allow it, disconnect the workspace and connect it again. A Slack admin may need to approve it, and you will need to reconnect your channels.',
      });
    default:
      return message;
  }
};

const bindFailureActions = ({
  failure: { reason },
  onRetry,
  canRetry,
}: {
  failure: BindFailure;
  onRetry: () => void;
  canRetry: boolean;
}): KbnCalloutProps['actionProps'] => {
  if (reason === 'channel_taken') return undefined;
  return {
    primary: {
      children: i18n.translate('xpack.nightshift.settings.apps.slackBindRetry', {
        defaultMessage: 'Try again',
      }),
      onClick: onRetry,
      isDisabled: !canRetry,
      'data-test-subj': 'streamsSlackAppBindFailureRetry',
    },
  };
};

interface ConnectChannelModalProps {
  onClose: () => void;
  onConnected: () => void;
}

/**
 * Binds a Slack channel to this project. Picks from the public channels @Elastic is in that no
 * project has connected; a channel ID or link copied from Slack is still accepted, for private
 * channels and for a list that is unavailable or cut short.
 */
export function ConnectChannelModal({ onClose, onConnected }: ConnectChannelModalProps) {
  const { bind, isLoading, failure, clearFailure } = useBindChannel();
  const { channels, isLoading: isLoadingChannels, isTruncated } = useAvailableChannels();
  const [selected, setSelected] = useState<EuiComboBoxOptionOption<string>>();
  const [searchValue, setSearchValue] = useState('');
  const titleId = useGeneratedHtmlId();

  const options = useMemo(
    () =>
      channels.map(({ channel, displayName }) => ({ label: `#${displayName}`, value: channel })),
    [channels]
  );
  const typedChannelId = parseSlackChannelInput(searchValue);
  const channelId = typedChannelId ?? selected?.value;
  const hasUnparsableInput = searchValue.trim().length > 0 && typedChannelId === undefined;
  const canBind = !isLoading && channelId !== undefined;

  const onCreateOption = (input: string): boolean => {
    const id = parseSlackChannelInput(input);
    if (id === undefined) return false;
    setSelected({ label: id, value: id });
    clearFailure();
    return true;
  };

  const onBind = () => {
    if (!canBind || channelId === undefined) return;
    // Failure renders inline from useBindChannel's `failure`; ignore the rejection here.
    bind(channelId)
      .then(onConnected)
      .catch(() => undefined);
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="streamsSlackAppConnectChannelModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.nightshift.settings.apps.slackConnectChannelTitle', {
            defaultMessage: 'Connect a channel',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.nightshift.settings.apps.slackChannelLabel', {
            defaultMessage: 'Channel',
          })}
          isInvalid={hasUnparsableInput}
          error={i18n.translate('xpack.nightshift.settings.apps.slackChannelInputInvalid', {
            defaultMessage:
              'Enter a channel ID such as C0123456789, or a link copied from the channel in Slack.',
          })}
          helpText={
            isTruncated
              ? i18n.translate('xpack.nightshift.settings.apps.slackChannelTruncatedHelp', {
                  defaultMessage:
                    'Not seeing your channel? Enter its channel ID or a link copied from Slack.',
                })
              : i18n.translate('xpack.nightshift.settings.apps.slackChannelInputHelp', {
                  defaultMessage:
                    'Lists public channels @Elastic has been invited to. For a private channel, invite @Elastic in Slack, then enter its channel ID or a link.',
                })
          }
          data-test-subj="streamsSlackAppChannelInputHelp"
        >
          <EuiComboBox<string>
            fullWidth
            autoFocus
            isClearable
            isLoading={isLoadingChannels}
            isInvalid={hasUnparsableInput}
            isDisabled={isLoading}
            options={options}
            selectedOptions={selected ? [selected] : []}
            singleSelection={{ asPlainText: true }}
            onChange={(next) => {
              setSelected(next[0]);
              clearFailure();
            }}
            onSearchChange={setSearchValue}
            onCreateOption={onCreateOption}
            customOptionText={i18n.translate(
              'xpack.nightshift.settings.apps.slackChannelCustomOption',
              {
                defaultMessage: 'Connect {searchValue} by channel ID or link',
                values: { searchValue: '{searchValue}' },
              }
            )}
            placeholder={i18n.translate('xpack.nightshift.settings.apps.slackChannelPlaceholder', {
              defaultMessage: 'Select a channel or enter a channel ID',
            })}
            aria-label={i18n.translate('xpack.nightshift.settings.apps.slackChannelIdAriaLabel', {
              defaultMessage: 'Slack channel',
            })}
            data-test-subj="streamsSlackAppChannelIdInput"
          />
        </EuiFormRow>
        {failure && (
          <>
            <EuiSpacer size="m" />
            <KbnDangerCallout
              announceOnMount
              size="s"
              title={failureCopy(failure)}
              actionProps={bindFailureActions({ failure, onRetry: onBind, canRetry: canBind })}
              data-test-subj="streamsSlackAppBindFailure"
            />
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="streamsSlackAppConnectChannelCancel">
          {i18n.translate('xpack.nightshift.settings.apps.slackConnectChannelCancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isDisabled={!canBind}
          isLoading={isLoading}
          onClick={onBind}
          data-test-subj="streamsSlackAppBindChannelButton"
        >
          {i18n.translate('xpack.nightshift.settings.apps.slackConnectChannelConfirm', {
            defaultMessage: 'Connect',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
