/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEbtProps } from '@kbn/ebt-click';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  euiTextTruncateCSS,
  useEuiTheme,
} from '@elastic/eui';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../../common/ebt_constants';
import type { Automation } from '../../../../data/automations/use_automations';
import { getTriggerDisplay } from '../../utils/trigger_display';
import { AutomationWorkflowBadge } from '../../workflow_recovery';
import { AutomationTags } from './tags_badge';

export const AutomationNameCell = ({
  automation,
  onOpen,
}: {
  automation: Automation;
  onOpen: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const tags = automation.tags ?? [];
  const hasWorkflowStatus =
    automation.backingWorkflow && automation.backingWorkflow.state !== 'available';

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={getTriggerDisplay(automation.trigger.rows[0]).icon}
          size="m"
          aria-hidden={true}
        />
      </EuiFlexItem>
      <EuiFlexItem css={{ minInlineSize: 0, gap: euiTheme.size.xs }}>
        <EuiLink
          css={euiTextTruncateCSS()}
          title={automation.name}
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
        {(hasWorkflowStatus || tags.length > 0) && (
          <EuiFlexGroup wrap gutterSize="xs" responsive={false}>
            {hasWorkflowStatus && (
              <EuiFlexItem grow={false}>
                <AutomationWorkflowBadge automation={automation} />
              </EuiFlexItem>
            )}
            {tags.length > 0 && (
              <EuiFlexItem grow={false}>
                <AutomationTags tags={tags} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
