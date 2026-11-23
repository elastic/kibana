/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEbtProps } from '@kbn/ebt-click';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiIconTip, EuiLink } from '@elastic/eui';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../../common/ebt_constants';
import type { Automation } from '../../../../data/automations/use_automations';
import { getTriggerDisplay } from '../../utils/trigger_display';
import { getUnconnectedSlackChannelsMessage } from '../../utils/unconnected_slack_channels';
import { AutomationTags } from './tags_badge';

export const AutomationNameCell = ({
  automation,
  unconnectedSlackChannels = [],
  onOpen,
}: {
  automation: Automation;
  /** Slack channels the automation listens to that are no longer connected. */
  unconnectedSlackChannels?: string[];
  onOpen: () => void;
}) => {
  const tags = automation.tags ?? [];
  const message = getUnconnectedSlackChannelsMessage(unconnectedSlackChannels);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={getTriggerDisplay(automation.trigger.rows[0]).icon}
          size="m"
          aria-hidden={true}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj="nightshiftAutomationName"
          color="primary"
          onClick={onOpen}
          {...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.OPEN_AUTOMATION,
            element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
          })}
        >
          {automation.name}
        </EuiLink>
      </EuiFlexItem>
      {unconnectedSlackChannels.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="warning"
            color="warning"
            content={message}
            aria-label={message}
            iconProps={{ 'data-test-subj': 'automationBrokenSlackChannel' }}
          />
        </EuiFlexItem>
      )}
      {tags.length > 0 && (
        <EuiFlexItem grow={false}>
          <AutomationTags tags={tags} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
