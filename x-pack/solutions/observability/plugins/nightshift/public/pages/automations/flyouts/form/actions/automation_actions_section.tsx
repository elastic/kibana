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
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  formatChannelValue,
  useAllRelayAppBindings,
} from '../../../../../data/relay_apps/use_relay_app_bindings';
import type { SlackActionFormValues } from '../automation_form_values';
import { SectionHeader } from '../section_header';
import { SlackChannelComboBox } from '../slack_channel_combo_box';
import { SentenceIcon } from '../triggers/pills/sentence';

export const actionLabels = {
  notifications: i18n.translate('xpack.nightshift.automations.flyout.notifications', {
    defaultMessage: 'Notifications',
  }),
  empty: i18n.translate('xpack.nightshift.automations.flyout.notificationsEmpty', {
    defaultMessage: 'Choose where Nightshift posts when this automation runs.',
  }),
  noNotifications: i18n.translate('xpack.nightshift.automations.flyout.noNotifications', {
    defaultMessage: 'No notifications',
  }),
  addNotification: i18n.translate('xpack.nightshift.automations.flyout.addNotification', {
    defaultMessage: 'Add notification',
  }),
  postInSlack: i18n.translate('xpack.nightshift.automations.flyout.postInSlack', {
    defaultMessage: 'Post in Slack',
  }),
  channel: i18n.translate('xpack.nightshift.automations.flyout.slackChannel', {
    defaultMessage: 'Channel',
  }),
  directMessage: i18n.translate('xpack.nightshift.automations.flyout.slackDirectMessage', {
    defaultMessage: 'Direct message',
  }),
  searchChannels: i18n.translate('xpack.nightshift.automations.flyout.searchChannels', {
    defaultMessage: 'Search channels…',
  }),
  searchPeople: i18n.translate('xpack.nightshift.automations.flyout.searchPeople', {
    defaultMessage: 'Search people…',
  }),
  replyInThread: i18n.translate('xpack.nightshift.automations.flyout.replyInThread', {
    defaultMessage: 'Nightshift replies in the thread of the triggering message.',
  }),
  removeNotification: i18n.translate('xpack.nightshift.automations.flyout.removeNotification', {
    defaultMessage: 'Remove notification',
  }),
};

const useActionRowCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    padding: ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.medium};
    transition: background-color ${euiTheme.animation.fast} ease;
    &:hover {
      background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
    }
  `;
};

const SlackThreadActionRow = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      wrap
      responsive={false}
      css={{ minBlockSize: euiTheme.size.xl }}
      data-test-subj="automationSlackThreadAction"
    >
      <EuiFlexItem grow={false}>
        <SentenceIcon type="logoSlack" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{actionLabels.postInSlack}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          {actionLabels.replyInThread}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ChannelBadge = ({ value }: { value: string }) => {
  const { bindings } = useAllRelayAppBindings();
  return <EuiBadge>{formatChannelValue(value, bindings)}</EuiBadge>;
};

const SlackActionRow = ({
  action,
  onChange,
  onRemove,
  readOnly = false,
}: {
  action: SlackActionFormValues;
  onChange: (action: SlackActionFormValues) => void;
  onRemove: () => void;
  readOnly?: boolean;
}) => {
  const rowCss = useActionRowCss();
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      wrap
      responsive={false}
      css={readOnly ? { minBlockSize: euiTheme.size.xl } : rowCss}
    >
      <EuiFlexItem grow={false}>
        <SentenceIcon type="logoSlack" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{actionLabels.postInSlack}</strong>
        </EuiText>
      </EuiFlexItem>
      {readOnly && (
        <EuiFlexItem grow={false}>
          <EuiBadge>
            {action.target === 'channel' ? actionLabels.channel : actionLabels.directMessage}
          </EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={!readOnly}>
        {readOnly ? (
          action.target === 'channel' ? (
            <ChannelBadge value={action.destination} />
          ) : (
            <EuiBadge>{action.destination}</EuiBadge>
          )
        ) : action.target === 'channel' ? (
          <SlackChannelComboBox
            singleSelection
            values={action.destination ? [action.destination] : []}
            onChange={([destination = '']) => onChange({ ...action, destination })}
            ariaLabel={actionLabels.searchChannels}
            placeholder={actionLabels.searchChannels}
            testSubject="automationSlackChannelDestination"
          />
        ) : (
          <EuiFieldText
            compressed
            aria-label={actionLabels.searchPeople}
            placeholder={actionLabels.searchPeople}
            value={action.destination}
            onChange={(event) => onChange({ ...action, destination: event.target.value })}
            data-test-subj="automationSlackDestination"
          />
        )}
      </EuiFlexItem>
      {!readOnly && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={actionLabels.removeNotification} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={actionLabels.removeNotification}
              onClick={onRemove}
              data-test-subj="automationRemoveSlackAction"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const AutomationActionsSection = ({
  slackAction,
  onSlackActionChange,
  readOnly = false,
}: {
  slackAction?: SlackActionFormValues;
  onSlackActionChange: (action?: SlackActionFormValues) => void;
  readOnly?: boolean;
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <>
      <SectionHeader title={actionLabels.notifications} />
      <EuiSpacer size="s" />
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize={readOnly || !slackAction || slackAction.target === 'thread' ? 'm' : 's'}
      >
        {!slackAction && (
          <EuiText size="s" color="subdued">
            {readOnly ? actionLabels.noNotifications : actionLabels.empty}
          </EuiText>
        )}
        {slackAction?.target === 'thread' && <SlackThreadActionRow />}
        {slackAction && slackAction.target !== 'thread' && (
          <>
            <SlackActionRow
              action={slackAction}
              onChange={onSlackActionChange}
              onRemove={() => onSlackActionChange(undefined)}
              readOnly={readOnly}
            />
          </>
        )}
        {!slackAction && !readOnly && (
          <>
            <EuiSpacer size="s" />
            <EuiPopover
              aria-label={actionLabels.addNotification}
              isOpen={isAddOpen}
              closePopover={() => setIsAddOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downLeft"
              button={
                <EuiButton
                  size="s"
                  iconType="plus"
                  color="text"
                  onClick={() => setIsAddOpen((open) => !open)}
                  data-test-subj="automationAddAction"
                >
                  {actionLabels.addNotification}
                </EuiButton>
              }
            >
              <EuiContextMenuPanel
                items={[
                  <EuiContextMenuItem
                    key="slack"
                    icon="logoSlack"
                    onClick={() => {
                      onSlackActionChange({ target: 'channel', destination: '' });
                      setIsAddOpen(false);
                    }}
                    data-test-subj="automationAddSlackAction"
                  >
                    {actionLabels.postInSlack}
                  </EuiContextMenuItem>,
                ]}
              />
            </EuiPopover>
          </>
        )}
      </EuiPanel>
    </>
  );
};
