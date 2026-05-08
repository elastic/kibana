/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useRef } from 'react';
import { css } from '@emotion/react';
import { noop } from 'lodash';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import {
  getNodeDocumentMode,
  getSingleDocumentData,
  type EntityOrEventItem,
  type NodeViewModel,
} from '@kbn/cloud-security-posture-graph';
import { type NodeDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/v1';
import {
  DOCUMENT_TYPE_ENTITY,
  DOCUMENT_TYPE_EVENT,
  DOCUMENT_TYPE_ALERT,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { isEntityNodeEnriched } from '@kbn/cloud-security-posture-graph/src/components/utils';
import { useFlyoutBodyAvailableHeight } from './use_flyout_body_available_height';
import { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useGetScopedSourcererDataView } from '../../../sourcerer/components/use_get_sourcerer_data_view';
import { GRAPH_VISUALIZATION_TEST_ID } from '../test_ids';
import { useInvestigateInTimeline } from '../../../common/hooks/timeline/use_investigate_in_timeline';
import { normalizeTimeRange } from '../../../common/utils/normalize_time_range';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { GENERIC_ENTITY_PREVIEW_BANNER } from '../../../flyout/document_details/preview/constants';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { extractTimelineCapabilities } from '../../../common/utils/timeline_capabilities';
import {
  GenericEntityPanelKey,
  EntityPanelKeyByType,
} from '../../../flyout/entity_details/shared/constants';
import { FlowTargetSourceDest } from '../../../../common/search_strategy';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { DocumentFlyoutWrapper } from '../../document/document_flyout_wrapper';
import { Network } from '../../network_details';
import { GroupedNodePreview } from './grouped_node_preview';
import { useDefaultDocumentFlyoutProperties } from '../../shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../../shared/constants/flyout_history';
import {
  noopCellActionRenderer,
  type CellActionRenderer,
} from '../../shared/components/cell_actions';

const GraphInvestigationLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({
    default: module.GraphInvestigation,
  }))
);

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

export type GraphVisualizationProps = (
  | EventGraphVisualizationProps
  | EntityGraphVisualizationProps
) & {
  height?: number | string;
  /**
   * Cell actions renderer threaded through to the document preview opened from a graph node.
   * Defaults to a no-op renderer when the component is hosted outside Flyout v2 (e.g. legacy left panel).
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Callback invoked after alert mutations inside the document preview opened from a graph node.
   */
  onAlertUpdated?: () => void;
};

/**
 * Full-screen graph investigation view for use in left-panel flyout tabs.
 * Supports two modes:
 * - 'event': driven by alert/event document IDs and timestamp (used in document details).
 * - 'entity': driven by an Entity Store entity ID (used in entity detail panels).
 */
