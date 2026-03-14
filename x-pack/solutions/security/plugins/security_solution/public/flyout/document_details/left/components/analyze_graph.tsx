/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useCallback, useState } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
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
import { DocumentDetailsAnalyzerPanelKey } from '../../shared/constants/panel_keys';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { AnalyzerPreviewNoDataMessage } from '../../right/components/analyzer_preview_container';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useEnableExperimental } from '../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER } from '../../../../../common/constants';

export const ANALYZE_GRAPH_ID = 'analyze_graph';

export const ANALYZER_PREVIEW_BANNER = {
  title: i18n.translate(
    'xpack.securitySolution.flyout.left.visualizations.analyzer.panelPreviewTitle',
    {
      defaultMessage: 'Preview analyzer panel',
    }
  ),
  backgroundColor: 'warning',
  textColor: 'warning',
};

// This variable is used to track if the cold/frozen tier callout has been dismissed in the current tab session.
let isAnalyzerColdFrozenTierCalloutDismissedInTab = false;
// This function is used in tests to reset the callout dismissed state between tests, as the variable is shared across the entire tab session.
export const resetAnalyzerColdFrozenTierCalloutDismissedStateForTests = () => {
  isAnalyzerColdFrozenTierCalloutDismissedInTab = false;
};

/**
 * Analyzer graph view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const AnalyzeGraph: FC = () => {
  const { uiSettings } = useKibana().services;

  const { eventId, scopeId, dataAsNestedObject } = useDocumentDetailsContext();

  const isColdAndFrozenTiersExcluded = uiSettings.get<boolean>(
    EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ANALYZER
  );
  const [isColdFrozenTierCalloutDismissed, setIsColdFrozenTierCalloutDismissed] = useState(
    isAnalyzerColdFrozenTierCalloutDismissedInTab
  );

  const isEnabled = useIsInvestigateInResolverActionEnabled(dataAsNestedObject);

  const key = useWhichFlyout() ?? 'memory';
  const { from, to, shouldUpdate } = useTimelineDataFilters(isActiveTimeline(scopeId));
  const filters = useMemo(() => ({ from, to }), [from, to]);

  const { newDataViewPickerEnabled } = useEnableExperimental();
  const { selectedPatterns: oldAnalyzerPatterns } = useSourcererDataView(
    SourcererScopeName.analyzer
  );
  const experimentalAnalyzerPatterns = useSelectedPatterns(SourcererScopeName.analyzer);
  const selectedPatterns = newDataViewPickerEnabled
    ? experimentalAnalyzerPatterns
    : oldAnalyzerPatterns;

  const { openPreviewPanel } = useExpandableFlyoutApi();

  const onClick = useCallback(() => {
    openPreviewPanel({
      id: DocumentDetailsAnalyzerPanelKey,
      params: {
        resolverComponentInstanceID: `${key}-${scopeId}`,
        banner: ANALYZER_PREVIEW_BANNER,
      },
    });
  }, [openPreviewPanel, key, scopeId]);

  const onDismiss = useCallback(() => {
    isAnalyzerColdFrozenTierCalloutDismissedInTab = true;
    setIsColdFrozenTierCalloutDismissed(true);
  }, []);

  return isEnabled ? (
    <div data-test-subj={ANALYZER_GRAPH_TEST_ID}>
      {!isColdFrozenTierCalloutDismissed && (
        <>
          <EuiCallOut
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
        isSplitPanel
        showPanelOnClick={onClick}
      />
    </div>
  ) : (
    <EuiPanel hasShadow={false}>
      <AnalyzerPreviewNoDataMessage />
    </EuiPanel>
  );
};

AnalyzeGraph.displayName = 'AnalyzeGraph';
