/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { i18n } from '@kbn/i18n';
import { statusColors } from '@kbn/cloud-security-posture';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  ENTITY_FLYOUT_WITH_MISCONFIGURATION_VISIT,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import { CspInsightLeftPanelSubTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { useNavigateEntityInsight } from '../../hooks/use_entity_insight';

export const getFindingsStats = (passedFindingsStats: number, failedFindingsStats: number) => {
  if (passedFindingsStats === 0 && failedFindingsStats === 0) return [];
  return [
    {
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.misconfigurations.passedFindingsText',
        {
          defaultMessage: 'Passed findings',
        }
      ),
      count: passedFindingsStats,
      color: statusColors.passed,
    },
    {
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.misconfigurations.failedFindingsText',
        {
          defaultMessage: 'Failed findings',
        }
      ),
      count: failedFindingsStats,
      color: statusColors.failed,
    },
  ];
};

const MisconfigurationPreviewScore = ({
  passedFindings,
  failedFindings,
  euiTheme,
}: {
  passedFindings: number;
  failedFindings: number;
  euiTheme: EuiThemeComputed<{}>;
}) => {
  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{`${Math.round((passedFindings / (passedFindings + failedFindings)) * 100)}%`}</h3>
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
              id="xpack.securitySolution.flyout.right.insights.misconfigurations.postureScoreDescription"
              defaultMessage="Posture score"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export const MisconfigurationsPreview = ({
  value,
  field,
  isPreviewMode,
}: {
  value: string;
  field: 'host.name' | 'user.name';
  isPreviewMode?: boolean;
}) => {
  const { hasMisconfigurationFindings, passedFindings, failedFindings } = useHasMisconfigurations(
    field,
    value
  );

  useEffect(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, ENTITY_FLYOUT_WITH_MISCONFIGURATION_VISIT);
  }, []);
  const { euiTheme } = useEuiTheme();

  const { goToEntityInsightTab } = useNavigateEntityInsight({
    field,
    value,
    queryIdExtension: 'MISCONFIGURATION_PREVIEW',
    subTab: CspInsightLeftPanelSubTab.MISCONFIGURATIONS,
  });
  const link = useMemo(
    () =>
      !isPreviewMode
        ? {
            callback: goToEntityInsightTab,
            tooltip: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.insights.misconfiguration.misconfigurationTooltip"
                defaultMessage="Show all misconfiguration findings"
              />
            ),
          }
        : undefined,
    [isPreviewMode, goToEntityInsightTab]
  );
  return (
    <ExpandablePanel
      header={{
        iconType: !isPreviewMode && hasMisconfigurationFindings ? 'arrowStart' : '',
        title: (
          <EuiTitle
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
            data-test-subj={'securitySolutionFlyoutInsightsMisconfigurationsTitleText'}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.misconfigurations.misconfigurationsTitle"
              defaultMessage="Misconfigurations"
            />
          </EuiTitle>
        ),
        link: hasMisconfigurationFindings ? link : undefined,
      }}
      data-test-subj={'securitySolutionFlyoutInsightsMisconfigurations'}
    >
      <EuiFlexGroup gutterSize="none">
        <MisconfigurationPreviewScore
          passedFindings={passedFindings}
          failedFindings={failedFindings}
          euiTheme={euiTheme}
        />

        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem />
            <EuiFlexItem>
              <EuiSpacer />
              <DistributionBar stats={getFindingsStats(passedFindings, failedFindings)} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};
