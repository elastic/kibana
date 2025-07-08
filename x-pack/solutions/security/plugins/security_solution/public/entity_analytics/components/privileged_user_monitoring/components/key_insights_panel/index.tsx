/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

import { ActivePrivilegedUsersTile } from './active_privileged_users_tile';
import { AlertsTriggeredTile } from './alerts_triggered_tile';
import { AnomaliesDetectedTile } from './anomalies_detected_tile';
import { GrantedRightsTile } from './granted_rights_tile';
import { AccountSwitchesTile } from './account_switches_tile';
import { AuthenticationsTile } from './authentications_tile';

export const KeyInsightsPanel: React.FC<{ spaceId: string; sourcerDataView: DataViewSpec }> = ({
  spaceId,
  sourcerDataView,
}) => {
  return (
    <EuiFlexGroup wrap gutterSize="l" responsive={false}>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <ActivePrivilegedUsersTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <AlertsTriggeredTile spaceId={spaceId} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <AnomaliesDetectedTile spaceId={spaceId} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <GrantedRightsTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <AccountSwitchesTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <AuthenticationsTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
