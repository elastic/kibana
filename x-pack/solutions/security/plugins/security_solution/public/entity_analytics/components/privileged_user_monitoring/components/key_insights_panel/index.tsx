/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiPanel } from '@elastic/eui';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';

import { PrivilegedUsersTile } from './privileged_users_tile';
import { AlertsTriggeredTile } from './alerts_triggered_tile';
import { AnomaliesDetectedTile } from './anomalies_detected_tile';
import { GrantedRightsTile } from './granted_rights_tile';
import { AccountSwitchesTile } from './account_switches_tile';
import { AuthenticationsTile } from './authentications_tile';

export const KeyInsightsPanel: React.FC<{
  spaceId: string;
  indexPattern: string;
  fields: DataViewFieldMap;
}> = ({ spaceId, indexPattern, fields }) => {
  return (
    <EuiFlexGrid columns={3} data-test-subj="key-insights-panel">
      <EuiPanel hasBorder>
        <PrivilegedUsersTile spaceId={spaceId} />
      </EuiPanel>
      <EuiPanel hasBorder>
        <AlertsTriggeredTile spaceId={spaceId} />
      </EuiPanel>
      <EuiPanel hasBorder>
        <AnomaliesDetectedTile spaceId={spaceId} />
      </EuiPanel>
      <EuiPanel hasBorder>
        <GrantedRightsTile spaceId={spaceId} indexPattern={indexPattern} fields={fields} />
      </EuiPanel>
      <EuiPanel hasBorder>
        <AccountSwitchesTile spaceId={spaceId} indexPattern={indexPattern} fields={fields} />
      </EuiPanel>
      <EuiPanel hasBorder>
        <AuthenticationsTile spaceId={spaceId} indexPattern={indexPattern} fields={fields} />
      </EuiPanel>
    </EuiFlexGrid>
  );
};
