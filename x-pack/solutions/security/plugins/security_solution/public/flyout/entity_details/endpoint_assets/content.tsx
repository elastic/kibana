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
import { FlyoutBody } from '../../shared/components/flyout_body';
import { PostureTab } from '../../../entity_analytics/pages/host_details/tabs/posture_tab';
import { PrivilegesTab } from '../../../entity_analytics/pages/host_details/tabs/privileges_tab';
import { DriftOverview } from '../../../endpoint_assets/components/drift_overview';
import { SoftwareTab } from '../../../entity_analytics/pages/host_details/tabs/software_tab';
import type { HostDetailsData, EndpointAssetsTabId } from './types';
import { getPostureLevelColor } from './hooks/use_endpoint_asset_data';
import { TEST_IDS } from './constants';

const TAB_OVERVIEW = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.tabs.overview',
  { defaultMessage: 'Overview' }
);

const TAB_POSTURE = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.tabs.posture',
  { defaultMessage: 'Posture' }
);

const TAB_DRIFT = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.tabs.drift',
  { defaultMessage: 'Drift' }
);

const TAB_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.tabs.privileges',
  { defaultMessage: 'Privileges' }
);

const TAB_SOFTWARE = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.tabs.software',
  { defaultMessage: 'Software' }
);

const NO_DATA_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.noDataTitle',
  { defaultMessage: 'No endpoint asset data available' }
);

const NO_DATA_BODY = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.noDataBody',
  {
    defaultMessage:
      'Endpoint asset data for this host is not available. Ensure the Entity Store is configured with CAASM data sources.',
  }
);

const POSTURE_SCORE_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.postureScore',
  { defaultMessage: 'Posture Score' }
);

const SECURITY_CONTROLS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.securityControls',
  { defaultMessage: 'Security Controls' }
);

const FIREWALL_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.firewall',
  { defaultMessage: 'Firewall' }
);

const SECURE_BOOT_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.secureBoot',
  { defaultMessage: 'Secure Boot' }
);

const DISK_ENCRYPTION_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.diskEncryption',
  { defaultMessage: 'Disk Encryption' }
);

const DRIFT_EVENTS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.driftEvents',
  { defaultMessage: 'Drift Events (24h)' }
);

const LOCAL_ADMINS_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.localAdmins',
  { defaultMessage: 'Local Admins' }
);

const ELEVATED_RISK_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.elevatedRisk',
  { defaultMessage: 'Elevated Risk' }
);

const ENABLED_STATUS = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.enabled',
  { defaultMessage: 'Enabled' }
);

const DISABLED_STATUS = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.disabled',
  { defaultMessage: 'Disabled' }
);

const UNKNOWN_STATUS = i18n.translate(
  'xpack.securitySolution.flyout.endpointAssets.unknown',
  { defaultMessage: 'Unknown' }
);

interface EndpointAssetsContentProps {
  hostData: HostDetailsData | null;
  hostName: string;
  isLoading: boolean;
  error: Error | null;
  isPreviewMode?: boolean;
}

interface Tab {
  id: EndpointAssetsTabId;
  label: string;
  testId: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: TAB_OVERVIEW, testId: TEST_IDS.TAB_OVERVIEW },
  { id: 'posture', label: TAB_POSTURE, testId: TEST_IDS.TAB_POSTURE },
  { id: 'drift', label: TAB_DRIFT, testId: TEST_IDS.TAB_DRIFT },
  { id: 'privileges', label: TAB_PRIVILEGES, testId: TEST_IDS.TAB_PRIVILEGES },
  { id: 'software', label: TAB_SOFTWARE, testId: TEST_IDS.TAB_SOFTWARE },
];

