/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import {
  getNodeDocumentMode,
  getSingleDocumentData,
  type GraphGroupedNodePreviewPanelProps,
  type NodeViewModel,
} from '@kbn/cloud-security-posture-graph';
import {
  type EntityDocumentDataModel,
  type NodeDocumentDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/v1';
import {
  DOCUMENT_TYPE_ENTITY,
  PROJECT_ROUTING_ALL,
  PROJECT_ROUTING_ORIGIN,
  type ProjectRouting,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { isEntityNodeEnriched } from '@kbn/cloud-security-posture-graph/src/components/utils';
import { useFlyoutBodyAvailableHeight } from '../hooks/use_flyout_body_available_height';
import { PageScope } from '../../../../../data_view_manager/constants';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import { PREFIX } from '../../../../../flyout/shared/test_ids';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { normalizeTimeRange } from '../../../../../common/utils/normalize_time_range';
import { useKibana, useToasts } from '../../../../../common/lib/kibana';
import { extractTimelineCapabilities } from '../../../../../common/utils/timeline_capabilities';

const GraphInvestigationLazy = React.lazy(() =>
  import('@kbn/cloud-security-posture-graph').then((module) => ({
    default: module.GraphInvestigation,
  }))
);

export const GRAPH_VISUALIZATION_TEST_ID = `${PREFIX}GraphVisualization` as const;
export const GRAPH_ID = 'graph-visualization' as const;

const MAX_DOCUMENTS_TO_LOAD = 50;

/**
 * Node-click callbacks. This component interprets the clicked node and routes it to the
 * appropriate callback; the consumer owns how each preview is opened (the flyout v2 system flyout,
 * or the legacy expandable flyout). This component does not open any flyout itself.
 */
interface GraphNodeCallbacks {
  /**
   * Open a single document (event or alert) preview. The optional `isEvent` lets banner-aware
   * consumers pick the banner; consumers that don't need it (e.g. the flyout v2 system flyout,
   * which opens the full document view) simply omit the parameter.
   */
  onShowDocument: (id: string, indexName?: string, isEvent?: boolean) => void;
  /** Open an entity (host/user/service/generic) preview. */
  onShowEntity: (params: {
    engineType: string | undefined;
    entityId: string;
    entityName: string | undefined;
  }) => void;
  /** Open a grouped-entities or grouped-events preview. */
  onShowGrouped: (
    params: Omit<
      GraphGroupedNodePreviewPanelProps,
      'scopeId' | 'showLoadingState' | 'onShowDocument' | 'onShowEntity'
    >
  ) => void;
  /**
   * Open a network (IP) preview.
   * Note: `GraphInvestigation` does not expose flow direction — callers always receive the source IP.
   */
  onShowNetwork: (ip: string) => void;
}

/** Props for event/alert mode — drives the graph from an alert/event document */
interface EventGraphVisualizationProps extends GraphNodeCallbacks {
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
interface EntityGraphVisualizationProps extends GraphNodeCallbacks {
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
  const { scopeId, onShowDocument, onShowEntity, onShowGrouped, onShowNetwork } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const height = useFlyoutBodyAvailableHeight(wrapperRef);

  const {
    application: { capabilities },
    cps,
  } = useKibana().services;
  const { read: hasTimelineAccess } = extractTimelineCapabilities(capabilities);

  // CPS project routing for cross-project events. Security pages do not host a CPS
  // picker — routing is locked to the active space NPRE (see kfirpeled comment on
  // security-team#16998). Read the space's default routing rather than the picker
  // observable (which is gated by per-app `ProjectRoutingAccess` and returns
  // undefined when no app has registered the route as READONLY/EDITABLE).
  const [projectRouting, setProjectRouting] = useState<ProjectRouting | undefined>(undefined);
  useEffect(() => {
    const manager = cps?.cpsManager;
    if (!manager) return;
    let cancelled = false;
    manager.whenReady().then(() => {
      if (cancelled) return;
      const routing = manager.getDefaultProjectRouting();
      setProjectRouting(
        routing === PROJECT_ROUTING_ALL || routing === PROJECT_ROUTING_ORIGIN ? routing : undefined
      );
    });
    return () => {
      cancelled = true;
    };
  }, [cps?.cpsManager]);

  const toasts = useToasts();

  const { dataView, status } = useDataView(PageScope.default);
  const dataViewIndexPattern = dataView ? dataView.getIndexPattern() : undefined;

  // Interpret the clicked node and route it to the appropriate consumer-provided preview opener.
  const onOpenEventPreview = useCallback(
    (node: NodeViewModel) => {
      const singleDocumentData = getSingleDocumentData(node);
      const docMode = getNodeDocumentMode(node);
      const documentsData = (node.documentsData ?? []) as NodeDocumentDataModel[];

      if ((docMode === 'single-event' || docMode === 'single-alert') && singleDocumentData) {
        onShowDocument(singleDocumentData.id, singleDocumentData.index, docMode === 'single-event');
      } else if (docMode === 'single-entity' && singleDocumentData && isEntityNodeEnriched(node)) {
        onShowEntity({
          engineType: singleDocumentData.entity?.engine_type,
          entityId: singleDocumentData.id,
          entityName: singleDocumentData.entity?.name,
        });
      } else if (docMode === 'grouped-entities' && documentsData.length > 0) {
        const entityItems = documentsData
          .slice(0, MAX_DOCUMENTS_TO_LOAD)
          .filter(
            (doc): doc is NodeDocumentDataModel & { entity: EntityDocumentDataModel } =>
              doc.entity !== undefined
          )
          .map((doc) => ({
            itemType: DOCUMENT_TYPE_ENTITY,
            entity: doc.entity,
            id: doc.id,
            icon: node.icon,
          }));
        onShowGrouped({ docMode, entityItems, documentIds: [], dataViewId: undefined });
      } else if (docMode === 'grouped-events' && documentsData.length > 0) {
        const documentIds = documentsData
          .slice(0, MAX_DOCUMENTS_TO_LOAD)
          .map((doc) => doc.event?.id)
          .filter((id): id is string => id !== undefined);
        onShowGrouped({
          docMode,
          documentIds,
          dataViewId: dataViewIndexPattern,
          entityItems: [],
        });
      } else {
        toasts.addDanger({
          title: i18n.translate('xpack.securitySolution.flyout.graph.errorOpenNodePreview', {
            defaultMessage: 'Failed showing preview',
          }),
        });
      }
    },
    [onShowDocument, onShowEntity, onShowGrouped, dataViewIndexPattern, toasts]
  );

  const { investigateInTimeline } = useInvestigateInTimeline();
  const openTimelineCallback = useCallback(
    (query: Query | undefined, filters: Filter[], timeRange: TimeRange) => {
      const from = dateMath.parse(timeRange.from);
      const to = dateMath.parse(timeRange.to);

      if (!from || !to) {
        toasts.addDanger({
          title: i18n.translate('xpack.securitySolution.flyout.graph.errorInvalidTimeRange', {
            defaultMessage: 'Invalid time range',
          }),
          text: i18n.translate(
            'xpack.securitySolution.flyout.graph.errorInvalidTimeRangeDescription',
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
      {status === 'ready' && (
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
                    projectRouting,
                  }
                : {
                    dataView,
                    entityIds: [{ id: props.entityId, isOrigin: true }],
                    timeRange: {
                      from: 'now-30d',
                      to: 'now',
                    },
                    projectRouting,
                  }
            }
            showInvestigateInTimeline={hasTimelineAccess}
            showToggleSearch={true}
            onInvestigateInTimeline={openTimelineCallback}
            onOpenEventPreview={onOpenEventPreview}
            onOpenNetworkPreview={onShowNetwork}
          />
        </React.Suspense>
      )}
    </div>
  );
});

GraphVisualization.displayName = 'GraphVisualization';
