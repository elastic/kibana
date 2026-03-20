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
  EuiStat,
  EuiSpacer,
  EuiProgress,
  EuiText,
  EuiLoadingSpinner,
  EuiBasicTable,
  EuiHealth,
  EuiEmptyPrompt,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { useUnknownKnownsSummary } from '../hooks/use_unknown_knowns_summary';
import * as i18n from '../pages/translations';

interface TopRiskAssetRow {
  entity_name: string;
  platform: string;
  total_dormant_risks: number;
  risk_level: string;
}

interface TopDormantUserRow {
  username: string;
  asset_count: number;
}

const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    default:
      return 'success';
  }
};

export const UnknownKnownsOverview: React.FC = React.memo(() => {
  const { data, loading, error } = useUnknownKnownsSummary();

  if (loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error || !data) {
    return (
      <EuiPanel hasBorder>
        <EuiText color="danger">{i18n.UNKNOWN_KNOWNS_ERROR_LOADING}</EuiText>
      </EuiPanel>
    );
  }

  const {
    total_assets,
    assets_with_dormant_risks,
    ssh_keys_over_180d,
    dormant_users_30d,
    external_tasks_total,
    risk_distribution,
    top_risk_assets,
    top_dormant_users,
  } = data;

  console.log({ data });
  const totalDormantRisks = ssh_keys_over_180d + dormant_users_30d + external_tasks_total;

  if (totalDormantRisks === 0) {
    return (
      <EuiEmptyPrompt
        iconType="checkInCircleFilled"
        iconColor="success"
        title={<h3>{i18n.UNKNOWN_KNOWNS_NO_RISKS}</h3>}
        body={<EuiText color="subdued">{i18n.UNKNOWN_KNOWNS_NO_RISKS_DESCRIPTION}</EuiText>}
      />
    );
  }

  const topRiskAssets: TopRiskAssetRow[] = (top_risk_assets ?? []).map((asset) => ({
    entity_name: asset.entity_name,
    platform: asset.platform,
    total_dormant_risks: asset.total_dormant_risks,
    risk_level: asset.risk_level,
  }));

  const topDormantUsers: TopDormantUserRow[] = (top_dormant_users ?? []).map((user) => ({
    username: user.username,
    asset_count: user.asset_count,
  }));

  const assetColumns: Array<EuiBasicTableColumn<TopRiskAssetRow>> = [
    {
      field: 'entity_name',
      name: i18n.UNKNOWN_KNOWNS_COLUMN_HOST,
    },
    {
      field: 'platform',
      name: i18n.COLUMN_PLATFORM,
      width: '100px',
    },
    {
      field: 'total_dormant_risks',
      name: i18n.UNKNOWN_KNOWNS_COLUMN_RISKS,
      width: '80px',
    },
    {
      field: 'risk_level',
      name: i18n.UNKNOWN_KNOWNS_COLUMN_RISK_LEVEL,
      width: '100px',
      render: (riskLevel: string) => (
        <EuiHealth color={getRiskColor(riskLevel)}>{riskLevel.toUpperCase()}</EuiHealth>
      ),
    },
  ];

  const userColumns: Array<EuiBasicTableColumn<TopDormantUserRow>> = [
    {
      field: 'username',
      name: i18n.UNKNOWN_KNOWNS_COLUMN_USERNAME,
    },
    {
      field: 'asset_count',
      name: i18n.UNKNOWN_KNOWNS_COLUMN_ASSET_COUNT,
      width: '100px',
    },
  ];

  const totalRiskItems = risk_distribution.high + risk_distribution.medium + risk_distribution.low;

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Header Stats */}
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={assets_with_dormant_risks}
                description={
                  <EuiToolTip content={i18n.UNKNOWN_KNOWNS_ASSETS_AT_RISK_TOOLTIP}>
                    <span>
                      {i18n.UNKNOWN_KNOWNS_ASSETS_AT_RISK}{' '}
                      <EuiIcon type="questionInCircle" size="s" />
                    </span>
                  </EuiToolTip>
                }
                titleSize="l"
                titleColor={assets_with_dormant_risks > 0 ? 'danger' : 'success'}
              />
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                {i18n.UNKNOWN_KNOWNS_OF_TOTAL_ASSETS(total_assets)}
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={ssh_keys_over_180d}
                description={
                  <EuiToolTip content={i18n.UNKNOWN_KNOWNS_SSH_KEYS_TOOLTIP}>
                    <span>
                      {i18n.UNKNOWN_KNOWNS_SSH_KEYS} <EuiIcon type="questionInCircle" size="s" />
                    </span>
                  </EuiToolTip>
                }
                titleSize="l"
                titleColor={ssh_keys_over_180d > 0 ? 'warning' : 'success'}
              />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={dormant_users_30d}
                description={
                  <EuiToolTip content={i18n.UNKNOWN_KNOWNS_DORMANT_USERS_TOOLTIP}>
                    <span>
                      {i18n.UNKNOWN_KNOWNS_DORMANT_USERS}{' '}
                      <EuiIcon type="questionInCircle" size="s" />
                    </span>
                  </EuiToolTip>
                }
                titleSize="l"
                titleColor={dormant_users_30d > 0 ? 'warning' : 'success'}
              />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={external_tasks_total}
                description={
                  <EuiToolTip content={i18n.UNKNOWN_KNOWNS_EXTERNAL_TASKS_TOOLTIP}>
                    <span>
                      {i18n.UNKNOWN_KNOWNS_EXTERNAL_TASKS}{' '}
                      <EuiIcon type="questionInCircle" size="s" />
                    </span>
                  </EuiToolTip>
                }
                titleSize="l"
                titleColor={external_tasks_total > 0 ? 'warning' : 'success'}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Risk Distribution and Tables */}
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          {/* Risk Distribution */}
          <EuiFlexItem grow={1}>
            <EuiPanel hasBorder>
              <EuiTitle size="xs">
                <h3>{i18n.UNKNOWN_KNOWNS_RISK_DISTRIBUTION}</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 80 }}>
                      <EuiHealth color="danger">{i18n.UNKNOWN_KNOWNS_HIGH}</EuiHealth>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={risk_distribution.high}
                        max={totalRiskItems || 1}
                        color="danger"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{risk_distribution.high}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 80 }}>
                      <EuiHealth color="warning">{i18n.UNKNOWN_KNOWNS_MEDIUM}</EuiHealth>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={risk_distribution.medium}
                        max={totalRiskItems || 1}
                        color="warning"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{risk_distribution.medium}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 80 }}>
                      <EuiHealth color="success">{i18n.UNKNOWN_KNOWNS_LOW}</EuiHealth>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={risk_distribution.low}
                        max={totalRiskItems || 1}
                        color="success"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{risk_distribution.low}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          {/* Top Risk Assets */}
          <EuiFlexItem grow={2}>
            <EuiPanel hasBorder>
              <EuiTitle size="xs">
                <h3>{i18n.UNKNOWN_KNOWNS_TOP_RISK_ASSETS}</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              <EuiBasicTable<TopRiskAssetRow>
                items={topRiskAssets}
                columns={assetColumns}
                compressed
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Dormant Users Table */}
      {topDormantUsers.length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiTitle size="xs">
              <h3>{i18n.UNKNOWN_KNOWNS_TOP_DORMANT_USERS}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />

            <EuiBasicTable<TopDormantUserRow>
              items={topDormantUsers}
              columns={userColumns}
              compressed
            />
          </EuiPanel>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

UnknownKnownsOverview.displayName = 'UnknownKnownsOverview';
