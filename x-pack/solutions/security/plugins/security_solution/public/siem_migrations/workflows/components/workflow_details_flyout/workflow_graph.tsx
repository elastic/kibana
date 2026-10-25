/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { PHISHING_EMAIL_STEPS } from '../../common/workflow_content';

export const WorkflowGraph: React.FC = React.memo(() => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup direction="column" alignItems="center" gutterSize="none">
      {PHISHING_EMAIL_STEPS.map((step, index) => (
        <EuiFlexItem key={step.title} style={{ width: '100%', maxWidth: 360 }}>
          <EuiPanel hasBorder paddingSize="s">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={step.status === 'mapped' ? 'checkInCircleFilled' : 'warning'}
                  color={step.status === 'mapped' ? 'success' : 'warning'}
                  aria-hidden={true}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{step.title}</strong>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {step.tag}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          {index < PHISHING_EMAIL_STEPS.length - 1 && (
            <EuiFlexGroup direction="column" alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <div style={{ width: 1, height: 16, backgroundColor: euiTheme.border.color }} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="arrowDown" size="s" color="subdued" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div style={{ width: 1, height: 16, backgroundColor: euiTheme.border.color }} />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});
WorkflowGraph.displayName = 'WorkflowGraph';