// Helper to safely convert to number (ES may return string or array)
const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    return toNumber(value[0]);
  }
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
  if (Array.isArray(value)) {
    return toBoolean(value[0]);
  }
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
 * Overview section for the flyout - shows comprehensive CAASM data
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
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj={TEST_IDS.OVERVIEW_SECTION}>
      {/* Posture Score with progress bar */}
      <EuiFlexItem>
        <EuiPanel paddingSize="m" hasBorder data-test-subj={TEST_IDS.POSTURE_SCORE}>
          <EuiTitle size="xs">
            <h4>{POSTURE_SCORE_LABEL}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
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
                  <EuiSpacer size="s" />
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
        <EuiPanel paddingSize="m" hasBorder>
          <EuiTitle size="xs">
            <h4>{SECURITY_CONTROLS_TITLE}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList
            type="column"
            listItems={securityControlsItems}
            compressed
            columnWidths={[1, 1]}
          />
        </EuiPanel>
      </EuiFlexItem>

      {/* Drift and Privileges Summary */}
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiPanel paddingSize="m" hasBorder data-test-subj={TEST_IDS.DRIFT_SUMMARY}>
              <EuiStat
                title={driftTotal}
                description={DRIFT_EVENTS_LABEL}
                titleSize="m"
                titleColor={driftTotal > 10 ? 'danger' : driftTotal > 0 ? 'warning' : 'success'}
              />
              {hostData.endpoint?.drift?.events_24h?.by_severity && (
                <>
                  <EuiSpacer size="s" />
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
                    {hostData.endpoint.drift.events_24h.by_severity.medium ? (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="default">
                          {hostData.endpoint.drift.events_24h.by_severity.medium} Medium
                        </EuiBadge>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </>
              )}
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel paddingSize="m" hasBorder data-test-subj={TEST_IDS.PRIVILEGES_SUMMARY}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiStat
                    title={adminCount}
                    description={LOCAL_ADMINS_LABEL}
                    titleSize="m"
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
                    <EuiSpacer size="s" />
                    <EuiText size="xs" color="subdued">
                      {hostData.endpoint.privileges.local_admins.slice(0, 5).join(', ')}
                      {hostData.endpoint.privileges.local_admins.length > 5 && '...'}
                    </EuiText>
                  </>
                )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Failed Checks - if any */}
      {hostData.endpoint?.posture?.failed_checks &&
        hostData.endpoint.posture.failed_checks.length > 0 && (
          <EuiFlexItem>
            <EuiPanel paddingSize="m" hasBorder color="danger">
              <EuiTitle size="xs">
                <h4>Failed Security Checks</h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              {hostData.endpoint.posture.failed_checks.slice(0, 5).map((check, index) => (
                <React.Fragment key={index}>
                  <EuiHealth color="danger">{check}</EuiHealth>
                  {index < Math.min(hostData.endpoint!.posture!.failed_checks!.length, 5) - 1 && (
                    <EuiSpacer size="xs" />
                  )}
                </React.Fragment>
              ))}
              {hostData.endpoint.posture.failed_checks.length > 5 && (
                <EuiText size="xs" color="subdued">
                  ...and {hostData.endpoint.posture.failed_checks.length - 5} more
                </EuiText>
              )}
            </EuiPanel>
          </EuiFlexItem>
        )}
    </EuiFlexGroup>
  );
});

OverviewSection.displayName = 'OverviewSection';

export const EndpointAssetsContent: React.FC<EndpointAssetsContentProps> = React.memo(
  ({ hostData, hostName, isLoading, error, isPreviewMode }) => {
    const [selectedTab, setSelectedTab] = useState<EndpointAssetsTabId>('overview');

    const handleTabClick = useCallback((tabId: EndpointAssetsTabId) => {
      setSelectedTab(tabId);
    }, []);

    const hostId = useMemo(
      () => hostData?.entity?.id || hostData?.host?.id || '',
      [hostData]
    );

    const renderTabContent = useCallback(() => {
      if (!hostData) return null;

      switch (selectedTab) {
        case 'overview':
          return <OverviewSection hostData={hostData} />;
        case 'posture':
          return <PostureTab hostId={hostId} postureData={hostData.endpoint?.posture} />;
        case 'drift':
          return <DriftOverview hostId={hostId} />;
        case 'privileges':
          return <PrivilegesTab hostId={hostId} privilegesData={hostData.endpoint?.privileges} />;
        case 'software':
          return (
            <SoftwareTab
              hostId={hostId}
              installedCount={toNumber(hostData.endpoint?.software?.installed_count)}
              servicesCount={toNumber(hostData.endpoint?.software?.services_count)}
            />
          );
        default:
          return <OverviewSection hostData={hostData} />;
      }
    }, [selectedTab, hostData, hostId]);

    if (isLoading) {
      return (
        <FlyoutBody>
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            style={{ minHeight: 200 }}
            data-test-subj={TEST_IDS.LOADING}
          >
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
            data-test-subj={TEST_IDS.ERROR}
          />
        </FlyoutBody>
      );
    }

    // Show tabs in both modes - users can navigate even in preview
    return (
      <FlyoutBody data-test-subj={TEST_IDS.CONTENT}>
        <EuiTabs data-test-subj={TEST_IDS.TABS} size={isPreviewMode ? 's' : 'm'}>
          {TABS.map((tab) => (
            <EuiTab
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              isSelected={selectedTab === tab.id}
              data-test-subj={tab.testId}
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="m" />
        {renderTabContent()}
      </FlyoutBody>
    );
  }
);

EndpointAssetsContent.displayName = 'EndpointAssetsContent';
