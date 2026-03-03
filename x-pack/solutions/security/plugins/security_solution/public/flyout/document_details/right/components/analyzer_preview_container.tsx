/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLink, EuiMark, EuiSkeletonText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useDocumentDetailsContext } from '../../shared/context';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { AnalyzerPreview } from './analyzer_preview';
import { ANALYZER_PREVIEW_LOADING_TEST_ID, ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { useNavigateToAnalyzer } from '../../shared/hooks/use_navigate_to_analyzer';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { PageScope } from '../../../../data_view_manager/constants';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';

/**
 * Analyzer preview under Overview, Visualizations. It shows a tree representation of analyzer.
 */
export const AnalyzerPreviewContainer: React.FC = () => {
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

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { selectedPatterns: oldAnalyzerPatterns } = useSourcererDataView(PageScope.analyzer);
  const experimentalAnalyzerPatterns = useSelectedPatterns(PageScope.analyzer);
  const selectedPatterns = newDataViewPickerEnabled
    ? experimentalAnalyzerPatterns
    : oldAnalyzerPatterns;
  const { dataView, status } = useDataView(PageScope.analyzer);
  const dataViewLoading = status === 'loading' || status === 'pristine';
  const dataViewError = status === 'error' || (status === 'ready' && !dataView.hasMatchedIndices());

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
      {isEnabled ? (
        <>
          {dataViewLoading ? (
            <EuiSkeletonText
              data-test-subj={ANALYZER_PREVIEW_LOADING_TEST_ID}
              contentAriaLabel={i18n.translate(
                'xpack.securitySolution.flyout.right.visualizations.analyzerPreview.loadingAriaLabel',
                {
                  defaultMessage: 'analyzer preview',
                }
              )}
            />
          ) : dataViewError ? (
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.visualizations.analyzerPreview.dataViewErrorDescription"
              defaultMessage="Unable to retrieve the data view for analyzer."
            />
          ) : (
            <AnalyzerPreview dataViewIndices={selectedPatterns} />
          )}
        </>
      ) : (
        <AnalyzerPreviewNoDataMessage />
      )}
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
