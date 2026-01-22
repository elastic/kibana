/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiProgress,
  EuiHealth,
  EuiDescriptionList,
  EuiBadge,
  EuiCallOut,
} from '@elastic/eui';

interface PostureData {
  score?: number;
  level?: string;
  firewall_enabled?: boolean;
  secure_boot?: boolean;
  disk_encryption?: string;
  checks?: {
    total?: number;
    passed?: number;
    failed?: number;
  };
  failed_checks?: string[];
}

interface PostureTabProps {
  hostId: string;
  postureData?: PostureData;
}

const POSTURE_SCORE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.scoreLabel',
  {
    defaultMessage: 'Posture Score',
  }
);

const POSTURE_LEVEL_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.levelLabel',
  {
    defaultMessage: 'Security Level',
  }
);

const SECURITY_CONTROLS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.securityControlsTitle',
  {
    defaultMessage: 'Security Controls',
  }
);

const FIREWALL_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.firewallLabel',
  {
    defaultMessage: 'Firewall',
  }
);

const SECURE_BOOT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.secureBootLabel',
  {
    defaultMessage: 'Secure Boot',
  }
);

const DISK_ENCRYPTION_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.diskEncryptionLabel',
  {
    defaultMessage: 'Disk Encryption',
  }
);

const CHECKS_SUMMARY_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.checksSummaryTitle',
  {
    defaultMessage: 'Security Checks Summary',
  }
);

const TOTAL_CHECKS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.totalChecksLabel',
  {
    defaultMessage: 'Total Checks',
  }
);

const PASSED_CHECKS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.passedChecksLabel',
  {
    defaultMessage: 'Passed',
  }
);

const FAILED_CHECKS_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.failedChecksLabel',
  {
    defaultMessage: 'Failed',
  }
);

const FAILED_CHECKS_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.failedChecksTitle',
  {
    defaultMessage: 'Failed Checks',
  }
);

const NO_POSTURE_DATA = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.noData',
  {
    defaultMessage: 'No posture data available for this host.',
  }
);

const ENABLED_STATUS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.enabledStatus',
  {
    defaultMessage: 'Enabled',
  }
);

const DISABLED_STATUS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.disabledStatus',
  {
    defaultMessage: 'Disabled',
  }
);

const UNKNOWN_STATUS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.hostDetails.posture.unknownStatus',
  {
    defaultMessage: 'Unknown',
  }
);

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

// Helper to safely convert to boolean (ES may return string "true"/"false")
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

export const PostureTab: React.FC<PostureTabProps> = React.memo(({ hostId, postureData }) => {
  // Normalize all values since ES returns strings
  const normalizedScore = useMemo(() => toNumber(postureData?.score), [postureData?.score]);
  const firewallEnabled = useMemo(() => toBoolean(postureData?.firewall_enabled), [postureData?.firewall_enabled]);
  const secureBootEnabled = useMemo(() => toBoolean(postureData?.secure_boot), [postureData?.secure_boot]);
  const totalChecks = useMemo(() => toNumber(postureData?.checks?.total), [postureData?.checks?.total]);
  const passedChecks = useMemo(() => toNumber(postureData?.checks?.passed), [postureData?.checks?.passed]);
  const failedChecks = useMemo(() => toNumber(postureData?.checks?.failed), [postureData?.checks?.failed]);

  const postureScoreColor = useMemo(() => {
    if (normalizedScore === undefined) return 'subdued';
    if (normalizedScore >= 80) return 'success';
    if (normalizedScore >= 60) return 'warning';
    return 'danger';
  }, [normalizedScore]);

  const securityControlsItems = useMemo(() => {
    if (!postureData) return [];
    return [
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
        description: postureData.disk_encryption || UNKNOWN_STATUS,
      },
    ];
  }, [postureData, firewallEnabled, secureBootEnabled]);

  const checksItems = useMemo(() => {
    if (totalChecks === undefined) return [];
    return [
      {
        title: TOTAL_CHECKS_LABEL,
        description: String(totalChecks ?? 0),
      },
      {
        title: PASSED_CHECKS_LABEL,
        description: (
          <EuiBadge color="success">{String(passedChecks ?? 0)}</EuiBadge>
        ),
      },
      {
        title: FAILED_CHECKS_LABEL,
        description: (
          <EuiBadge color="danger">{String(failedChecks ?? 0)}</EuiBadge>
        ),
      },
    ];
  }, [totalChecks, passedChecks, failedChecks]);

  if (!postureData) {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiCallOut title={NO_POSTURE_DATA} color="warning" iconType="iInCircle" />
      </>
    );
  }

  return (
    <>
      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem grow={1} style={{ minWidth: '300px' }}>
          <EuiPanel>
            <EuiTitle size="xs">
              <h3>{POSTURE_SCORE_LABEL}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            {normalizedScore !== undefined ? (
              <>
                <EuiProgress
                  value={normalizedScore}
                  max={100}
                  color={postureScoreColor}
                  size="l"
                  label={`${normalizedScore.toFixed(1)}%`}
                  valueText={true}
                />
                {postureData.level && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText size="s">
                      <strong>{POSTURE_LEVEL_LABEL}:</strong> {postureData.level}
                    </EuiText>
                  </>
                )}
              </>
            ) : (
              <EuiText size="s" color="subdued">
                {UNKNOWN_STATUS}
              </EuiText>
            )}
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={1} style={{ minWidth: '300px' }}>
          <EuiPanel>
            <EuiTitle size="xs">
              <h3>{SECURITY_CONTROLS_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiDescriptionList
              type="column"
              listItems={securityControlsItems}
              compressed
              columnWidths={[1, 1]}
            />
          </EuiPanel>
        </EuiFlexItem>

        {totalChecks !== undefined && (
          <EuiFlexItem grow={1} style={{ minWidth: '300px' }}>
            <EuiPanel>
              <EuiTitle size="xs">
                <h3>{CHECKS_SUMMARY_TITLE}</h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiDescriptionList
                type="column"
                listItems={checksItems}
                compressed
                columnWidths={[1, 1]}
              />
            </EuiPanel>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {postureData.failed_checks && postureData.failed_checks.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiPanel>
            <EuiTitle size="xs">
              <h3>{FAILED_CHECKS_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            {postureData.failed_checks.map((check, index) => (
              <React.Fragment key={index}>
                <EuiText size="s">
                  <EuiHealth color="danger">{check}</EuiHealth>
                </EuiText>
                {index < postureData.failed_checks!.length - 1 && <EuiSpacer size="s" />}
              </React.Fragment>
            ))}
          </EuiPanel>
        </>
      )}
    </>
  );
});

PostureTab.displayName = 'PostureTab';
