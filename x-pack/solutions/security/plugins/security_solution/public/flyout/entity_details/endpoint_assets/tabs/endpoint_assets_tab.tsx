/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiTabs,
  EuiTab,
  EuiText,
  EuiBadge,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiHealth,
  EuiTitle,
  EuiDescriptionList,
  EuiProgress,
} from '@elastic/eui';
import { FlyoutBody } from '../../../shared/components/flyout_body';
import { PostureTab } from '../../../../entity_analytics/pages/host_details/tabs/posture_tab';
import { PrivilegesTab } from '../../../../entity_analytics/pages/host_details/tabs/privileges_tab';
import { DriftOverview } from '../../../../endpoint_assets/components/drift_overview';
import type { HostDetailsData } from '../types';
import { useEndpointAssetData, getPostureLevelColor } from '../hooks/use_endpoint_asset_data';

const TAB_OVERVIEW = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.tabs.overview',
  { defaultMessage: 'Overview' }
);

const TAB_POSTURE = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.tabs.posture',
  { defaultMessage: 'Posture' }
);

const TAB_DRIFT = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.tabs.drift',
  { defaultMessage: 'Drift' }
);

const TAB_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.tabs.privileges',
  { defaultMessage: 'Privileges' }
);

const NO_DATA_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.noDataTitle',
  { defaultMessage: 'No endpoint asset data available' }
);

const NO_DATA_BODY = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.noDataBody',
  {
    defaultMessage:
      'Endpoint asset data for this host is not available. Ensure the Entity Store is configured with CAASM data sources.',
  }
);

const POSTURE_SCORE_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.postureScore',
  { defaultMessage: 'Posture Score' }
);

const SECURITY_CONTROLS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.securityControls',
  { defaultMessage: 'Security Controls' }
);

const FIREWALL_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.firewall',
  { defaultMessage: 'Firewall' }
);

const SECURE_BOOT_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.secureBoot',
  { defaultMessage: 'Secure Boot' }
);

const DISK_ENCRYPTION_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.diskEncryption',
  { defaultMessage: 'Disk Encryption' }
);

const DRIFT_EVENTS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.driftEvents',
  { defaultMessage: 'Drift Events (24h)' }
);

const LOCAL_ADMINS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.localAdmins',
  { defaultMessage: 'Local Admins' }
);

const ELEVATED_RISK_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.elevatedRisk',
  { defaultMessage: 'Elevated Risk' }
);

const ENABLED_STATUS = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.enabled',
  { defaultMessage: 'Enabled' }
);

const DISABLED_STATUS = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.disabled',
  { defaultMessage: 'Disabled' }
);

const UNKNOWN_STATUS = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.leftPanel.unknown',
  { defaultMessage: 'Unknown' }
);

type EndpointAssetsSubTab = 'overview' | 'posture' | 'drift' | 'privileges';

interface SubTab {
  id: EndpointAssetsSubTab;
  label: string;
}

const SUB_TABS: SubTab[] = [
  { id: 'overview', label: TAB_OVERVIEW },
  { id: 'posture', label: TAB_POSTURE },
  { id: 'drift', label: TAB_DRIFT },
  { id: 'privileges', label: TAB_PRIVILEGES },
];

// Helper to safely convert to number
const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return toNumber(value[0]);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

// Helper to safely convert to boolean
const toBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return toBoolean(value[0]);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return undefined;
};

/**
 * Overview section showing comprehensive CAASM data
 */
