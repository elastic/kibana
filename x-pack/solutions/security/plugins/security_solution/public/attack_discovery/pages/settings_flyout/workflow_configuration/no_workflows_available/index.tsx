/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';

import * as i18n from '../translations';

export interface NoWorkflowsAvailableProps {
  agentBuilderUrl: string;
}

export const NoWorkflowsAvailable: React.FC<NoWorkflowsAvailableProps> = React.memo(
  ({ agentBuilderUrl }) => {
    const shouldShowLink = agentBuilderUrl.trim() !== '';

    return (
      <EuiFlexGroup
        alignItems="center"
        data-test-subj="noWorkflowsAvailable"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon color="subdued" size="s" type="plusInCircle" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            {i18n.NO_CUSTOM_WORKFLOWS_AVAILABLE_MESSAGE}
          </EuiText>
        </EuiFlexItem>
        {shouldShowLink ? (
          <EuiFlexItem grow={false}>
            <EuiLink external href={agentBuilderUrl} target="_blank">
              {i18n.CREATE_A_WORKFLOW_LINK_LABEL}
            </EuiLink>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }
);

NoWorkflowsAvailable.displayName = 'NoWorkflowsAvailable';
