/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { buildDataTableRecord, getFieldValue, type EsHitRecord } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  GraphGroupedNodePreviewPanelKey,
  GROUP_PREVIEW_BANNER,
  NETWORK_PREVIEW_BANNER,
  type GraphGroupedNodePreviewPanelProps,
} from '@kbn/cloud-security-posture-graph';
import { useDocumentDetailsContext } from '../../shared/context';
import { useGraphPreview } from '../../../../flyout_v2/document/main/hooks/use_graph_preview';
import { GraphVisualization as SharedGraphVisualization } from '../../../../flyout_v2/document/tools/graph/components/graph_visualization';
import { EventKind } from '../../../../flyout_v2/document/main/constants/event_kinds';
import { DocumentDetailsPreviewPanelKey } from '../../shared/constants/panel_keys';
import { buildEntityPreviewPanel } from '../../../entity_details/shared/utils/build_entity_preview_panel';
import { ALERT_PREVIEW_BANNER, EVENT_PREVIEW_BANNER } from '../../preview/constants';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy';

export { GRAPH_ID } from '../../../../flyout_v2/document/tools/graph/components/graph_visualization';

/**
 * Graph visualization view displayed in the document details expandable flyout left section under the
 * Visualize tab. Reads event context from {@link useDocumentDetailsContext} and renders the shared
 * {@link SharedGraphVisualization}, supplying the node-click handlers that open previews via the
 * legacy expandable flyout API.
 */
export const GraphVisualization: React.FC = memo(() => {
  const { searchHit, scopeId } = useDocumentDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  const { eventIds, timestamp } = useGraphPreview({ hit });
  const isAlert = useMemo(
    () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
    [hit]
  );

  const { openPreviewPanel } = useExpandableFlyoutApi();

  const onShowDocument = useCallback(
    (id: string, indexName?: string, isEvent?: boolean) => {
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        params: {
          id,
          indexName,
          scopeId,
          banner: isEvent ? EVENT_PREVIEW_BANNER : ALERT_PREVIEW_BANNER,
          isPreviewMode: true,
        },
      });
    },
    [openPreviewPanel, scopeId]
  );

  const onShowEntity = useCallback(
    (entity: {
      engineType: string | undefined;
      entityId: string;
      entityName: string | undefined;
    }) => {
      const panel = buildEntityPreviewPanel({ ...entity, scopeId });
      if (panel) {
        openPreviewPanel(panel);
      }
    },
    [openPreviewPanel, scopeId]
  );

  const onShowGrouped = useCallback(
    (
      params: Omit<
        GraphGroupedNodePreviewPanelProps,
        'scopeId' | 'showLoadingState' | 'onShowDocument' | 'onShowEntity'
      >
    ) => {
      openPreviewPanel({
        id: GraphGroupedNodePreviewPanelKey,
        params: { scopeId, isPreviewMode: true, banner: GROUP_PREVIEW_BANNER, ...params },
      });
    },
    [openPreviewPanel, scopeId]
  );

  const onShowNetwork = useCallback(
    (ip: string) => {
      openPreviewPanel({
        id: 'network-preview',
        params: {
          ip,
          scopeId,
          flowTarget: FlowTargetSourceDest.source,
          banner: NETWORK_PREVIEW_BANNER,
          isPreviewMode: true,
        },
      });
    },
    [openPreviewPanel, scopeId]
  );

  return (
    <SharedGraphVisualization
      mode="event"
      scopeId={scopeId}
      eventIds={eventIds}
      timestamp={timestamp ?? new Date().toISOString()}
      isAlert={isAlert}
      onShowDocument={onShowDocument}
      onShowEntity={onShowEntity}
      onShowGrouped={onShowGrouped}
      onShowNetwork={onShowNetwork}
    />
  );
});

GraphVisualization.displayName = 'GraphVisualization';