const OverviewSection: React.FC<{ hostData: HostDetailsData }> = React.memo(({ hostData }) => {
  const postureScore = toNumber(hostData.endpoint?.posture?.score);
  const postureLevel = hostData.endpoint?.posture?.level;
  const driftTotal = toNumber(hostData.endpoint?.drift?.events_24h?.total) ?? 0;
  const adminCount = toNumber(hostData.endpoint?.privileges?.admin_count) ?? 0;
  const elevatedRisk = toBoolean(hostData.endpoint?.privileges?.elevated_risk);
  const firewallEnabled = toBoolean(hostData.endpoint?.posture?.firewall_enabled);
  const secureBootEnabled = toBoolean(hostData.endpoint?.posture?.secure_boot);
  const diskEncryption = hostData.endpoint?.posture?.disk_encryption;

  const postureScoreColor = useMemo(() => {
    if (postureScore === undefined) return 'subdued';
    if (postureScore >= 80) return 'success';
    if (postureScore >= 60) return 'warning';
    return 'danger';
  }, [postureScore]);

  const securityControlsItems = useMemo(() => [
    {
      title: FIREWALL_LABEL,
      description:
        firewallEnabled === true ? (
          <EuiHealth color="success">{ENABLED_STATUS}</EuiHealth>
        ) : firewallEnabled === false ? (
          <EuiHealth color="danger">{DISABLED_STATUS}</EuiHealth>
        ) : (
          <EuiHealth color="subdued">{UNKNOWN_STATUS}</EuiHealth>
        ),
    },
    {
      title: SECURE_BOOT_LABEL,
      description:
        secureBootEnabled === true ? (
          <EuiHealth color="success">{ENABLED_STATUS}</EuiHealth>
        ) : secureBootEnabled === false ? (
          <EuiHealth color="danger">{DISABLED_STATUS}</EuiHealth>
        ) : (
          <EuiHealth color="subdued">{UNKNOWN_STATUS}</EuiHealth>
        ),
    },
    {
      title: DISK_ENCRYPTION_LABEL,
      description: diskEncryption || UNKNOWN_STATUS,
    },
  ], [firewallEnabled, secureBootEnabled, diskEncryption]);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {/* Posture Score */}
      <EuiFlexItem>
        <EuiPanel paddingSize="l" hasBorder>
          <EuiTitle size="s">
            <h3>{POSTURE_SCORE_LABEL}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          {postureScore !== undefined ? (
            <>
              <EuiProgress
                value={postureScore}
                max={100}
                color={postureScoreColor}
                size="l"
                label={`${postureScore.toFixed(1)}%`}
                valueText={true}
              />
              {postureLevel && (
                <>
                  <EuiSpacer size="m" />
                  <EuiBadge color={getPostureLevelColor(postureLevel)}>{postureLevel}</EuiBadge>
                </>
              )}
            </>
          ) : (
            <EuiText size="s" color="subdued">{UNKNOWN_STATUS}</EuiText>
          )}
        </EuiPanel>
      </EuiFlexItem>

      {/* Security Controls */}
      <EuiFlexItem>
        <EuiPanel paddingSize="l" hasBorder>
          <EuiTitle size="s">
            <h3>{SECURITY_CONTROLS_TITLE}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiDescriptionList
            type="column"
            listItems={securityControlsItems}
            columnWidths={[1, 1]}
          />
        </EuiPanel>
      </EuiFlexItem>

      {/* Drift and Privileges */}
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiPanel paddingSize="l" hasBorder>
              <EuiStat
                title={driftTotal}
                description={DRIFT_EVENTS_LABEL}
                titleSize="l"
                titleColor={driftTotal > 10 ? 'danger' : driftTotal > 0 ? 'warning' : 'success'}
              />
              {hostData.endpoint?.drift?.events_24h?.by_severity && (
                <>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup gutterSize="xs" wrap>
                    {hostData.endpoint.drift.events_24h.by_severity.critical ? (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="danger">
                          {hostData.endpoint.drift.events_24h.by_severity.critical} Critical
                        </EuiBadge>
                      </EuiFlexItem>
                    ) : null}
                    {hostData.endpoint.drift.events_24h.by_severity.high ? (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="warning">
                          {hostData.endpoint.drift.events_24h.by_severity.high} High
                        </EuiBadge>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </>
              )}
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel paddingSize="l" hasBorder>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiStat
                    title={adminCount}
                    description={LOCAL_ADMINS_LABEL}
                    titleSize="l"
                    titleColor={adminCount > 3 ? 'warning' : 'default'}
                  />
                </EuiFlexItem>
                {elevatedRisk && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="danger">{ELEVATED_RISK_LABEL}</EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              {hostData.endpoint?.privileges?.local_admins &&
                hostData.endpoint.privileges.local_admins.length > 0 && (
                  <>
                    <EuiSpacer size="m" />
                    <EuiText size="s" color="subdued">
                      {hostData.endpoint.privileges.local_admins.join(', ')}
                    </EuiText>
                  </>
                )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Failed Checks */}
      {hostData.endpoint?.posture?.failed_checks &&
        hostData.endpoint.posture.failed_checks.length > 0 && (
          <EuiFlexItem>
            <EuiPanel paddingSize="l" hasBorder color="danger">
              <EuiTitle size="s">
                <h3>Failed Security Checks</h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              {hostData.endpoint.posture.failed_checks.map((check, index) => (
                <React.Fragment key={index}>
                  <EuiHealth color="danger">{check}</EuiHealth>
                  {index < hostData.endpoint!.posture!.failed_checks!.length - 1 && (
                    <EuiSpacer size="s" />
                  )}
                </React.Fragment>
              ))}
            </EuiPanel>
          </EuiFlexItem>
        )}
    </EuiFlexGroup>
  );
});

OverviewSection.displayName = 'OverviewSection';

export interface EndpointAssetsTabProps {
  hostName: string;
  scopeId: string;
}

/**
 * Endpoint Assets tab content for the left panel
 */
export const EndpointAssetsTab: React.FC<EndpointAssetsTabProps> = React.memo(
  ({ hostName, scopeId }) => {
    const { data: hostData, isLoading, error } = useEndpointAssetData(hostName);
    const [selectedSubTab, setSelectedSubTab] = useState<EndpointAssetsSubTab>('overview');

    const handleSubTabClick = useCallback((tabId: EndpointAssetsSubTab) => {
      setSelectedSubTab(tabId);
    }, []);

    const hostId = useMemo(
      () => hostData?.entity?.id || hostData?.host?.id || '',
      [hostData]
    );

    const renderTabContent = useCallback(() => {
      if (!hostData) return null;

      switch (selectedSubTab) {
        case 'overview':
          return <OverviewSection hostData={hostData} />;
        case 'posture':
          return <PostureTab hostId={hostId} postureData={hostData.endpoint?.posture} />;
        case 'drift':
          return <DriftOverview hostId={hostId} />;
        case 'privileges':
          return <PrivilegesTab hostId={hostId} privilegesData={hostData.endpoint?.privileges} />;
        default:
          return <OverviewSection hostData={hostData} />;
      }
    }, [selectedSubTab, hostData, hostId]);

    if (isLoading) {
      return (
        <FlyoutBody>
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 300 }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </FlyoutBody>
      );
    }

    if (error || !hostData) {
      return (
        <FlyoutBody>
          <EuiEmptyPrompt
            iconType="alert"
            color="danger"
            title={<h3>{NO_DATA_TITLE}</h3>}
            body={<p>{NO_DATA_BODY}</p>}
          />
        </FlyoutBody>
      );
    }

    return (
      <FlyoutBody>
        <EuiTabs size="s">
          {SUB_TABS.map((tab) => (
            <EuiTab
              key={tab.id}
              onClick={() => handleSubTabClick(tab.id)}
              isSelected={selectedSubTab === tab.id}
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="l" />
        {renderTabContent()}
      </FlyoutBody>
    );
  }
);

EndpointAssetsTab.displayName = 'EndpointAssetsTab';
