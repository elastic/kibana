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
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { buildGenericEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import {
  uiMetricService,
  type CloudSecurityUiCounters,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { InsightDistributionBar } from './insight_distribution_bar';
import { getFindingsStats } from '../../../../cloud_security_posture/components/misconfiguration/misconfiguration_preview';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { PreviewLink } from '../../../shared/components/preview_link';
import { useDocumentDetailsContext } from '../context';
import type { EntityDetailsPath } from '../../../entity_details/shared/components/left_panel/left_panel_header';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import {
  CspInsightLeftPanelSubTab,
  EntityDetailsLeftPanelTab,
} from '../../../entity_details/shared/components/left_panel/left_panel_header';

interface MisconfigurationsInsightProps {
  /**
   *  Entity name to retrieve misconfigurations for
   */
  name: string;
  /**
   * Indicator whether the entity is host or user
   */
  fieldName: 'host.name' | 'user.name';
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
 * Displays a distribution bar with the count of total misconfigurations for a given entity
 */
export const MisconfigurationsInsight: React.FC<MisconfigurationsInsightProps> = ({
  name,
  fieldName,
  direction,
  'data-test-subj': dataTestSubj,
  telemetryKey,
  openDetailsPanel,
}) => {
  const renderingId = useGeneratedHtmlId();
  const { scopeId, isPreview } = useDocumentDetailsContext();
  const { euiTheme } = useEuiTheme();
  const { data } = useMisconfigurationPreview({
    query: buildGenericEntityFlyoutPreviewQuery(fieldName, name),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const isNewNavigationEnabled = useIsExperimentalFeatureEnabled(
    'newExpandableFlyoutNavigationEnabled'
  );

  const passedFindings = data?.count.passed || 0;
  const failedFindings = data?.count.failed || 0;
  const totalFindings = useMemo(
    () => passedFindings + failedFindings,
    [passedFindings, failedFindings]
  );
  const shouldRender = totalFindings > 0; // this component only renders if there are findings

  useEffect(() => {
    if (shouldRender && telemetryKey) {
      uiMetricService.trackUiMetric(METRIC_TYPE.COUNT, telemetryKey);
    }
  }, [shouldRender, telemetryKey, renderingId]);

  const misconfigurationsStats = useMemo(
    () => getFindingsStats(passedFindings, failedFindings),
    [passedFindings, failedFindings]
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
                id="xpack.securitySolution.flyout.insights.misconfiguration.misconfigurationCountTooltip"
                defaultMessage="Opens list of misconfigurations in a new flyout"
              />
            }
          >
            <EuiLink
              data-test-subj={`${dataTestSubj}-count`}
              onClick={() =>
                openDetailsPanel({
                  tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
                  subTab: CspInsightLeftPanelSubTab.MISCONFIGURATIONS,
                })
              }
            >
              <FormattedCount count={totalFindings} />
            </EuiLink>
          </EuiToolTip>
        ) : (
          <PreviewLink
            field={fieldName}
            value={name}
            scopeId={scopeId}
            isPreview={isPreview}
            data-test-subj={`${dataTestSubj}-count`}
          >
            <FormattedCount count={totalFindings} />
          </PreviewLink>
        )}
      </div>
    ),
    [
      totalFindings,
      fieldName,
      name,
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
            id="xpack.securitySolution.insights.misconfigurationsTitle"
            defaultMessage="Misconfigurations:"
          />
        }
        stats={misconfigurationsStats}
        count={count}
        direction={direction}
        data-test-subj={`${dataTestSubj}-distribution-bar`}
      />
    </EuiFlexItem>
  );
};

MisconfigurationsInsight.displayName = 'MisconfigurationsInsight';
