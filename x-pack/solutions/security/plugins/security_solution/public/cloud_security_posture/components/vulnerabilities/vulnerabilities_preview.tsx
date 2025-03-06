/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { useGetSeverityStatusColor } from '@kbn/cloud-security-posture/src/hooks/use_get_severity_status_color';
import {
  buildGenericEntityFlyoutPreviewQuery,
  getAbbreviatedNumber,
} from '@kbn/cloud-security-posture-common';
import { getVulnerabilityStats, hasVulnerabilitiesData } from '@kbn/cloud-security-posture';
import {
  ENTITY_FLYOUT_WITH_VULNERABILITY_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import {
  CspInsightLeftPanelSubTab,
  EntityDetailsLeftPanelTab,
} from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import type { CloudPostureEntityIdentifier } from '../entity_insight';

const VulnerabilitiesCount = ({
  vulnerabilitiesTotal,
}: {
  vulnerabilitiesTotal: string | number;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{vulnerabilitiesTotal}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.vulnerabilities.vulnerabilitiesCountDescription"
              defaultMessage="Vulnerabilities"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export const VulnerabilitiesPreview = ({
  value,
  field,
  isPreviewMode,
  isLinkEnabled,
  openDetailsPanel,
}: {
  value: string;
  field: CloudPostureEntityIdentifier;
  isPreviewMode?: boolean;
  isLinkEnabled: boolean;
  openDetailsPanel: (path: EntityDetailsPath) => void;
}) => {
  useEffect(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, ENTITY_FLYOUT_WITH_VULNERABILITY_PREVIEW);
  }, []);

  const { data } = useVulnerabilitiesPreview({
    query: buildGenericEntityFlyoutPreviewQuery(field, value),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0, NONE = 0 } = data?.count || {};

  const totalVulnerabilities = CRITICAL + HIGH + MEDIUM + LOW + NONE;

  const hasVulnerabilitiesFindings = hasVulnerabilitiesData({
    critical: CRITICAL,
    high: HIGH,
    medium: MEDIUM,
    low: LOW,
    none: NONE,
  });

  const { euiTheme } = useEuiTheme();
  const { getSeverityStatusColor } = useGetSeverityStatusColor();

  const goToEntityInsightTab = useCallback(() => {
    openDetailsPanel({
      tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
      subTab: CspInsightLeftPanelSubTab.VULNERABILITIES,
    });
  }, [openDetailsPanel]);

  const link = useMemo(
    () =>
      isLinkEnabled
        ? {
            callback: goToEntityInsightTab,
            tooltip: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.insights.vulnerabilities.vulnerabilitiesTooltip"
                defaultMessage="Show all vulnerabilities findings"
              />
            ),
          }
        : undefined,
    [isLinkEnabled, goToEntityInsightTab]
  );

  const vulnerabilityStats = getVulnerabilityStats(
    {
      critical: CRITICAL,
      high: HIGH,
      medium: MEDIUM,
      low: LOW,
      none: NONE,
    },
    getSeverityStatusColor
  );

  return (
    <ExpandablePanel
      header={{
        iconType: !isPreviewMode && hasVulnerabilitiesFindings ? 'arrowStart' : '',
        title: (
          <EuiTitle
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.vulnerabilities.vulnerabilitiesTitle"
              defaultMessage="Vulnerabilities"
            />
          </EuiTitle>
        ),
        link,
      }}
      data-test-subj={'securitySolutionFlyoutInsightsVulnerabilities'}
    >
      <EuiFlexGroup gutterSize="none">
        <VulnerabilitiesCount vulnerabilitiesTotal={getAbbreviatedNumber(totalVulnerabilities)} />
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem />
            <EuiFlexItem>
              <EuiSpacer />
              <DistributionBar stats={vulnerabilityStats} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
