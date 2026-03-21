/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiLink, EuiMark, EuiSkeletonText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useDocumentDetailsContext } from '../../shared/context';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { AnalyzerPreview } from './analyzer_preview';
import {
  ANALYZER_PREVIEW_COLD_FROZEN_TIER_BADGE_TEST_ID,
  ANALYZER_PREVIEW_LOADING_TEST_ID,
  ANALYZER_PREVIEW_TEST_ID,
} from './test_ids';
import { useNavigateToAnalyzer } from '../../shared/hooks/use_navigate_to_analyzer';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { DataViewManagerScopeName } from '../../../../data_view_manager/constants';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { useKibana } from '../../../../common/lib/kibana';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER } from '../../../../../common/constants';

/**
 * Analyzer preview under Overview, Visualizations. It shows a tree representation of analyzer.
 */
export const AnalyzerPreviewContainer: React.FC = () => {
  const { uiSettings } = useKibana().services;
  const isColdAndFrozenTiersExcluded = uiSettings.get<boolean>(
    EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER
  );

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

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { selectedPatterns: oldAnalyzerPatterns } = useSourcererDataView(
    DataViewManagerScopeName.analyzer
  );
  const experimentalAnalyzerPatterns = useSelectedPatterns(DataViewManagerScopeName.analyzer);
  const selectedPatterns = newDataViewPickerEnabled
    ? experimentalAnalyzerPatterns
    : oldAnalyzerPatterns;
  const { dataView, status } = useDataView(DataViewManagerScopeName.analyzer);
  const dataViewLoading = status === 'loading' || status === 'pristine';
  const dataViewError = status === 'error' || (status === 'ready' && !dataView.hasMatchedIndices());

  const coldAndFrozenTiersBadge = (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.securitySolution.flyoutV2.right.visualizations.analyzerPreview.coldAndFrozenTiers.excludedTooltip"
          defaultMessage="{state}, go to Advanced Settings or contact your administrator."
          values={{
            state: isColdAndFrozenTiersExcluded
              ? 'Cold and frozen tiers are excluded to improve performance. To include them'
              : 'This view loads more slowly because cold and frozen tiers are included. To change this',
          }}
        />
      }
    >
      <EuiBadge
        color="hollow"
        iconSide="left"
        iconType="snowflake"
        tabIndex={0}
        data-test-subj={ANALYZER_PREVIEW_COLD_FROZEN_TIER_BADGE_TEST_ID}
      >
        <FormattedMessage
          id="xpack.securitySolution.flyoutV2.right.visualizations.analyzerPreview.coldAndFrozenTiers.excludedLabel"
          defaultMessage="Cold/Frozen tiers {state}"
          values={{ state: isColdAndFrozenTiersExcluded ? 'off' : 'on' }}
        />
      </EuiBadge>
    </EuiToolTip>
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
        headerContent: <>{coldAndFrozenTiersBadge}</>,
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
