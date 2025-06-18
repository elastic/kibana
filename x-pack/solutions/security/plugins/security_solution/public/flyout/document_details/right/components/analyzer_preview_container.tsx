/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLink, EuiMark } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDocumentDetailsContext } from '../../shared/context';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { AnalyzerPreview } from './analyzer_preview';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { useNavigateToAnalyzer } from '../../shared/hooks/use_navigate_to_analyzer';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

/**
 * Analyzer preview under Overview, Visualizations. It shows a tree representation of analyzer.
 */
export const AnalyzerPreviewContainer: React.FC = () => {
  const { dataAsNestedObject, isRulePreview, eventId, indexName, scopeId, isPreviewMode } =
    useDocumentDetailsContext();

  const isNewNavigationEnabled = !useIsExperimentalFeatureEnabled(
    'newExpandableFlyoutNavigationDisabled'
  );
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

  const isNavigationEnabled = useMemo(() => {
    // if the analyzer is not enabled or in rule preview mode, the navigation is not enabled
    if (!isEnabled || isRulePreview) {
      return false;
    }
    // if the new navigation is enabled, the navigation is enabled (flyout or timeline)
    if (isNewNavigationEnabled) {
      return true;
    }
    // if the new navigation is not enabled, the navigation is enabled if the flyout is not in preview mode
    return !isPreviewMode;
  }, [isNewNavigationEnabled, isPreviewMode, isEnabled, isRulePreview]);

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.analyzerPreviewTitle"
            defaultMessage="Analyzer preview"
          />
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