export const GraphVisualization: React.FC<GraphVisualizationProps> = memo((props) => {
  const { scopeId, renderCellActions = noopCellActionRenderer, onAlertUpdated = noop } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const availableHeight = useFlyoutBodyAvailableHeight(wrapperRef);
  const height = props.height ?? availableHeight;
  const cssHeight = typeof height === 'number' ? `${height}px` : height;

  const { services } = useKibana();
  const {
    application: { capabilities },
    overlays,
  } = services;
  const { read: hasTimelineAccess } = extractTimelineCapabilities(capabilities);

  const toasts = useToasts();
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const oldDataView = useGetScopedSourcererDataView({
    sourcererScope: PageScope.default,
  });

  const { dataView: experimentalDataView } = useDataView(PageScope.default);
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const dataView = newDataViewPickerEnabled ? experimentalDataView : oldDataView;
  const dataViewIndexPattern = dataView ? dataView.getIndexPattern() : undefined;

  // TODO: entity and grouped-node previews are still routed through the legacy expandable
  // flyout. They render in the V1 left-panel host but no-op in Flyout v2 tools flyouts until
  // their panels are migrated to flyout_v2.
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const onOpenNetworkPreview = useCallback(
    (ip: string) => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <Network ip={ip} flowTarget={FlowTargetSourceDest.source} />,
        }),
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: 'inherit',
        }
      );
    },
    [overlays, services, store, history, historyKey, defaultDocumentFlyoutProperties]
  );

  const showEventOrAlertPreview = useCallback(
    (documentId: string, indexName?: string) => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <DocumentFlyoutWrapper
              documentId={documentId}
              indexName={indexName}
              renderCellActions={renderCellActions}
              onAlertUpdated={onAlertUpdated}
            />
          ),
        }),
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: 'inherit',
        }
      );
    },
    [
      overlays,
      services,
      store,
      history,
      renderCellActions,
      onAlertUpdated,
      defaultDocumentFlyoutProperties,
      historyKey,
    ]
  );

  // TODO: V2 entity preview panels haven't been migrated yet — entity previews still dispatch
  // through the legacy expandable-flyout API. This works in the V1 left-panel host but is a
  // silent no-op inside the Flyout v2 tools flyout. Switch to `overlays.openSystemFlyout` once
  // a V2 entity panel exists.
  const showEntityPreview = useCallback(
    (item: { id: string; entity?: NodeDocumentDataModel['entity'] }) => {
      const engineType = item.entity?.engine_type;
      const panelId =
        engineType && engineType in EntityPanelKeyByType
          ? EntityPanelKeyByType[engineType as keyof typeof EntityPanelKeyByType] ??
            GenericEntityPanelKey
          : GenericEntityPanelKey;

      if (!panelId) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.securitySolution.flyout.graph.visualization.errorInvalidEntityPanel',
            { defaultMessage: 'Unable to open entity preview' }
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
    },
    [openPreviewPanel, scopeId, toasts]
  );

  const onShowGroupedItemDetails = useCallback(
    (item: EntityOrEventItem) => {
      if (item.itemType === DOCUMENT_TYPE_ENTITY) {
        showEntityPreview({ id: item.id, entity: item.entity });
        return;
      }
      if (item.itemType === DOCUMENT_TYPE_EVENT || item.itemType === DOCUMENT_TYPE_ALERT) {
        if (!item.docId) return;
        showEventOrAlertPreview(item.docId, item.index);
      }
    },
    [showEntityPreview, showEventOrAlertPreview]
  );

  const onOpenEventPreview = useCallback(
    (node: NodeViewModel) => {
      const singleDocumentData = getSingleDocumentData(node);
      const docMode = getNodeDocumentMode(node);
      const documentsData = (node.documentsData ?? []) as NodeDocumentDataModel[];

      if ((docMode === 'single-event' || docMode === 'single-alert') && singleDocumentData) {
        showEventOrAlertPreview(singleDocumentData.id, singleDocumentData.index);
      } else if (docMode === 'single-entity' && singleDocumentData && isEntityNodeEnriched(node)) {
        showEntityPreview(singleDocumentData);
      } else if (docMode === 'grouped-entities' && documentsData.length > 0) {
        const entityItems = (node.documentsData as NodeDocumentDataModel[])
          .slice(0, MAX_DOCUMENTS_TO_LOAD)
          .flatMap((doc) =>
            doc.entity
              ? [
                  {
                    itemType: DOCUMENT_TYPE_ENTITY as typeof DOCUMENT_TYPE_ENTITY,
                    entity: doc.entity,
                    id: doc.id,
                    icon: node.icon,
                  },
                ]
              : []
          );
        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <GroupedNodePreview
                docMode="grouped-entities"
                scopeId={scopeId}
                dataViewId={dataViewIndexPattern}
                documentIds={[]}
                entityItems={entityItems}
                onShowItemDetails={onShowGroupedItemDetails}
              />
            ),
          }),
          {
            ...defaultDocumentFlyoutProperties,
            historyKey,
            session: 'inherit',
          }
        );
      } else if (docMode === 'grouped-events' && documentsData.length > 0) {
        const documentIds = (node.documentsData as NodeDocumentDataModel[])
          .slice(0, MAX_DOCUMENTS_TO_LOAD)
          .map((doc) => doc.event?.id)
          .filter((id): id is string => Boolean(id));
        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <GroupedNodePreview
                docMode="grouped-events"
                scopeId={scopeId}
                dataViewId={dataViewIndexPattern}
                documentIds={documentIds}
                entityItems={[]}
                onShowItemDetails={onShowGroupedItemDetails}
              />
            ),
          }),
          {
            ...defaultDocumentFlyoutProperties,
            historyKey,
            session: 'inherit',
          }
        );
      } else {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.securitySolution.flyout.graph.visualization.errorOpenNodePreview',
            {
              defaultMessage: 'Failed showing preview',
            }
          ),
        });
      }
    },
    [
      toasts,
      overlays,
      services,
      store,
      history,
      historyKey,
      defaultDocumentFlyoutProperties,
      scopeId,
      dataViewIndexPattern,
      showEventOrAlertPreview,
      showEntityPreview,
      onShowGroupedItemDetails,
    ]
  );

  const { investigateInTimeline } = useInvestigateInTimeline();
  const openTimelineCallback = useCallback(
    (query: Query | undefined, filters: Filter[], timeRange: TimeRange) => {
      const from = dateMath.parse(timeRange.from);
      const to = dateMath.parse(timeRange.to);

      if (!from || !to) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.securitySolution.flyout.graph.visualization.errorInvalidTimeRange',
            {
              defaultMessage: 'Invalid time range',
            }
          ),
          text: i18n.translate(
            'xpack.securitySolution.flyout.graph.visualization.errorInvalidTimeRangeDescription',
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
        height: ${cssHeight};
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
