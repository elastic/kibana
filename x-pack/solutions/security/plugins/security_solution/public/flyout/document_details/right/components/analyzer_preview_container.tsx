/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexItem, EuiLink, EuiMark, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../common/lib/kibana';
import { useDocumentDetailsContext } from '../../shared/context';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { AnalyzerPreview } from './analyzer_preview';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { useNavigateToAnalyzer } from '../../shared/hooks/use_navigate_to_analyzer';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_PREVALENCE } from '../../../../../common/constants';

const COLD_FROZEN_TIER_LABEL = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.visualizations.analyzer.excludeColdAndFrozenTiers.badgeLabel"
    defaultMessage="Cold/Frozen tiers excluded"
  />
);
const COLD_FROZEN_TIER_TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.right.visualizations.analyzer.excludeColdAndFrozenTiers.tooltipLabel"
    defaultMessage="Cold and frozen tiers are currently excluded. To include them, go to Advanced Settings."
  />
);

/**
 * Analyzer preview under Overview, Visualizations. It shows a tree representation of analyzer.
 */
export const AnalyzerPreviewContainer: React.FC = () => {
  const { uiSettings } = useKibana().services;
  const excludeColdAndFrozenTiers = uiSettings.get<boolean>(
    EXCLUDE_COLD_AND_FROZEN_TIERS_IN_PREVALENCE
  );

  const { dataAsNestedObject, isRulePreview, eventId, indexName, scopeId, isPreviewMode } =
    useDocumentDetailsContext();

  // decide whether to show the analyzer preview or not
  const isEnabled = useIsInvestigateInResolverActionEnabled(dataAsNestedObject);

  const { navigateToAnalyzer } = useNavigateToAnalyzer({
    eventId,
    indexName,
    isFlyoutOpen: true,
    scopeId,
    isPreviewMode,
  });

  const iconType = useMemo(() => (!isPreviewMode ? 'arrowStart' : undefined), [isPreviewMode]);

  // if the analyzer is not enabled or in rule preview mode, the navigation is not enabled
  const isNavigationEnabled = useMemo(
    () => !(!isEnabled || isRulePreview),
    [isEnabled, isRulePreview]
  );

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.analyzerPreviewTitle"
            defaultMessage="Analyzer preview"
          />
        ),
        headerContent: (
          <>
            {excludeColdAndFrozenTiers && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={COLD_FROZEN_TIER_TOOLTIP}>
                  <EuiBadge color="hollow" iconSide="left" iconType="snowflake" tabIndex={0}>
                    {COLD_FROZEN_TIER_LABEL}
                  </EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </>
        ),
        iconType,
        ...(isNavigationEnabled && {
          link: {
            callback: navigateToAnalyzer,
            tooltip: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.analyzerPreviewOpenAnalyzerTooltip"
                defaultMessage="Open analyzer graph"
              />
            ),
          },
        }),
      }}
      data-test-subj={ANALYZER_PREVIEW_TEST_ID}
    >
      {isEnabled ? <AnalyzerPreview /> : <AnalyzerPreviewNoDataMessage />}
    </ExpandablePanel>
  );
};

AnalyzerPreviewContainer.displayName = 'AnalyzerPreviewContainer';

/**
 * No data message for the analyzer preview.
 */
export const AnalyzerPreviewNoDataMessage: React.FC = () => {
  return (
    <FormattedMessage
      id="xpack.securitySolution.flyout.visualizations.analyzerPreview.noDataDescription"
      defaultMessage="You can only visualize events triggered by hosts configured with the Elastic Defend integration or any {sysmon} data from {winlogbeat}. Refer to {link} for more information."
      values={{
        sysmon: <EuiMark>{'sysmon'}</EuiMark>,
        winlogbeat: <EuiMark>{'winlogbeat'}</EuiMark>,
        link: (
          <EuiLink
            href="https://www.elastic.co/guide/en/security/current/visual-event-analyzer.html"
            target="_blank"
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.noDataLinkText"
              defaultMessage="Visual event analyzer"
            />
          </EuiLink>
        ),
      }}
    />
  );
};

AnalyzerPreviewNoDataMessage.displayName = 'AnalyzerPreviewNoDataMessage';
