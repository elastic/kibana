/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiStat,
  EuiPanel,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiBadge,
  EuiIcon,
  EuiTitle,
  EuiText,
  EuiHealth,
  EuiToolTip,
} from '@elastic/eui';
import { PlatformIcon } from '../../management/components/endpoint_responder/components/header_info/platforms';
import { usePrivileges } from '../hooks/use_privileges';
import type {
  PrivilegeAsset,
  PrivilegeRiskLevel,
  TopAdminUser,
} from '../../../common/endpoint_assets';

// =============================================================================
// i18n Translations
// =============================================================================

const TITLE_PRIVILEGE_SUMMARY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.privileges.summaryTitle',
  { defaultMessage: 'Privilege Summary' }
);

const TITLE_RISK_DISTRIBUTION = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.privileges.riskDistributionTitle',
  { defaultMessage: 'Risk Distribution' }
);

const TITLE_ENDPOINT_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.privileges.endpointPrivilegesTitle',
  { defaultMessage: 'Endpoint Privileges' }
);

const TITLE_TOP_ADMIN_USERS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.privileges.topAdminUsersTitle',
  { defaultMessage: 'Top Admin Users Across Fleet' }
);

const STAT_TOTAL_ADMINS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.privileges.totalAdmins',
  { defaultMessage: 'Total Admin Accounts' }
);

const STAT_ELEVATED_RISK = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.privileges.elevatedRisk',
  { defaultMessage: 'Elevated Risk Assets' }
);

const STAT_AVG_ADMINS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.privileges.avgAdmins',
  { defaultMessage: 'Avg Admins per Host' }
);

const STAT_UNIQUE_USERS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.privileges.uniqueUsers',
  { defaultMessage: 'Unique Admin Users' }
);

const EMPTY_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.privileges.emptyTitle',
  { defaultMessage: 'No Privilege Data Available' }
);

const EMPTY_BODY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.privileges.emptyBody',
  {
    defaultMessage:
      'Privilege data will appear once osquery local admin queries are collected and processed.',
  }
);

const ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.endpointAssets.privileges.errorTitle',
  { defaultMessage: 'Error Loading Privilege Data' }
);

// =============================================================================
// Helper Functions
// =============================================================================

const normalizePlatform = (platform: string): 'windows' | 'macos' | 'linux' | null => {
  const p = platform?.toLowerCase();
  switch (p) {
    case 'windows':
      return 'windows';
    case 'darwin':
    case 'macos':
      return 'macos';
    case 'linux':
    case 'ubuntu':
    case 'rhel':
    case 'centos':
    case 'debian':
      return 'linux';
    default:
      return null;
  }
};

const getPlatformIcon = (platform: string): React.ReactNode => {
  const normalizedPlatform = normalizePlatform(platform);
  if (normalizedPlatform) {
    return <PlatformIcon platform={normalizedPlatform} size="m" />;
  }
  return <EuiIcon type="desktop" size="m" />;
};

const getPlatformLabel = (platform: string): string => {
  switch (platform?.toLowerCase()) {
    case 'darwin':
      return 'macOS';
    case 'rhel':
      return 'RHEL';
    default:
      return platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Unknown';
  }
};

const getRiskLevelColor = (level: PrivilegeRiskLevel): string => {
  switch (level) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
  }
};

const getRiskLevelLabel = (level: PrivilegeRiskLevel): string => {
  switch (level) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
  }
};

const getUserTypeColor = (userType: TopAdminUser['userType']): string => {
  switch (userType) {
    case 'built-in':
      return 'hollow';
    case 'service':
      return 'primary';
    case 'suspicious':
      return 'danger';
    case 'user':
      return 'default';
  }
};

const getUserTypeLabel = (userType: TopAdminUser['userType']): string => {
  switch (userType) {
    case 'built-in':
      return 'Built-in';
    case 'service':
      return 'Service';
    case 'suspicious':
      return 'Suspicious';
    case 'user':
      return 'User';
  }
};

// =============================================================================
// Component
// =============================================================================

