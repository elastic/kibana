/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  getNodeDocumentMode,
  getSingleDocumentData,
  GraphGroupedNodePreviewPanelKey,
  GROUP_PREVIEW_BANNER,
  NETWORK_PREVIEW_BANNER,
  type NodeViewModel,
} from '@kbn/cloud-security-posture-graph';
import { type NodeDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/v1';
import { DOCUMENT_TYPE_ENTITY } from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { isEntityNodeEnriched } from '@kbn/cloud-security-posture-graph/src/components/utils';
import { useFlyoutBodyAvailableHeight } from './use_flyout_body_available_height';
import { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useGetScopedSourcererDataView } from '../../../sourcerer/components/use_get_sourcerer_data_view';
import { GRAPH_VISUALIZATION_TEST_ID } from './test_ids';
import { useInvestigateInTimeline } from '../../../common/hooks/timeline/use_investigate_in_timeline';
import { normalizeTimeRange } from '../../../common/utils/normalize_time_range';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { DocumentDetailsPreviewPanelKey } from '../../document_details/shared/constants/panel_keys';
import {
  ALERT_PREVIEW_BANNER,
  EVENT_PREVIEW_BANNER,
  GENERIC_ENTITY_PREVIEW_BANNER,
} from '../../document_details/preview/constants';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { extractTimelineCapabilities } from '../../../common/utils/timeline_capabilities';
import { GenericEntityPanelKey, EntityPanelKeyByType } from '../../entity_details/shared/constants';
import { FlowTargetSourceDest } from '../../../../common/search_strategy';

const GraphInvestigationLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({
    default: module.GraphInvestigation,
  }))
);

export const GRAPH_ID = 'graph-visualization' as const;

const MAX_DOCUMENTS_TO_LOAD = 50;

/** Props for event/alert mode — drives the graph from an alert/event document */
interface EventGraphVisualizationProps {
  mode: 'event';
  /** Scope ID for the flyout panel */
  scopeId: string;
  /** Event/alert document IDs that are the origin of the graph */
  eventIds: string[];
  /** Timestamp of the source event/alert */
  timestamp: string;
  /** Whether the source document is an alert */
  isAlert: boolean;
}

/** Props for entity mode — drives the graph from an Entity Store entity ID */
interface EntityGraphVisualizationProps {
  mode: 'entity';
  /** Scope ID for the flyout panel */
  scopeId: string;
  /** Entity Store v2 entity ID (`entity.id`) to center the graph on */
  entityId: string;
}

export type GraphVisualizationProps = EventGraphVisualizationProps | EntityGraphVisualizationProps;

/**
 * Full-screen graph investigation view for use in left-panel flyout tabs.
 * Supports two modes:
 * - 'event': driven by alert/event document IDs and timestamp (used in document details).
 * - 'entity': driven by an Entity Store entity ID (used in entity detail panels).
 */
export const GraphVisualization: React.FC<GraphVisualizationProps> = memo((props) => {
  const { scopeId } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const height = useFlyoutBodyAvailableHeight(wrapperRef);

  const {
    application: { capabilities },
  } = useKibana().services;
  const { read: hasTimelineAccess } = extractTimelineCapabilities(capabilities);

  const toasts = useToasts();
  const oldDataView = useGetScopedSourcererDataView({
    sourcererScope: PageScope.default,
  });

  const { dataView: experimentalDataView } = useDataView(PageScope.default);
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const dataView = newDataViewPickerEnabled ? experimentalDataView : oldDataView;
  const dataViewIndexPattern = dataView ? dataView.getIndexPattern() : undefined;

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

      const showEntityPreview = (item: {
        id: string;
        entity?: NodeDocumentDataModel['entity'];
      }) => {
        const engineType = item.entity?.engine_type;
        const panelId =
          engineType && engineType in EntityPanelKeyByType
            ? EntityPanelKeyByType[engineType as keyof typeof EntityPanelKeyByType] ??
              GenericEntityPanelKey
            : GenericEntityPanelKey;

        if (!panelId) {
          toasts.addDanger({
            title: i18n.translate(
              'xpack.securitySolution.flyout.shared.components.graphVisualization.errorInvalidEntityPanel',
              {
                defaultMessage: 'Unable to open entity preview',
              }
            ),
          });
          return;
        }

        const params =
          engineType === 'host'
            ? { hostName: item.entity?.name }
            : engineType === 'user'
            ? { userName: item.entity?.name }
            : engineType === 'service'
            ? { serviceName: item.entity?.name }
            : {};

        openPreviewPanel({
          id: panelId,
          params: {
            entityId: item.id,
            scopeId,
            isPreviewMode: true,
            banner: GENERIC_ENTITY_PREVIEW_BANNER,
            isEngineMetadataExist: !!item.entity,
            ...params,
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
                entity: doc.entity,
                id: doc.id,
                icon: node.icon,
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
            'xpack.securitySolution.flyout.shared.components.graphVisualization.errorOpenNodePreview',
            {
              defaultMessage: 'Failed showing preview',
            }
          ),
        });
      }
    },
    [toasts, openPreviewPanel, scopeId, dataViewIndexPattern]
  );

  const { investigateInTimeline } = useInvestigateInTimeline();
  const openTimelineCallback = useCallback(
    (query: Query | undefined, filters: Filter[], timeRange: TimeRange) => {
      const from = dateMath.parse(timeRange.from);
      const to = dateMath.parse(timeRange.to);

      if (!from || !to) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.securitySolution.flyout.shared.components.graphVisualization.errorInvalidTimeRange',
            {
              defaultMessage: 'Invalid time range',
            }
          ),
          text: i18n.translate(
            'xpack.securitySolution.flyout.shared.components.graphVisualization.errorInvalidTimeRangeDescription',
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
      ref={wrapperRef}
      data-test-subj={GRAPH_VISUALIZATION_TEST_ID}
      css={css`
        height: ${height}px;
        width: 100%;
      `}
    >
      {dataView && (
        <React.Suspense fallback={<EuiLoadingSpinner />}>
          <GraphInvestigationLazy
            scopeId={scopeId}
            initialState={
              props.mode === 'event'
                ? {
                    dataView,
                    originEventIds: props.eventIds.map((id) => ({ id, isAlert: props.isAlert })),
                    timeRange: {
                      from: `${props.timestamp}||-30m`,
                      to: `${props.timestamp}||+30m`,
                    },
                  }
                : {
                    dataView,
                    entityIds: [{ id: props.entityId, isOrigin: true }],
                    timeRange: {
                      from: 'now-30d',
                      to: 'now',
                    },
                  }
            }
            showInvestigateInTimeline={hasTimelineAccess}
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
