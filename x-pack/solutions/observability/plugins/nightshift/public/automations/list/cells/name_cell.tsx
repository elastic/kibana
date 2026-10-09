/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink } from '@elastic/eui';
import type { Automation } from '../../hooks/use_automations';
import { getTriggerDisplay } from '../../utils/trigger_display';
import { AutomationTags } from './tags_badge';

export const AutomationNameCell = ({
  automation,
  onOpen,
}: {
  automation: Automation;
  onOpen: () => void;
}) => {
  const tags = automation.tags ?? [];

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
        <EuiLink data-test-subj="nightshiftAutomationName" color="primary" onClick={onOpen}>
          {automation.name}
        </EuiLink>
      </EuiFlexItem>
      {tags.length > 0 && (
        <EuiFlexItem grow={false}>
          <AutomationTags tags={tags} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
