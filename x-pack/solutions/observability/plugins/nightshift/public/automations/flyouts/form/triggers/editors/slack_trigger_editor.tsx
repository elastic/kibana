/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { actionLabels } from '../../actions/automation_actions_section';
import type { SlackTriggerFormValues, TriggerFormValues } from '../../automation_form_values';
import { ListPill } from '../pills/list_pill';
import { PillPopover } from '../pills/pill_popover';
import { Sentence } from '../pills/sentence';
import { triggerLabels, slackTriggerLeads } from '../translations';

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
    <EuiIcon type="logoSlack" aria-hidden={true} />
    <EuiText size="s">
      <strong>{slackTriggerLeads[trigger.kind]}</strong>
    </EuiText>
    <EuiText size="s">
      {trigger.kind === 'slack_invite' ? triggerLabels.slackTo : triggerLabels.slackIn}
    </EuiText>
    <ListPill
      ariaLabel={triggerLabels.selectChannels}
      emptyLabel={triggerLabels.selectChannels}
      placeholder={actionLabels.searchChannels}
      values={trigger.channels}
      onChange={(channels) => onChange({ ...trigger, channels })}
      testSubject="automationSlackTriggerChannels"
      readOnly={readOnly}
    />
    {trigger.kind === 'slack_message' &&
      (readOnly ? (
        <EuiText size="s">{trigger.messageFilter || triggerLabels.anyMessage}</EuiText>
      ) : (
        <PillPopover
          ariaLabel={triggerLabels.anyMessage}
          label={trigger.messageFilter.trim() || triggerLabels.anyMessage}
          testSubject="automationSlackTriggerMessage"
        >
          {() => (
            <EuiPanel paddingSize="s" hasShadow={false} color="transparent" css={{ width: 300 }}>
              <EuiFieldText
                compressed
                autoFocus
                aria-label={triggerLabels.anyMessage}
                placeholder={triggerLabels.messageContains}
                value={trigger.messageFilter}
                onChange={(event) => onChange({ ...trigger, messageFilter: event.target.value })}
                data-test-subj="automationSlackTriggerMessageInput"
              />
            </EuiPanel>
          )}
        </PillPopover>
      ))}
    <EuiText size="s">
      {trigger.kind === 'slack_message' ? triggerLabels.from : triggerLabels.slackBy}
    </EuiText>
    <ListPill
      ariaLabel={triggerLabels.anyone}
      emptyLabel={triggerLabels.anyone}
      placeholder={actionLabels.searchPeople}
      values={trigger.users}
      onChange={(users) => onChange({ ...trigger, users })}
      testSubject="automationSlackTriggerUsers"
      readOnly={readOnly}
    />
  </Sentence>
);
