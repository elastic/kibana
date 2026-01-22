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
  EuiText,
  EuiLoadingSpinner,
  EuiProgress,
} from '@elastic/eui';
import { usePrivilegesSummary } from '../hooks/use_privileges_summary';

export const PrivilegesOverview: React.FC = React.memo(() => {
  const { data, loading, error } = usePrivilegesSummary();

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
        <EuiText color="danger">Error loading privileges summary</EuiText>
      </EuiPanel>
    );
  }

  const {
    total_assets,
    assets_with_elevated_privileges,
    total_local_admins,
    average_admin_count,
  } = data;

  const elevatedPercentage = total_assets > 0
    ? Math.round((assets_with_elevated_privileges / total_assets) * 100)
    : 0;

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Summary Stats */}
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={assets_with_elevated_privileges}
                description="Assets with Elevated Privileges"
                titleSize="l"
                titleColor={assets_with_elevated_privileges > 0 ? 'warning' : 'success'}
              />
              <EuiSpacer size="s" />
              <EuiProgress
                value={assets_with_elevated_privileges}
                max={total_assets}
                color={assets_with_elevated_privileges > total_assets * 0.1 ? 'danger' : 'warning'}
              />
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                {elevatedPercentage}% of total assets
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={total_local_admins}
                description="Total Local Admin Accounts"
                titleSize="l"
                titleColor={total_local_admins > total_assets * 2 ? 'danger' : 'default'}
              />
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                Across all monitored endpoints
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={average_admin_count.toFixed(1)}
                description="Average Admins per Asset"
                titleSize="l"
                titleColor={average_admin_count > 2 ? 'warning' : 'success'}
              />
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                Recommended: 2 or fewer
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={total_assets - assets_with_elevated_privileges}
                description="Compliant Assets"
                titleSize="l"
                titleColor="success"
              />
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                Within privilege policy
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Recommendations Panel */}
      <EuiFlexItem>
        <EuiPanel hasBorder>
          <EuiTitle size="xs">
            <h3>Privilege Risk Assessment</h3>
          </EuiTitle>
          <EuiSpacer size="m" />

          <EuiFlexGroup direction="column" gutterSize="m">
            {assets_with_elevated_privileges > 0 && (
              <EuiFlexItem>
                <EuiPanel color="warning" paddingSize="s">
                  <EuiText size="s">
                    <strong>{assets_with_elevated_privileges} asset(s)</strong> have more than 2 local
                    administrator accounts. Consider reviewing and reducing unnecessary admin privileges.
                  </EuiText>
                </EuiPanel>
              </EuiFlexItem>
            )}

            {average_admin_count > 3 && (
              <EuiFlexItem>
                <EuiPanel color="danger" paddingSize="s">
                  <EuiText size="s">
                    <strong>High average admin count ({average_admin_count.toFixed(1)})</strong> detected
                    across your fleet. This increases attack surface and potential for lateral movement.
                  </EuiText>
                </EuiPanel>
              </EuiFlexItem>
            )}

            {assets_with_elevated_privileges === 0 && average_admin_count <= 2 && (
              <EuiFlexItem>
                <EuiPanel color="success" paddingSize="s">
                  <EuiText size="s">
                    <strong>Great job!</strong> Your privilege hygiene is within recommended bounds.
                    All assets have 2 or fewer local administrators.
                  </EuiText>
                </EuiPanel>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

PrivilegesOverview.displayName = 'PrivilegesOverview';
