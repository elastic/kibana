/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  getNodeDocumentMode,
  getSingleDocumentData,
  type NodeViewModel,
} from '@kbn/cloud-security-posture-graph';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useGetScopedSourcererDataView } from '../../../../sourcerer/components/use_get_sourcerer_data_view';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { useDocumentDetailsContext } from '../../shared/context';
import { GRAPH_VISUALIZATION_TEST_ID } from './test_ids';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';
import { useInvestigateInTimeline } from '../../../../common/hooks/timeline/use_investigate_in_timeline';
import { normalizeTimeRange } from '../../../../common/utils/normalize_time_range';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { DocumentDetailsPreviewPanelKey } from '../../shared/constants/panel_keys';
import { ALERT_PREVIEW_BANNER, EVENT_PREVIEW_BANNER } from '../../preview/constants';
import { useToasts } from '../../../../common/lib/kibana';

const GraphInvestigationLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({
    default: module.GraphInvestigation,
  }))
);

export const GRAPH_ID = 'graph-visualization' as const;

/**
 * Graph visualization view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const GraphVisualization: React.FC = memo(() => {
  const toasts = useToasts();
  const oldDataView = useGetScopedSourcererDataView({
    sourcererScope: SourcererScopeName.default,
  });

  const { dataView: experimentalDataView } = useDataView(SourcererScopeName.default);
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const dataView = newDataViewPickerEnabled ? experimentalDataView : oldDataView;

  const { getFieldsData, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId } =
    useDocumentDetailsContext();
  const {
    eventIds,
    timestamp = new Date().toISOString(),
    isAlert,
  } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
    dataFormattedForFieldBrowser,
  });

  const { openPreviewPanel } = useExpandableFlyoutApi();
  const onOpenEventPreview = useCallback(
    (node: NodeViewModel) => {
      const documentData = getSingleDocumentData(node);
      if (
        (getNodeDocumentMode(node) === 'single-event' ||
          getNodeDocumentMode(node) === 'single-alert') &&
        documentData
      ) {
        openPreviewPanel({
          id: DocumentDetailsPreviewPanelKey,
          params: {
            id: documentData.id,
            indexName: documentData.index,
            scopeId,
            banner: documentData.type === 'alert' ? ALERT_PREVIEW_BANNER : EVENT_PREVIEW_BANNER,
            isPreviewMode: true,
          },
        });
      } else {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.securitySolution.flyout.document_details.left.components.graphVisualization.errorOpenNodePreview',
            {
              defaultMessage: 'Failed showing preview',
            }
          ),
        });
      }
    },
    [toasts, openPreviewPanel, scopeId]
  );

  const originEventIds = eventIds.map((id) => ({ id, isAlert }));
  const { investigateInTimeline } = useInvestigateInTimeline();
  const openTimelineCallback = useCallback(
    (query: Query | undefined, filters: Filter[], timeRange: TimeRange) => {
      const from = dateMath.parse(timeRange.from);
      const to = dateMath.parse(timeRange.to);

      if (!from || !to) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.securitySolution.flyout.document_details.left.components.graphVisualization.errorInvalidTimeRange',
            {
              defaultMessage: 'Invalid time range',
            }
          ),
          text: i18n.translate(
            'xpack.securitySolution.flyout.document_details.left.components.graphVisualization.errorInvalidTimeRangeDescription',
            {
              defaultMessage: 'Please select a valid time range.',
            }
          ),
        });
        return;
      }

      const normalizedTimeRange = normalizeTimeRange({
        ...timeRange,
        from: from.toISOString(),
        to: to.toISOString(),
      });

      investigateInTimeline({
        keepDataView: true,
        query,
        filters,
        timeRange: {
          from: normalizedTimeRange.from,
          to: normalizedTimeRange.to,
          kind: 'absolute',
        },
      });
    },
    [investigateInTimeline, toasts]
  );

  return (
    <div
      data-test-subj={GRAPH_VISUALIZATION_TEST_ID}
      css={css`
        height: calc(100vh - 250px);
        min-height: 400px;
        width: 100%;
      `}
    >
      {dataView && (
        <React.Suspense fallback={<EuiLoadingSpinner />}>
          <GraphInvestigationLazy
            initialState={{
              dataView,
              originEventIds,
              timeRange: {
                from: `${timestamp}||-30m`,
                to: `${timestamp}||+30m`,
              },
            }}
            showInvestigateInTimeline={true}
            showToggleSearch={true}
            onInvestigateInTimeline={openTimelineCallback}
            onOpenEventPreview={onOpenEventPreview}
          />
        </React.Suspense>
      )}
    </div>
  );
});

GraphVisualization.displayName = 'GraphVisualization';
