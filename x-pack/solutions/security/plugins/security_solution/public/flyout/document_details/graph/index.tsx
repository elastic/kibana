/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import {
  getNodeDocumentMode,
  getSingleDocumentData,
  GraphGroupedNodePreviewPanelKey,
  GROUP_PREVIEW_BANNER,
  type NodeViewModel,
} from '@kbn/cloud-security-posture-graph';
import { type NodeDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { DOCUMENT_TYPE_ENTITY } from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { useFlyoutApi } from '@kbn/flyout';
import { PREFIX } from '../../shared/test_ids';
import { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useGetScopedSourcererDataView } from '../../../sourcerer/components/use_get_sourcerer_data_view';
import { useDocumentDetailsContext } from '../shared/context';
import { useGraphPreview } from '../shared/hooks/use_graph_preview';
import { useInvestigateInTimeline } from '../../../common/hooks/timeline/use_investigate_in_timeline';
import { normalizeTimeRange } from '../../../common/utils/normalize_time_range';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { DocumentDetailsPreviewPanelKey } from '../shared/constants/panel_keys';
import {
  ALERT_PREVIEW_BANNER,
  EVENT_PREVIEW_BANNER,
  GENERIC_ENTITY_PREVIEW_BANNER,
} from '../preview/constants';
import { useToasts } from '../../../common/lib/kibana';
import { GenericEntityPanelKey } from '../../entity_details/shared/constants';
import { FlyoutBody } from '../../shared/components/flyout_body';

const GRAPH_VISUALIZATION_TEST_ID = `${PREFIX}GraphVisualization` as const;

const GraphInvestigationLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({
    default: module.GraphInvestigation,
  }))
);

const MAX_DOCUMENTS_TO_LOAD = 50;

/**
 * Graph visualization view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const GraphPanel: React.FC = memo(() => {
  const { euiTheme } = useEuiTheme();

  const toasts = useToasts();
  const oldDataView = useGetScopedSourcererDataView({
    sourcererScope: PageScope.default,
  });

  const { dataView: experimentalDataView } = useDataView(PageScope.default);
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const dataView = newDataViewPickerEnabled ? experimentalDataView : oldDataView;
  const dataViewIndexPattern = dataView ? dataView.getIndexPattern() : undefined;

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

  const { openChildPanel } = useFlyoutApi();

  const onOpenEventPreview = useCallback(
    (node: NodeViewModel) => {
      const singleDocumentData = getSingleDocumentData(node);
      const docMode = getNodeDocumentMode(node);

      if ((docMode === 'single-event' || docMode === 'single-alert') && singleDocumentData) {
        openChildPanel(
          {
            id: DocumentDetailsPreviewPanelKey,
            params: {
              id: singleDocumentData.id,
              indexName: singleDocumentData.index,
              scopeId,
              banner: docMode === 'single-alert' ? ALERT_PREVIEW_BANNER : EVENT_PREVIEW_BANNER,
              isChild: true,
            },
          },
          's'
        );
      } else if (docMode === 'single-entity' && singleDocumentData) {
        openChildPanel(
          {
            id: GenericEntityPanelKey,
            params: {
              entityId: singleDocumentData.id,
              scopeId,
              isChild: true,
              banner: GENERIC_ENTITY_PREVIEW_BANNER,
            },
          },
          's'
        );
      } else if (docMode === 'grouped-entities' && node.documentsData) {
        openChildPanel(
          {
            id: GraphGroupedNodePreviewPanelKey,
            params: {
              id: node.id,
              scopeId,
              isChild: true,
              banner: GROUP_PREVIEW_BANNER,
              docMode,
              entityItems: (node.documentsData as NodeDocumentDataModel[])
                .slice(0, MAX_DOCUMENTS_TO_LOAD)
                .map((doc) => ({
                  itemType: DOCUMENT_TYPE_ENTITY,
                  id: doc.id,
                  type: doc.entity?.type,
                  subType: doc.entity?.sub_type,
                  icon: node.icon,
                })),
            },
          },
          's'
        );
      } else if (docMode === 'grouped-events' && node.documentsData) {
        openChildPanel(
          {
            id: GraphGroupedNodePreviewPanelKey,
            params: {
              id: node.id,
              scopeId,
              isChild: true,
              banner: GROUP_PREVIEW_BANNER,
              docMode,
              dataViewId: dataViewIndexPattern,
              documentIds: (node.documentsData as NodeDocumentDataModel[])
                .slice(0, MAX_DOCUMENTS_TO_LOAD)
                .map((doc) => doc.event?.id),
            },
          },
          's'
        );
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
    [toasts, openChildPanel, scopeId, dataViewIndexPattern]
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
    <FlyoutBody
      css={css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
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
    </FlyoutBody>
  );
});

GraphPanel.displayName = 'GraphPanel';
