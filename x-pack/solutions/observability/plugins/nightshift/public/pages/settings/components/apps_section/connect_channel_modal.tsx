/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
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

/** Binds a Slack channel to this project by its id or a link copied from Slack. */
export function ConnectChannelModal({ onClose, onConnected }: ConnectChannelModalProps) {
  const { bind, isLoading, failure, clearFailure } = useBindChannel();
  const [input, setInput] = useState('');
  const titleId = useGeneratedHtmlId();

  const channelId = parseSlackChannelInput(input);
  const hasUnparsableInput = input.trim().length > 0 && channelId === undefined;
  const canBind = !isLoading && channelId !== undefined;

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
          label={i18n.translate('xpack.nightshift.settings.apps.slackChannelIdLabel', {
            defaultMessage: 'Channel ID',
          })}
          isInvalid={hasUnparsableInput}
          error={i18n.translate('xpack.nightshift.settings.apps.slackChannelInputInvalid', {
            defaultMessage:
              'Enter a channel ID such as C0123456789, or a link copied from the channel in Slack.',
          })}
          helpText={i18n.translate('xpack.nightshift.settings.apps.slackChannelInputHelp', {
            defaultMessage:
              'Invite @Elastic to the channel in Slack. It posts the channel ID there.',
          })}
          data-test-subj="streamsSlackAppChannelInputHelp"
        >
          <EuiFieldText
            fullWidth
            autoFocus
            value={input}
            isInvalid={hasUnparsableInput}
            onChange={(e) => {
              setInput(e.target.value);
              clearFailure();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onBind();
              }
            }}
            disabled={isLoading}
            placeholder="C0123456789"
            aria-label={i18n.translate('xpack.nightshift.settings.apps.slackChannelIdAriaLabel', {
              defaultMessage: 'Slack channel ID or link',
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
