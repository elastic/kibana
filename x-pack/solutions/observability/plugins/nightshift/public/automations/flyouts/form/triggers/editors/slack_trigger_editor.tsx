/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiPanel, EuiText, EuiTextArea } from '@elastic/eui';
import {
  formatChannelValue,
  useAllRelayAppBindings,
} from '../../../../../settings/components/apps_section/use_relay_app_bindings';
import { actionLabels } from '../../actions/automation_actions_section';
import type { SlackTriggerFormValues, TriggerFormValues } from '../../automation_form_values';
import { findUnconnectedChannels, SlackChannelComboBox } from '../../slack_channel_combo_box';
import { ListPill } from '../pills/list_pill';
import { PillPopover } from '../pills/pill_popover';
import { Sentence, SentenceIcon } from '../pills/sentence';
import { triggerLabels, slackTriggerLeads } from '../translations';

const ChannelPill = ({
  channels,
  onChange,
  readOnly,
}: {
  channels: string[];
  onChange: (channels: string[]) => void;
  readOnly: boolean;
}) => {
  const connected = useAllRelayAppBindings();
  const label =
    channels.map((value) => formatChannelValue(value, connected.bindings)).join(', ') ||
    triggerLabels.selectChannels;

  if (readOnly) return <EuiBadge>{label}</EuiBadge>;
  return (
    <PillPopover
      ariaLabel={triggerLabels.selectChannels}
      label={label}
      isInvalid={findUnconnectedChannels(channels, connected).length > 0}
      testSubject="automationSlackTriggerChannels"
    >
      {() => (
        <EuiPanel paddingSize="s" hasShadow={false} color="transparent" css={{ width: 300 }}>
          <SlackChannelComboBox
            autoFocus
            warnUnconnected
            values={channels}
            onChange={onChange}
            ariaLabel={triggerLabels.selectChannels}
            placeholder={actionLabels.searchChannels}
            testSubject="automationSlackTriggerChannelsInput"
          />
        </EuiPanel>
      )}
    </PillPopover>
  );
};

export const SlackTriggerEditor = ({
  trigger,
  onChange,
  readOnly = false,
}: {
  trigger: SlackTriggerFormValues;
  onChange: (trigger: TriggerFormValues) => void;
  readOnly?: boolean;
}) => (
  <Sentence>
    <SentenceIcon type="logoSlack" />
    <EuiText size="s">
      <strong>{slackTriggerLeads[trigger.kind]}</strong>
    </EuiText>
    <EuiText size="s">{triggerLabels.slackIn}</EuiText>
    <ChannelPill
      channels={trigger.channels}
      onChange={(channels) => onChange({ ...trigger, channels })}
      readOnly={readOnly}
    />
    {readOnly ? (
      <EuiBadge>{trigger.messageFilter || triggerLabels.anyMessage}</EuiBadge>
    ) : (
      <PillPopover
        ariaLabel={triggerLabels.anyMessage}
        label={trigger.messageFilter.trim() || triggerLabels.anyMessage}
        testSubject="automationSlackTriggerMessage"
      >
        {(close) => (
          <EuiPanel paddingSize="s" hasShadow={false} color="transparent" css={{ width: 340 }}>
            <EuiTextArea
              compressed
              fullWidth
              rows={2}
              resize="none"
              autoFocus
              aria-label={triggerLabels.anyMessage}
              placeholder={triggerLabels.messageContains}
              value={trigger.messageFilter}
              onChange={(event) =>
                onChange({ ...trigger, messageFilter: event.target.value.replace(/[\r\n]/g, '') })
              }
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                event.preventDefault();
                close();
              }}
              data-test-subj="automationSlackTriggerMessageInput"
            />
          </EuiPanel>
        )}
      </PillPopover>
    )}
    <EuiText size="s">{triggerLabels.from}</EuiText>
    <ListPill
      ariaLabel={triggerLabels.anyone}
      emptyLabel={triggerLabels.anyone}
      placeholder={actionLabels.searchPeople}
      values={trigger.users}
      onChange={(users) => onChange({ ...trigger, users })}
      testSubject="automationSlackTriggerUsers"
      readOnly={readOnly}
    />
    <EuiText size="s">{triggerLabels.via}</EuiText>
    <ListPill
      ariaLabel={triggerLabels.anyApp}
      emptyLabel={triggerLabels.anyApp}
      placeholder={triggerLabels.searchApps}
      values={trigger.bots}
      onChange={(bots) => onChange({ ...trigger, bots })}
      testSubject="automationSlackTriggerBots"
      readOnly={readOnly}
    />
  </Sentence>
);
