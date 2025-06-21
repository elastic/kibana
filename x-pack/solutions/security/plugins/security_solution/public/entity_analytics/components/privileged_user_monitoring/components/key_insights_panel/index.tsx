/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

import { ActivePrivilegedUsersTile } from './active_privileged_users_tile';
import { AlertsTriggeredTile } from './alerts_triggered_tile';
import { AnomaliesDetectedTile } from './anomalies_detected_tile';
import { GrantedRightsTile } from './granted_rights_tile';
import { AccountSwitchesTile } from './account_switches_tile';
import { AuthenticationsTile } from './authentications_tile';

const tileStyles = css`
  border: 1px solid #d3dae6;
  border-radius: 6px;
  padding: 12px;
  height: 100%;
`;

interface TimeRange {
  from: string;
  to: string;
}

interface KeyInsightsPanelProps {
  timerange: TimeRange;
}

export const KeyInsightsPanel: React.FC<KeyInsightsPanelProps> = ({ timerange }) => {
  return (
    <EuiFlexGroup
      wrap
      css={css`
        width: 100%;
        gap: 16px;
        & > * {
          min-width: calc(33.33% - 11px) !important;
          max-width: calc(33.33% - 11px) !important;
        }
      `}
    >
      <EuiFlexItem grow={false}>
        <div css={tileStyles}>
          <ActivePrivilegedUsersTile timerange={timerange} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div css={tileStyles}>
          <AlertsTriggeredTile timerange={timerange} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div css={tileStyles}>
          <AnomaliesDetectedTile timerange={timerange} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div css={tileStyles}>
          <GrantedRightsTile timerange={timerange} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div css={tileStyles}>
          <AccountSwitchesTile timerange={timerange} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div css={tileStyles}>
          <AuthenticationsTile timerange={timerange} />
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
