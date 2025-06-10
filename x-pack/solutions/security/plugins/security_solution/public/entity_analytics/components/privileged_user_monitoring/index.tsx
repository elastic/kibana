/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { RiskLevelsPrivilegedUsersPanel } from './components/risk_level_panel';
import { UserActivityPrivilegedUsersPanel } from './components/privileged_user_activity';

export const PrivilegedUserMonitoring = () => {
  const spaceId = useSpaceId();
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup responsive direction="row">
          <EuiFlexItem>
            {spaceId && <RiskLevelsPrivilegedUsersPanel spaceId={spaceId} />}
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
        <UserActivityPrivilegedUsersPanel />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasShadow={false} hasBorder={true}>
          {'TODO: Privileged users'}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
