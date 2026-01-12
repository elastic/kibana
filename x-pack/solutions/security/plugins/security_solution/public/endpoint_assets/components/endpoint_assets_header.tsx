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
  EuiStat,
  EuiPanel,
  EuiButton,
  EuiLoadingSpinner,
} from '@elastic/eui';
import * as i18n from '../pages/translations';

export interface EndpointAssetsHeaderProps {
  totalAssets: number;
  activeAssets: number;
  criticalPosture: number;
  elevatedPrivileges: number;
  recentlyChanged: number;
  onRefresh: () => void;
  loading?: boolean;
}

export const EndpointAssetsHeader: React.FC<EndpointAssetsHeaderProps> = React.memo(
  ({
    totalAssets,
    activeAssets,
    criticalPosture,
    elevatedPrivileges,
    recentlyChanged,
    onRefresh,
    loading,
  }) => {
    const activePercentage = totalAssets > 0
      ? Math.round((activeAssets / totalAssets) * 100)
      : 0;

    return (
      <EuiPanel hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiStat
              title={totalAssets.toLocaleString()}
              description={i18n.TOTAL_ASSETS}
              titleSize="l"
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiStat
              title={`${activePercentage}%`}
              description={i18n.ACTIVE_24H}
              titleSize="l"
              titleColor="success"
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiStat
              title={criticalPosture.toLocaleString()}
              description={i18n.CRITICAL_POSTURE}
              titleSize="l"
              titleColor={criticalPosture > 0 ? 'danger' : 'default'}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiStat
              title={elevatedPrivileges.toLocaleString()}
              description={i18n.ELEVATED_PRIVILEGES}
              titleSize="l"
              titleColor={elevatedPrivileges > 0 ? 'warning' : 'default'}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiStat
              title={recentlyChanged.toLocaleString()}
              description={i18n.RECENTLY_CHANGED}
              titleSize="l"
            />
          </EuiFlexItem>

          <EuiFlexItem grow />

          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onRefresh}
              iconType="refresh"
              disabled={loading}
            >
              {loading ? <EuiLoadingSpinner size="m" /> : i18n.REFRESH}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

EndpointAssetsHeader.displayName = 'EndpointAssetsHeader';
