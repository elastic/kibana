/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../../data_view_manager/constants';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import { useDocumentDetailsContext } from '../../shared/context';
import { ANALYZER_GRAPH_TEST_ID } from './test_ids';
import { Resolver } from '../../../../resolver/view';
import { useTimelineDataFilters } from '../../../../timelines/containers/use_timeline_data_filters';
import { isActiveTimeline } from '../../../../helpers';
import { DocumentDetailsAnalyzerPanelKey } from '../../shared/constants/panel_keys';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { AnalyzerPreviewNoDataMessage } from '../../right/components/analyzer_preview_container';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';

export const ANALYZE_GRAPH_ID = 'analyze_graph';
export const DATA_VIEW_LOADING_TEST_ID = 'analyzer-data-view-loading';
export const DATA_VIEW_ERROR_TEST_ID = 'analyzer-data-view-error';

const DATAVIEW_ERROR = i18n.translate('xpack.securitySolution.analyzer.dataViewError', {
  defaultMessage: 'Unable to retrieve the data view for analyzer',
});
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

/**
 * Analyzer graph view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const AnalyzeGraph: FC = () => {
  const { eventId, scopeId, dataAsNestedObject } = useDocumentDetailsContext();
  const isEnabled = useIsInvestigateInResolverActionEnabled(dataAsNestedObject);

  const key = useWhichFlyout() ?? 'memory';
  const { from, to, shouldUpdate } = useTimelineDataFilters(isActiveTimeline(scopeId));
  const filters = useMemo(() => ({ from, to }), [from, to]);

  const selectedPatterns = useSelectedPatterns(PageScope.analyzer);

  const { dataView, status } = useDataView(PageScope.analyzer);

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

  if (!isEnabled) {
    return (
      <EuiPanel hasShadow={false}>
        <AnalyzerPreviewNoDataMessage />
      </EuiPanel>
    );
  }

  if (status === 'loading' || status === 'pristine') {
    return (
      <EuiFlexGroup gutterSize="m" justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner data-test-subj={DATA_VIEW_LOADING_TEST_ID} size="xxl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (status === 'error' || (status === 'ready' && !dataView.hasMatchedIndices())) {
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
  );
};

AnalyzeGraph.displayName = 'AnalyzeGraph';
