/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiFlexItem,
  type EuiFlexGroupProps,
  useEuiTheme,
  useGeneratedHtmlId,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { useGetSeverityStatusColor } from '@kbn/cloud-security-posture/src/hooks/use_get_severity_status_color';
import { buildGenericEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { getVulnerabilityStats, hasVulnerabilitiesData } from '@kbn/cloud-security-posture';
import {
  uiMetricService,
  type CloudSecurityUiCounters,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { InsightDistributionBar } from './insight_distribution_bar';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { PreviewLink } from '../../../shared/components/preview_link';
import { useDocumentDetailsContext } from '../context';
import {
  EntityDetailsLeftPanelTab,
  CspInsightLeftPanelSubTab,
} from '../../../entity_details/shared/components/left_panel/left_panel_header';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { EntityDetailsPath } from '../../../entity_details/shared/components/left_panel/left_panel_header';

interface VulnerabilitiesInsightProps {
  /**
   *  Host name to retrieve vulnerabilities for
   */
  hostName: string;
  /**
   * The direction of the flex group
   */
  direction?: EuiFlexGroupProps['direction'];
  /**
   * The data-test-subj to use for the component
   */
  ['data-test-subj']?: string;
  /**
   * used to track the instance of this component, prefer kebab-case
   */
  telemetryKey?: CloudSecurityUiCounters;
  /**
   * The function to open the details panel.
   */
  openDetailsPanel: (path: EntityDetailsPath) => void;
}

/*
 * Displays a distribution bar and the total vulnerabilities count for a given host
 */
export const VulnerabilitiesInsight: React.FC<VulnerabilitiesInsightProps> = ({
  hostName,
  direction,
  'data-test-subj': dataTestSubj,
  telemetryKey,
  openDetailsPanel,
}) => {
  const renderingId = useGeneratedHtmlId();
  const { scopeId, isPreview } = useDocumentDetailsContext();
  const { euiTheme } = useEuiTheme();
  const { getSeverityStatusColor } = useGetSeverityStatusColor();
  const { data } = useVulnerabilitiesPreview({
    query: buildGenericEntityFlyoutPreviewQuery('host.name', hostName),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const isNewNavigationEnabled = useIsExperimentalFeatureEnabled(
    'newExpandableFlyoutNavigationEnabled'
  );

  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0, NONE = 0 } = data?.count || {};
  const totalVulnerabilities = useMemo(
    () => CRITICAL + HIGH + MEDIUM + LOW + NONE,
    [CRITICAL, HIGH, MEDIUM, LOW, NONE]
  );

  // this component only renders if there are findings
  const shouldRender = useMemo(
    () =>
      hasVulnerabilitiesData({
        critical: CRITICAL,
        high: HIGH,
        medium: MEDIUM,
        low: LOW,
        none: NONE,
      }),
    [CRITICAL, HIGH, MEDIUM, LOW, NONE]
  );

  useEffect(() => {
    if (shouldRender && telemetryKey) {
      uiMetricService.trackUiMetric(METRIC_TYPE.COUNT, telemetryKey);
    }
  }, [shouldRender, telemetryKey, renderingId]);

  const vulnerabilitiesStats = useMemo(
    () =>
      getVulnerabilityStats(
        {
          critical: CRITICAL,
          high: HIGH,
          medium: MEDIUM,
          low: LOW,
          none: NONE,
        },
        getSeverityStatusColor
      ),
    [CRITICAL, HIGH, MEDIUM, LOW, NONE, getSeverityStatusColor]
  );

  const count = useMemo(
    () => (
      <div
        css={css`
          margin-top: ${euiTheme.size.xs};
          margin-bottom: ${euiTheme.size.xs};
        `}
      >
        {isNewNavigationEnabled ? (
          <EuiToolTip
            content={
              <FormattedMessage
                id="xpack.securitySolution.flyout.insights.vulnerabilities.vulnerabilitiesCountTooltip"
                defaultMessage="Opens list of vulnerabilities in a new flyout"
              />
            }
          >
            <EuiLink
              data-test-subj={`${dataTestSubj}-count`}
              onClick={() =>
                openDetailsPanel({
                  tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
                  subTab: CspInsightLeftPanelSubTab.VULNERABILITIES,
                })
              }
            >
              <FormattedCount count={totalVulnerabilities} />
            </EuiLink>
          </EuiToolTip>
        ) : (
          <PreviewLink
            field={'host.name'}
            value={hostName}
            scopeId={scopeId}
            isPreview={isPreview}
            data-test-subj={`${dataTestSubj}-count`}
          >
            <FormattedCount count={totalVulnerabilities} />
          </PreviewLink>
        )}
      </div>
    ),
    [
      totalVulnerabilities,
      hostName,
      scopeId,
      isPreview,
      dataTestSubj,
      euiTheme.size,
      isNewNavigationEnabled,
      openDetailsPanel,
    ]
  );

  if (!shouldRender) return null;

  return (
    <EuiFlexItem data-test-subj={dataTestSubj}>
      <InsightDistributionBar
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.insights.vulnerabilitiesTitle"
            defaultMessage="Vulnerabilities:"
          />
        }
        stats={vulnerabilitiesStats}
        count={count}
        direction={direction}
        data-test-subj={`${dataTestSubj}-distribution-bar`}
      />
    </EuiFlexItem>
  );
};

VulnerabilitiesInsight.displayName = 'VulnerabilitiesInsight';
