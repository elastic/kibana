/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import { RiskLevelsPrivilegedUsersPanel } from './components/risk_level_panel';

export const PrivilegedUserMonitoring = () => {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup responsive direction="row">
          <EuiFlexItem>
            <RiskLevelsPrivilegedUsersPanel />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder={true}>
              <span>{'TODO: Top risky privileged users'}</span>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder={true}>
          <span>{'TODO: Top privileged access detections'}</span>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder={true}>
          {'TODO: Privileged user activity'}
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder={true}>
          {'TODO: Privileged users'}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
