/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';

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

export const KeyInsightsPanel: React.FC<{ spaceId: string; sourcerDataView: DataViewSpec }> = ({
  spaceId,
  sourcerDataView,
}) => {
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
          <ActivePrivilegedUsersTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div css={tileStyles}>
          <AlertsTriggeredTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div css={tileStyles}>
          <AnomaliesDetectedTile spaceId={spaceId} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div css={tileStyles}>
          <GrantedRightsTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div css={tileStyles}>
          <AccountSwitchesTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <div css={tileStyles}>
          <AuthenticationsTile spaceId={spaceId} sourcerDataView={sourcerDataView} />
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
