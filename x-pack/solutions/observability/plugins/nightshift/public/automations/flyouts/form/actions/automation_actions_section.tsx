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
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SlackActionFormValues, SlackTarget } from '../automation_form_values';
import { SectionHeader } from '../section_header';
import { SentenceIcon } from '../triggers/pills/sentence';

export const actionLabels = {
  actions: i18n.translate('xpack.nightshift.automations.flyout.actions', {
    defaultMessage: 'Actions',
  }),
  empty: i18n.translate('xpack.nightshift.automations.flyout.actionsEmpty', {
    defaultMessage: 'Choose what happens when this automation runs.',
  }),
  noActions: i18n.translate('xpack.nightshift.automations.flyout.noActions', {
    defaultMessage: 'No actions',
  }),
  addAction: i18n.translate('xpack.nightshift.automations.flyout.addAction', {
    defaultMessage: 'Add action',
  }),
  postInSlack: i18n.translate('xpack.nightshift.automations.flyout.postInSlack', {
    defaultMessage: 'Post in Slack',
  }),
  whereToRespond: i18n.translate('xpack.nightshift.automations.flyout.whereToRespond', {
    defaultMessage: 'Where to respond',
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
  removeAction: i18n.translate('xpack.nightshift.automations.flyout.removeAction', {
    defaultMessage: 'Remove action',
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
      <EuiFlexItem grow={false}>
        {readOnly ? (
          <EuiBadge>
            {action.target === 'channel' ? actionLabels.channel : actionLabels.directMessage}
          </EuiBadge>
        ) : (
          <EuiSelect
            data-test-subj="nightshiftSlackActionRowSelect"
            compressed
            aria-label={actionLabels.whereToRespond}
            value={action.target}
            options={[
              { value: 'channel', text: actionLabels.channel },
              { value: 'self', text: actionLabels.directMessage },
            ]}
            onChange={(event) => onChange({ ...action, target: event.target.value as SlackTarget })}
          />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={!readOnly}>
        {readOnly ? (
          <EuiBadge>{action.destination}</EuiBadge>
        ) : (
          <EuiFieldText
            compressed
            aria-label={
              action.target === 'channel' ? actionLabels.searchChannels : actionLabels.searchPeople
            }
            placeholder={
              action.target === 'channel' ? actionLabels.searchChannels : actionLabels.searchPeople
            }
            value={action.destination}
            onChange={(event) => onChange({ ...action, destination: event.target.value })}
            data-test-subj="automationSlackDestination"
          />
        )}
      </EuiFlexItem>
      {!readOnly && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={actionLabels.removeAction} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={actionLabels.removeAction}
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
      <SectionHeader title={actionLabels.actions} />
      <EuiSpacer size="s" />
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize={readOnly || !slackAction || slackAction.target === 'thread' ? 'm' : 's'}
      >
        {!slackAction && (
          <EuiText size="s" color="subdued">
            {readOnly ? actionLabels.noActions : actionLabels.empty}
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
              aria-label={actionLabels.addAction}
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
                  {actionLabels.addAction}
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
