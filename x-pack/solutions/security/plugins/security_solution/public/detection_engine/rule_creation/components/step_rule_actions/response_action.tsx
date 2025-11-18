/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import type { RuleAction } from '@kbn/alerting-plugin/common';
import { getActionDetails } from '../../../rule_response_actions/constants';

interface ResponseActionProps {
  action: Omit<RuleAction, 'id' | 'group'>;
}

export function ResponseAction({ action }: ResponseActionProps) {
  const { name, logo } = getActionDetails(action.actionTypeId);

  return (
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" gutterSize="s" component="span" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIconTip size="m" type={logo} content={name} anchorClassName="eui-textTruncate" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{name}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
