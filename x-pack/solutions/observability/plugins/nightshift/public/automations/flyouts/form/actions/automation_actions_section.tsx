/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SlackActionFormValues, SlackTarget } from '../automation_form_values';

export const actionLabels = {
  actions: i18n.translate('xpack.nightshift.automations.flyout.actions', {
    defaultMessage: 'Actions',
  }),
  learnings: i18n.translate('xpack.nightshift.automations.flyout.learnings', {
    defaultMessage: 'Learnings',
  }),
  learningsHelp: i18n.translate('xpack.nightshift.automations.flyout.learningsHelp', {
    defaultMessage: 'Nightshift updates knowledge, decision trees, and memories on each run.',
  }),
  manage: i18n.translate('xpack.nightshift.automations.flyout.manageLearnings', {
    defaultMessage: 'Manage',
  }),
  manageSoon: i18n.translate('xpack.nightshift.automations.flyout.manageLearningsSoon', {
    defaultMessage: 'Learnings settings are coming soon',
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
  removeAction: i18n.translate('xpack.nightshift.automations.flyout.removeAction', {
    defaultMessage: 'Remove action',
  }),
  channelRequired: i18n.translate('xpack.nightshift.automations.flyout.channelRequired', {
    defaultMessage: 'Choose a Slack channel to post to before saving',
  }),
  personRequired: i18n.translate('xpack.nightshift.automations.flyout.personRequired', {
    defaultMessage: 'Choose who to message in Slack before saving',
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

const SlackActionRow = ({
  action,
  onChange,
  onRemove,
}: {
  action: SlackActionFormValues;
  onChange: (action: SlackActionFormValues) => void;
  onRemove: () => void;
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false} css={useActionRowCss()}>
    <EuiFlexItem grow={false}>
      <EuiIcon type="logoSlack" aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <strong>{actionLabels.postInSlack}</strong>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
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
    </EuiFlexItem>
    <EuiFlexItem>
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
    </EuiFlexItem>
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
  </EuiFlexGroup>
);

export const AutomationActionsSection = ({
  slackAction,
  onSlackActionChange,
}: {
  slackAction?: SlackActionFormValues;
  onSlackActionChange: (action?: SlackActionFormValues) => void;
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const rowCss = useActionRowCss();

  return (
    <>
      <EuiTitle size="xs">
        <h3>{actionLabels.actions}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="s">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} css={rowCss}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="documentation" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{actionLabels.learnings}</strong>{' '}
              <EuiText size="s" color="subdued" component="span">
                {actionLabels.learningsHelp}
              </EuiText>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={actionLabels.manageSoon}>
              <EuiButtonEmpty
                data-test-subj="nightshiftAutomationActionsSectionButton"
                size="xs"
                color="text"
              >
                {actionLabels.manage}
              </EuiButtonEmpty>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        {slackAction && (
          <>
            <EuiSpacer size="xs" />
            <SlackActionRow
              action={slackAction}
              onChange={onSlackActionChange}
              onRemove={() => onSlackActionChange(undefined)}
            />
          </>
        )}
        {!slackAction && (
          <>
            <EuiSpacer size="s" />
            <EuiPopover
              aria-label={actionLabels.addAction}
              isOpen={isAddOpen}
              closePopover={() => setIsAddOpen(false)}
              panelPaddingSize="none"
              anchorPosition="downLeft"
              button={
                <EuiButtonEmpty
                  iconType="plus"
                  color="text"
                  onClick={() => setIsAddOpen((open) => !open)}
                  data-test-subj="automationAddAction"
                >
                  {actionLabels.addAction}
                </EuiButtonEmpty>
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
