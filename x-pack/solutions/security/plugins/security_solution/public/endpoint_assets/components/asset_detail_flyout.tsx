/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiHealth,
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiBadge,
  EuiText,
} from '@elastic/eui';
import type { EndpointAsset } from '../../../common/endpoint_assets';
import { TEST_SUBJECTS } from '../../../common/endpoint_assets';
import * as i18n from '../pages/translations';

export interface AssetDetailFlyoutProps {
  asset: EndpointAsset;
  onClose: () => void;
}

const getPostureColor = (status: string): 'success' | 'danger' | 'warning' => {
  if (status === 'OK' || status === true) return 'success';
  if (status === 'FAIL' || status === false) return 'danger';
  return 'warning';
};

export const AssetDetailFlyout: React.FC<AssetDetailFlyoutProps> = React.memo(
  ({ asset, onClose }) => {
    const identityItems = [
      { title: 'Name', description: asset.asset.name || '-' },
      { title: 'ID', description: asset.asset.id },
      { title: 'Platform', description: asset.asset.platform },
      { title: 'Type', description: asset.asset.type },
    ];

    const lifecycleItems = [
      {
        title: 'First Seen',
        description: asset.lifecycle.first_seen
          ? new Date(asset.lifecycle.first_seen).toLocaleString()
          : '-',
      },
      {
        title: 'Last Seen',
        description: asset.lifecycle.last_seen
          ? new Date(asset.lifecycle.last_seen).toLocaleString()
          : '-',
      },
    ];

    const hardwareItems = [
      { title: 'CPU', description: asset.facts.hardware?.cpu || '-' },
      { title: 'Cores', description: String(asset.facts.hardware?.cpu_cores || '-') },
      { title: 'Memory (GB)', description: String(asset.facts.hardware?.memory_gb || '-') },
      { title: 'Vendor', description: asset.facts.hardware?.vendor || '-' },
      { title: 'Model', description: asset.facts.hardware?.model || '-' },
    ];

    const osItems = [
      { title: 'OS Name', description: asset.facts.os?.name || '-' },
      { title: 'Version', description: asset.facts.os?.version || '-' },
      { title: 'Architecture', description: asset.facts.os?.arch || '-' },
    ];

    return (
      <EuiFlyout onClose={onClose} size="m" data-test-subj={TEST_SUBJECTS.ASSET_DETAIL_FLYOUT}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{asset.asset.name || asset.asset.id}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiBadge>{asset.asset.platform}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={asset.risk.level === 'LOW' ? 'success' : 'danger'}>
                Risk: {asset.risk.level}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge>Score: {asset.posture.score}/100</EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {/* Identity Section */}
          <EuiPanel hasBorder>
            <EuiTitle size="xs">
              <h3>Identity</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              columnWidths={[1, 2]}
              listItems={identityItems}
              compressed
            />
          </EuiPanel>

          <EuiSpacer size="m" />

          {/* Lifecycle Section */}
          <EuiPanel hasBorder>
            <EuiTitle size="xs">
              <h3>Lifecycle</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              columnWidths={[1, 2]}
              listItems={lifecycleItems}
              compressed
            />
          </EuiPanel>

          <EuiSpacer size="m" />

          {/* Hardware Section */}
          <EuiPanel hasBorder>
            <EuiTitle size="xs">
              <h3>Hardware</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              columnWidths={[1, 2]}
              listItems={hardwareItems}
              compressed
            />
          </EuiPanel>

          <EuiSpacer size="m" />

          {/* OS Section */}
          <EuiPanel hasBorder>
            <EuiTitle size="xs">
              <h3>Operating System</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              columnWidths={[1, 2]}
              listItems={osItems}
              compressed
            />
          </EuiPanel>

          <EuiSpacer size="m" />

          {/* Security Posture Section */}
          <EuiPanel hasBorder>
            <EuiTitle size="xs">
              <h3>Security Posture</h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              Score: {asset.posture.score}/100
            </EuiText>
            <EuiSpacer size="s" />

            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiHealth color={getPostureColor(asset.posture.disk_encryption)}>
                  {i18n.DISK_ENCRYPTION}: {asset.posture.disk_encryption}
                </EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiHealth color={getPostureColor(asset.posture.firewall_enabled)}>
                  {i18n.FIREWALL}: {asset.posture.firewall_enabled ? 'Enabled' : 'Disabled'}
                </EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiHealth color={getPostureColor(asset.posture.secure_boot)}>
                  {i18n.SECURE_BOOT}: {asset.posture.secure_boot ? 'Enabled' : 'Disabled'}
                </EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiHealth color={asset.agent?.status === 'running' ? 'success' : 'danger'}>
                  {i18n.ELASTIC_AGENT}: {asset.agent?.status || 'Unknown'}
                </EuiHealth>
              </EuiFlexItem>
            </EuiFlexGroup>

            {asset.posture.failed_checks.length > 0 && (
              <>
                <EuiHorizontalRule margin="s" />
                <EuiText size="xs" color="danger">
                  <strong>Failed Checks:</strong>
                  <ul>
                    {asset.posture.failed_checks.map((check, idx) => (
                      <li key={idx}>{check}</li>
                    ))}
                  </ul>
                </EuiText>
              </>
            )}
          </EuiPanel>

          <EuiSpacer size="m" />

          {/* Privileges Section */}
          <EuiPanel hasBorder>
            <EuiTitle size="xs">
              <h3>Privileged Users</h3>
            </EuiTitle>
            <EuiText size="s" color={asset.privileges.elevated_risk ? 'danger' : 'default'}>
              {asset.privileges.admin_count} local admin(s)
              {asset.privileges.elevated_risk && ' - Elevated Risk'}
            </EuiText>
            <EuiSpacer size="s" />

            {asset.privileges.local_admins.length > 0 && (
              <EuiFlexGroup wrap gutterSize="xs">
                {asset.privileges.local_admins.map((admin, idx) => (
                  <EuiFlexItem key={idx} grow={false}>
                    <EuiBadge color="hollow">{admin}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}
          </EuiPanel>

          {/* Risk Section */}
          {asset.risk.reasons.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiPanel hasBorder color="danger">
                <EuiTitle size="xs">
                  <h3>Risk Reasons</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <ul>
                  {asset.risk.reasons.map((reason, idx) => (
                    <li key={idx}>
                      <EuiText size="s">{reason}</EuiText>
                    </li>
                  ))}
                </ul>
              </EuiPanel>
            </>
          )}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose}>Close</EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton iconType="timeline">View in Timeline</EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton iconType="console">Run Osquery</EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

AssetDetailFlyout.displayName = 'AssetDetailFlyout';
