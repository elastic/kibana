/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
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
  const { euiTheme } = useEuiTheme();

  const tileStyles = css`
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
    border-radius: ${euiTheme.border.radius.medium};
    padding: ${euiTheme.size.s};
    height: 100%;
  `;
  return (
    <EuiFlexGroup wrap gutterSize="m" responsive={false} style={{ width: '100%' }}>
      <EuiFlexItem
        grow={false}
        style={{
          minWidth: `calc(33.33% - ${euiTheme.size.s})`,
          maxWidth: `calc(33.33% - ${euiTheme.size.s})`,
        }}
      >
        <div css={tileStyles}>
          <ActivePrivilegedUsersTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        style={{
          minWidth: `calc(33.33% - ${euiTheme.size.s})`,
          maxWidth: `calc(33.33% - ${euiTheme.size.s})`,
        }}
      >
        <div css={tileStyles}>
          <AlertsTriggeredTile spaceId={spaceId} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        style={{
          minWidth: `calc(33.33% - ${euiTheme.size.s})`,
          maxWidth: `calc(33.33% - ${euiTheme.size.s})`,
        }}
      >
        <div css={tileStyles}>
          <AnomaliesDetectedTile spaceId={spaceId} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        style={{
          minWidth: `calc(33.33% - ${euiTheme.size.s})`,
          maxWidth: `calc(33.33% - ${euiTheme.size.s})`,
        }}
      >
        <div css={tileStyles}>
          <GrantedRightsTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        style={{
          minWidth: `calc(33.33% - ${euiTheme.size.s})`,
          maxWidth: `calc(33.33% - ${euiTheme.size.s})`,
        }}
      >
        <div css={tileStyles}>
          <AccountSwitchesTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        style={{
          minWidth: `calc(33.33% - ${euiTheme.size.s})`,
          maxWidth: `calc(33.33% - ${euiTheme.size.s})`,
        }}
      >
        <div css={tileStyles}>
          <AuthenticationsTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
