/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect } from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  type EntityOrEventItem,
  getNodeDocumentMode,
  getSingleDocumentData,
  GraphGroupedNodePreviewPanelKey,
  GROUP_PREVIEW_BANNER,
  type NodeViewModel,
  groupedItemClick$,
  NETWORK_PREVIEW_BANNER,
} from '@kbn/cloud-security-posture-graph';
import { type NodeDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/v1';
import {
  DOCUMENT_TYPE_ALERT,
  DOCUMENT_TYPE_ENTITY,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { isEntityNodeEnriched } from '@kbn/cloud-security-posture-graph/src/components/utils';
import { PageScope } from '../../../../data_view_manager/constants';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useDocumentDetailsContext } from '../../shared/context';
import { GRAPH_VISUALIZATION_TEST_ID } from './test_ids';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';
import { useInvestigateInTimeline } from '../../../../common/hooks/timeline/use_investigate_in_timeline';
import { normalizeTimeRange } from '../../../../common/utils/normalize_time_range';
import { DocumentDetailsPreviewPanelKey } from '../../shared/constants/panel_keys';
import {
  ALERT_PREVIEW_BANNER,
  EVENT_PREVIEW_BANNER,
  GENERIC_ENTITY_PREVIEW_BANNER,
} from '../../preview/constants';
import { useToasts } from '../../../../common/lib/kibana';
import { GenericEntityPanelKey } from '../../../entity_details/shared/constants';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy';

const GraphInvestigationLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({
    default: module.GraphInvestigation,
  }))
);

export const GRAPH_ID = 'graph-visualization' as const;

const MAX_DOCUMENTS_TO_LOAD = 50;

/**
 * Graph visualization view displayed in the document details expandable flyout left section under the Visualize tab
 */
export const GraphVisualization: React.FC = memo(() => {
  const toasts = useToasts();

  const { dataView } = useDataView(PageScope.default);
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

  const { openPreviewPanel } = useExpandableFlyoutApi();

  const onOpenNetworkPreview = useCallback(
    (ip: string, previewScopeId: string) => {
      openPreviewPanel({
        id: 'network-preview',
        params: {
          ip,
          scopeId: previewScopeId,
          flowTarget: FlowTargetSourceDest.source,
          banner: NETWORK_PREVIEW_BANNER,
          isPreviewMode: true,
        },
      });
    },
    [openPreviewPanel]
  );

  const onOpenEventPreview = useCallback(
    (node: NodeViewModel) => {
      const singleDocumentData = getSingleDocumentData(node);
      const docMode = getNodeDocumentMode(node);
      const documentsData = (node.documentsData ?? []) as NodeDocumentDataModel[];

      const showEntityPreview = (item: { id: string; entity?: unknown }) => {
        openPreviewPanel({
          id: GenericEntityPanelKey,
          params: {
            entityId: item.id,
            scopeId,
            isPreviewMode: true,
            banner: GENERIC_ENTITY_PREVIEW_BANNER,
            isEngineMetadataExist: !!item.entity,
          },
        });
      };

      const showEventOrAlertPreview = (
        item: { id: string },
        banner: {
          title: string;
          backgroundColor: string;
          textColor: string;
        },
        index?: string
      ) => {
        openPreviewPanel({
          id: DocumentDetailsPreviewPanelKey,
          params: {
            id: item.id,
            indexName: index,
            scopeId,
            banner,
            isPreviewMode: true,
          },
        });
      };
      if ((docMode === 'single-event' || docMode === 'single-alert') && singleDocumentData) {
        showEventOrAlertPreview(
          singleDocumentData,
          docMode === 'single-alert' ? ALERT_PREVIEW_BANNER : EVENT_PREVIEW_BANNER,
          singleDocumentData.index
        );
      } else if (docMode === 'single-entity' && singleDocumentData && isEntityNodeEnriched(node)) {
        showEntityPreview(singleDocumentData);
      } else if (docMode === 'grouped-entities' && documentsData.length > 0) {
        openPreviewPanel({
          id: GraphGroupedNodePreviewPanelKey,
          params: {
            id: node.id,
            scopeId,
            isPreviewMode: true,
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
                availableInEntityStore: !!doc.entity?.availableInEntityStore,
              })),
          },
        });
      } else if (docMode === 'grouped-events' && documentsData.length > 0) {
        openPreviewPanel({
          id: GraphGroupedNodePreviewPanelKey,
          params: {
            id: node.id,
            scopeId,
            isPreviewMode: true,
            banner: GROUP_PREVIEW_BANNER,
            docMode,
            dataViewId: dataViewIndexPattern,
            documentIds: (node.documentsData as NodeDocumentDataModel[])
              .slice(0, MAX_DOCUMENTS_TO_LOAD)
              .map((doc) => doc.event?.id),
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
    [toasts, openPreviewPanel, scopeId, dataViewIndexPattern]
  );

  // Subscribe to grouped item click events emitted by graph package
  useEffect(() => {
    const sub = groupedItemClick$.subscribe((item: EntityOrEventItem) => {
      if (item.itemType === DOCUMENT_TYPE_ENTITY) {
        openPreviewPanel({
          id: GenericEntityPanelKey,
          params: {
            entityId: item.id,
            scopeId,
            isPreviewMode: true,
            banner: GENERIC_ENTITY_PREVIEW_BANNER,
            isEngineMetadataExist: !!item.availableInEntityStore,
          },
        });
      } else {
        // event or alert
        openPreviewPanel({
          id: DocumentDetailsPreviewPanelKey,
          params: {
            id: item.docId,
            indexName: item.index,
            scopeId,
            banner:
              item.itemType === DOCUMENT_TYPE_ALERT ? ALERT_PREVIEW_BANNER : EVENT_PREVIEW_BANNER,
            isPreviewMode: true,
          },
        });
      }
    });
    return () => sub.unsubscribe();
  }, [openPreviewPanel, scopeId]);

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
            onOpenNetworkPreview={onOpenNetworkPreview}
          />
        </React.Suspense>
      )}
    </div>
  );
});

GraphVisualization.displayName = 'GraphVisualization';
