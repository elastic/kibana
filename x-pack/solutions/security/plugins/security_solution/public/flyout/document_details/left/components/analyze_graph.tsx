/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { buildDataTableRecord, type DataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { cellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../../data_view_manager/constants';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import { useDocumentDetailsContext } from '../../shared/context';
import {
  ANALYZER_COLD_FROZEN_TIER_CALLOUT_DISMISS_BUTTON_TEST_ID,
  ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID,
  ANALYZER_GRAPH_TEST_ID,
} from './test_ids';
import { Resolver } from '../../../../resolver/view';
import { useTimelineDataFilters } from '../../../../timelines/containers/use_timeline_data_filters';
import { isActiveTimeline } from '../../../../helpers';
import { useIsAnalyzerEnabled } from '../../../../detections/hooks/use_is_analyzer_enabled';
import { AnalyzerPreviewNoDataMessage } from '../../../../flyout_v2/document/components/analyzer_no_data_message';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER } from '../../../../../common/constants';

export const ANALYZE_GRAPH_ID = 'analyze_graph';
export const DATA_VIEW_LOADING_TEST_ID = 'analyzer-data-view-loading';
export const DATA_VIEW_ERROR_TEST_ID = 'analyzer-data-view-error';

// This variable is used to track if the cold/frozen tier callout has been dismissed in the current tab session.
let isAnalyzerColdFrozenTierCalloutDismissedInTab = false;
// This function is used in tests to reset the callout dismissed state between tests, as the variable is shared across the entire tab session.
export const resetAnalyzerColdFrozenTierCalloutDismissedStateForTests = () => {
  isAnalyzerColdFrozenTierCalloutDismissedInTab = false;
};

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.analyzer.dataViewError', {
  defaultMessage: 'Unable to retrieve the data view for analyzer',
});
/**
 * Analyzer graph view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const AnalyzeGraph: FC = () => {
  const { serverless, uiSettings } = useKibana().services;
  const isServerless = !!serverless;

  const { eventId, scopeId, searchHit } = useDocumentDetailsContext();

  const isColdAndFrozenTiersExcluded = uiSettings.get<boolean>(
    EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER
  );
  const [isColdFrozenTierCalloutDismissed, setIsColdFrozenTierCalloutDismissed] = useState(
    isAnalyzerColdFrozenTierCalloutDismissedInTab
  );

  const hit: DataTableRecord = useMemo(
    () => buildDataTableRecord(searchHit as EsHitRecord),
    [searchHit]
  );
  const isEnabled = useIsAnalyzerEnabled(hit);

  const key = useWhichFlyout() ?? 'memory';
  const { from, to, shouldUpdate } = useTimelineDataFilters(isActiveTimeline(scopeId));
  const filters = useMemo(() => ({ from, to }), [from, to]);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { selectedPatterns: oldAnalyzerPatterns } = useSourcererDataView(PageScope.analyzer);
  const experimentalAnalyzerPatterns = useSelectedPatterns(PageScope.analyzer);
  const selectedPatterns = newDataViewPickerEnabled
    ? experimentalAnalyzerPatterns
    : oldAnalyzerPatterns;

  const { dataView: experimentalDataView, status: experimentalDataViewStatus } = useDataView(
    PageScope.analyzer
  );
  const { sourcererDataView: oldSourcererDataViewSpec, loading: oldSourcererDataViewIsLoading } =
    useSourcererDataView(PageScope.analyzer);

  const isLoading: boolean = useMemo(
    () =>
      newDataViewPickerEnabled
        ? experimentalDataViewStatus === 'loading' || experimentalDataViewStatus === 'pristine'
        : oldSourcererDataViewIsLoading,
    [experimentalDataViewStatus, newDataViewPickerEnabled, oldSourcererDataViewIsLoading]
  );

  const isDataViewInvalid: boolean = useMemo(
    () =>
      newDataViewPickerEnabled
        ? experimentalDataViewStatus === 'error' ||
          (experimentalDataViewStatus === 'ready' && !experimentalDataView.hasMatchedIndices())
        : !oldSourcererDataViewSpec ||
          !oldSourcererDataViewSpec.id ||
          !oldSourcererDataViewSpec.title,
    [
      experimentalDataView,
      experimentalDataViewStatus,
      newDataViewPickerEnabled,
      oldSourcererDataViewSpec,
    ]
  );

  const onDismiss = useCallback(() => {
    isAnalyzerColdFrozenTierCalloutDismissedInTab = true;
    setIsColdFrozenTierCalloutDismissed(true);
  }, []);

  if (!isEnabled) {
    return (
      <EuiPanel hasShadow={false}>
        <AnalyzerPreviewNoDataMessage />
      </EuiPanel>
    );
  }

  if (isLoading) {
    return (
      <EuiFlexGroup gutterSize="m" justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner data-test-subj={DATA_VIEW_LOADING_TEST_ID} size="xxl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isDataViewInvalid) {
    return (
      <EuiEmptyPrompt
        color="danger"
        data-test-subj={DATA_VIEW_ERROR_TEST_ID}
        iconType="error"
        title={<h2>{DATAVIEW_ERROR}</h2>}
      />
    );
  }

  return (
    <div data-test-subj={ANALYZER_GRAPH_TEST_ID}>
      {!isServerless && !isColdFrozenTierCalloutDismissed && (
        <>
          <EuiCallOut
            announceOnMount={false}
            data-test-subj={ANALYZER_COLD_FROZEN_TIER_CALLOUT_TEST_ID}
            title={
              <FormattedMessage
                id="xpack.securitySolution.flyout.left.visualize.analyzer.excludeColdAndFrozenTiers.calloutTitle"
                defaultMessage="{state}"
                values={{
                  state: isColdAndFrozenTiersExcluded
                    ? 'Some data excluded'
                    : 'Performance optimization',
                }}
              />
            }
            iconType="snowflake"
          >
            <EuiFlexGroup alignItems="flexStart" gutterSize="l" responsive={false}>
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.left.visualize.analyzer.excludeColdAndFrozenTiers.calloutDescription"
                  defaultMessage="{state}, go to Advanced Settings or contact your administrator."
                  values={{
                    state: isColdAndFrozenTiersExcluded
                      ? 'Cold and frozen tiers are excluded to improve performance. To include them'
                      : 'This view loads more slowly because cold and frozen tiers are included. To change this',
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  aria-label={i18n.translate(
                    'xpack.securitySolution.flyout.left.visualize.analyzer.excludeColdAndFrozenTiers.dismissButtonAriaLabel',
                    { defaultMessage: 'Dismiss cold and frozen tier callout' }
                  )}
                  data-test-subj={ANALYZER_COLD_FROZEN_TIER_CALLOUT_DISMISS_BUTTON_TEST_ID}
                  onClick={onDismiss}
                >
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.left.visualize.analyzer.excludeColdAndFrozenTiers.dismissButtonLabel"
                    defaultMessage="Dismiss"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <Resolver
        databaseDocumentID={eventId}
        resolverComponentInstanceID={`${key}-${scopeId}`}
        indices={selectedPatterns}
        shouldUpdate={shouldUpdate}
        filters={filters}
        renderCellActions={cellActionRenderer}
      />
    </div>
  );
};

AnalyzeGraph.displayName = 'AnalyzeGraph';