export const PrivilegesContent: React.FC = React.memo(() => {
  const { summary, loading, error } = usePrivileges();

  // Pagination state for assets table
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof PrivilegeAsset>('adminCount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const onTableChange = useCallback(({ page, sort }: CriteriaWithPagination<PrivilegeAsset>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
    if (sort) {
      setSortField(sort.field as keyof PrivilegeAsset);
      setSortDirection(sort.direction);
    }
  }, []);

  const displayedAssets = useMemo(() => {
    console.log({ summary });
    if (!summary?.assets) return [];

    const sorted = [...summary.assets].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [summary?.assets, sortField, sortDirection, pageIndex, pageSize]);

  // Loading state
  if (loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Error state
  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        color="danger"
        title={<h2>{ERROR_TITLE}</h2>}
        body={<p>{error.message}</p>}
      />
    );
  }

  // Empty state
  if (!summary || summary.assets.length === 0) {
    return (
      <EuiEmptyPrompt iconType="user" title={<h2>{EMPTY_TITLE}</h2>} body={<p>{EMPTY_BODY}</p>} />
    );
  }

  // Columns for assets table
  const assetColumns: Array<EuiBasicTableColumn<PrivilegeAsset>> = [
    {
      field: 'entityName',
      name: 'Endpoint',
      sortable: true,
      render: (name: string, asset: PrivilegeAsset) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{getPlatformIcon(asset.platform)}</EuiFlexItem>
          <EuiFlexItem>
            <strong>{name}</strong>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'platform',
      name: 'Platform',
      sortable: true,
      width: '120px',
      render: (platform: string) => getPlatformLabel(platform),
    },
    {
      field: 'adminCount',
      name: 'Admins',
      sortable: true,
      width: '100px',
      align: 'center',
      render: (count: number, asset: PrivilegeAsset) => {
        // Build tooltip content based on available data
        let tooltipContent: React.ReactNode;
        if (asset.adminUsers.length > 0) {
          tooltipContent = (
            <div>
              <strong>Admin Users:</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                {asset.adminUsers.slice(0, 10).map((user, idx) => (
                  <li key={idx}>{user}</li>
                ))}
                {asset.adminUsers.length > 10 && (
                  <li>...and {asset.adminUsers.length - 10} more</li>
                )}
              </ul>
            </div>
          );
        } else if (count > 0) {
          tooltipContent = `${count} admin account(s) detected. User details not available in collected data.`;
        } else {
          tooltipContent = 'No admin accounts detected';
        }

        return (
          <EuiToolTip position="top" content={tooltipContent}>
            <EuiBadge
              color={getRiskLevelColor(asset.riskLevel)}
              style={{ cursor: 'pointer', minWidth: '40px' }}
            >
              {count}
            </EuiBadge>
          </EuiToolTip>
        );
      },
    },
    {
      field: 'riskLevel',
      name: 'Risk',
      sortable: true,
      width: '100px',
      render: (level: PrivilegeRiskLevel) => (
        <EuiBadge color={getRiskLevelColor(level)}>{getRiskLevelLabel(level)}</EuiBadge>
      ),
    },
    {
      field: 'adminUsers',
      name: 'Admin Users',
      render: (users: string[], asset: PrivilegeAsset) => {
        if (users.length === 0) {
          // Show placeholder based on whether we have a count
          if (asset.adminCount > 0) {
            return (
              <EuiToolTip content="User details not available in collected data">
                <EuiText color="subdued" size="s">
                  <em>{asset.adminCount} user(s)</em>
                </EuiText>
              </EuiToolTip>
            );
          }
          return <EuiText color="subdued">-</EuiText>;
        }
        const displayUsers = users.slice(0, 3);
        const remaining = users.length - 3;
        return (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {displayUsers.map((user, idx) => (
              <EuiFlexItem grow={false} key={idx}>
                <EuiBadge color="hollow">{user}</EuiBadge>
              </EuiFlexItem>
            ))}
            {remaining > 0 && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                      {users.slice(3).map((user, idx) => (
                        <li key={idx}>{user}</li>
                      ))}
                    </ul>
                  }
                >
                  <EuiBadge color="hollow">+{remaining} more</EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
  ];

  // Columns for top admin users table
  const topAdminColumns: Array<EuiBasicTableColumn<TopAdminUser>> = [
    {
      field: 'username',
      name: 'Username',
      render: (username: string, user: TopAdminUser) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {user.userType === 'suspicious' ? (
              <EuiIcon type="warning" color="danger" />
            ) : (
              <EuiIcon type="user" />
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <strong>{username}</strong>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'assetCount',
      name: 'Assets',
      width: '100px',
      align: 'center',
      render: (count: number) => <EuiBadge color="hollow">{count}</EuiBadge>,
    },
    {
      field: 'userType',
      name: 'Type',
      width: '120px',
      render: (userType: TopAdminUser['userType']) => (
        <EuiBadge color={getUserTypeColor(userType)}>{getUserTypeLabel(userType)}</EuiBadge>
      ),
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Section A: Summary Statistics */}
      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h3>{TITLE_PRIVILEGE_SUMMARY}</h3>
          </EuiTitle>
          <EuiSpacer size="l" />
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <EuiStat
                title={summary.totalAdminAccounts.toLocaleString()}
                description={STAT_TOTAL_ADMINS}
                titleSize="l"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={summary.assetsWithElevatedRisk.toLocaleString()}
                description={STAT_ELEVATED_RISK}
                titleSize="l"
                titleColor={summary.assetsWithElevatedRisk > 0 ? 'danger' : 'default'}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={summary.averageAdminCount.toFixed(1)}
                description={STAT_AVG_ADMINS}
                titleSize="l"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={summary.uniqueAdminUsers.toLocaleString()}
                description={STAT_UNIQUE_USERS}
                titleSize="l"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>

      {/* Section B: Risk Distribution */}
      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="s">
            <h3>{TITLE_RISK_DISTRIBUTION}</h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>Assets categorized by admin account count. Low (0-2), Medium (3-4), High (5+).</p>
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiPanel hasBorder color="success" paddingSize="m">
                <EuiFlexGroup direction="column" alignItems="center" gutterSize="xs">
                  <EuiFlexItem>
                    <EuiHealth color="success">
                      <strong style={{ fontSize: '28px', color: '#017D73' }}>
                        {summary.riskDistribution.low}
                      </strong>
                    </EuiHealth>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" textAlign="center">
                      <strong>Low Risk</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued" textAlign="center">
                      0-2 admin accounts
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder color="warning" paddingSize="m">
                <EuiFlexGroup direction="column" alignItems="center" gutterSize="xs">
                  <EuiFlexItem>
                    <EuiHealth color="warning">
                      <strong style={{ fontSize: '28px', color: '#F5A700' }}>
                        {summary.riskDistribution.medium}
                      </strong>
                    </EuiHealth>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" textAlign="center">
                      <strong>Medium Risk</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued" textAlign="center">
                      3-4 admin accounts
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel hasBorder color="danger" paddingSize="m">
                <EuiFlexGroup direction="column" alignItems="center" gutterSize="xs">
                  <EuiFlexItem>
                    <EuiHealth color="danger">
                      <strong style={{ fontSize: '28px', color: '#BD271E' }}>
                        {summary.riskDistribution.high}
                      </strong>
                    </EuiHealth>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" textAlign="center">
                      <strong>High Risk</strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued" textAlign="center">
                      5+ admin accounts
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>

      {/* Section C: Endpoint Privileges Table */}
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <EuiTitle size="s">
            <h3>{TITLE_ENDPOINT_PRIVILEGES}</h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>Per-endpoint breakdown of local admin accounts. Click admin count for details.</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiBasicTable
            items={displayedAssets}
            columns={assetColumns}
            pagination={{
              pageIndex,
              pageSize,
              totalItemCount: summary.assets.length,
              pageSizeOptions: [10, 25, 50],
            }}
            sorting={{
              sort: {
                field: sortField,
                direction: sortDirection,
              },
            }}
            onChange={onTableChange}
            tableLayout="auto"
          />
        </EuiPanel>
      </EuiFlexItem>

      {/* Section D: Top Admin Users */}
      {summary.topAdminUsers.length > 0 && (
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>{TITLE_TOP_ADMIN_USERS}</h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>
                Most common admin usernames across your endpoint fleet. Suspicious accounts are
                flagged.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={summary.topAdminUsers.slice(0, 10)}
              columns={topAdminColumns}
              tableLayout="auto"
            />
          </EuiPanel>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

PrivilegesContent.displayName = 'PrivilegesContent';
