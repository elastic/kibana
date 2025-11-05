/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';

export const WorkplaceAIHomeFooter: React.FC = () => {
  return (
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem>
        <EuiPanel paddingSize="l">
          <EuiTitle size="xs">
            <h5>Browse dashboards</h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>Learn how to create dashboards to Measure adoption, trust, and performance.</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton color="text" onClick={() => {}}>
            Explore dashboards
          </EuiButton>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel paddingSize="l">
          <EuiTitle size="xs">
            <h5>Use a workflow template</h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>Try prebuilt automations (e.g., summarize tickets, draft status reports).</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton color="text" onClick={() => {}}>
            Browse templates
          </EuiButton>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
