/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiBadge, EuiSkeletonText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useIsAnalyzerEnabled } from '../../../../detections/hooks/use_is_analyzer_enabled';
import { AnalyzerPreview } from './analyzer_preview';
import {
  ANALYZER_PREVIEW_COLD_FROZEN_TIER_BADGE_TEST_ID,
  ANALYZER_PREVIEW_LOADING_TEST_ID,
  ANALYZER_PREVIEW_TEST_ID,
} from './test_ids';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { PageScope } from '../../../../data_view_manager/constants';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { AnalyzerPreviewNoDataMessage } from './analyzer_no_data_message';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';

export interface AnalyzerPreviewContainerProps {
  /**
   * Callback when clicking the link to navigate to the analyzer graph. The navigation will be
   * disabled if the analyzer is not available for the current document or in rule preview mode.
   */
  onShowAnalyzer: () => void;
  /**
   * Document to display in the analyzer preview. The analyzer preview will try to find the related
   * events of the document and visualize them in a tree structure.
   */
  hit: DataTableRecord;
  /**
   * When true, the analyzer preview should use `kibana.alert.ancestors.id` as the resolver document id.
   */
  shouldUseAncestor: boolean;
  /**
   * Whether to show the header icon.
   */
  showIcon: boolean;
  /**
   * Whether to disable the analyzer navigation link.
   */
  disableNavigation: boolean;
}

/**
 * Analyzer preview under Overview, Visualizations. It shows a tree representation of analyzer.
 */
export const AnalyzerPreviewContainer = memo(
  ({
    onShowAnalyzer,
    hit,
    shouldUseAncestor,
    showIcon,
    disableNavigation,
  }: AnalyzerPreviewContainerProps) => {
    const { serverless, uiSettings } = useKibana().services;
    const isServerless = !!serverless;
    const isColdAndFrozenTiersExcluded = uiSettings.get<boolean>(
      EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER
    );

    const isEnabled = useIsAnalyzerEnabled(hit);

    const iconType = useMemo(() => (showIcon ? 'arrowStart' : undefined), [showIcon]);

    // if the analyzer is not enabled or in rule preview mode, the navigation is not enabled
    const isNavigationEnabled = useMemo(
      () => !(!isEnabled || disableNavigation),
      [disableNavigation, isEnabled]
    );

    const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
    const { selectedPatterns: oldAnalyzerPatterns } = useSourcererDataView(PageScope.analyzer);
    const experimentalAnalyzerPatterns = useSelectedPatterns(PageScope.analyzer);
    const selectedPatterns = newDataViewPickerEnabled
      ? experimentalAnalyzerPatterns
      : oldAnalyzerPatterns;
    const { dataView, status } = useDataView(PageScope.analyzer);
    const dataViewLoading = status === 'loading' || status === 'pristine';
    const dataViewError =
      status === 'error' || (status === 'ready' && !dataView.hasMatchedIndices());

    const coldAndFrozenTiersBadge = (
      <EuiToolTip
        content={
          <FormattedMessage
            id="xpack.securitySolution.flyoutV2.document.visualizations.analyzerPreview.coldAndFrozenTiers.excludedTooltip"
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
            id="xpack.securitySolution.flyoutV2.document.visualizations.analyzerPreview.coldAndFrozenTiers.excludedLabel"
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
              id="xpack.securitySolution.flyout.document.visualizations.analyzerPreview.analyzerPreviewTitle"
              defaultMessage="Analyzer preview"
            />
          ),
          iconType,
          ...(isNavigationEnabled && {
            link: {
              callback: onShowAnalyzer,
              tooltip: (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.document.visualizations.analyzerPreview.analyzerPreviewOpenAnalyzerTooltip"
                  defaultMessage="Open analyzer graph"
                />
              ),
            },
          }),
          headerContent: <>{!isServerless && coldAndFrozenTiersBadge}</>,
        }}
        data-test-subj={ANALYZER_PREVIEW_TEST_ID}
      >
        {isEnabled ? (
          <>
            {dataViewLoading ? (
              <EuiSkeletonText
                data-test-subj={ANALYZER_PREVIEW_LOADING_TEST_ID}
                contentAriaLabel={i18n.translate(
                  'xpack.securitySolution.flyout.document.visualizations.analyzerPreview.loadingAriaLabel',
                  {
                    defaultMessage: 'analyzer preview',
                  }
                )}
              />
            ) : dataViewError ? (
              <FormattedMessage
                id="xpack.securitySolution.flyout.document.visualizations.analyzerPreview.dataViewErrorDescription"
                defaultMessage="Unable to retrieve the data view for analyzer."
              />
            ) : (
              <AnalyzerPreview
                dataViewIndices={selectedPatterns}
                hit={hit}
                shouldUseAncestor={shouldUseAncestor}
              />
            )}
          </>
        ) : (
          <AnalyzerPreviewNoDataMessage />
        )}
      </ExpandablePanel>
    );
  }
);

AnalyzerPreviewContainer.displayName = 'AnalyzerPreviewContainer';
