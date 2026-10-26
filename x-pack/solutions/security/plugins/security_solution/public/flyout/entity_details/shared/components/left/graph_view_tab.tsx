/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  GraphGroupedNodePreviewPanelKey,
  GROUP_PREVIEW_BANNER,
  NETWORK_PREVIEW_BANNER,
  type GraphGroupedNodePreviewPanelProps,
} from '@kbn/cloud-security-posture-graph';
import { GraphVisualization } from '../../../../../flyout_v2/document/tools/graph/components/graph_visualization';
import { DocumentDetailsPreviewPanelKey } from '../../../../document_details/shared/constants/panel_keys';
import { buildEntityPreviewPanel } from '../../utils/build_entity_preview_panel';
import {
  ALERT_PREVIEW_BANNER,
  EVENT_PREVIEW_BANNER,
} from '../../../../document_details/preview/constants';
import { FlowTargetSourceDest } from '../../../../../../common/search_strategy';

export interface GraphViewTabProps {
  /** Entity Store v2 entity ID (`entity.id`) to center the graph on */
  entityId: string;
  /** Scope ID for the flyout panel */
  scopeId: string;
}

/**
 * Graph view tab content for entity detail left panels. Renders the shared {@link GraphVisualization}
 * centered on the given entity, supplying the node-click handlers that open previews via the legacy
 * expandable flyout API.
 */
export const GraphViewTab: FC<GraphViewTabProps> = memo(({ entityId, scopeId }) => {
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
    <GraphVisualization
      mode="entity"
      entityId={entityId}
      scopeId={scopeId}
      onShowDocument={onShowDocument}
      onShowEntity={onShowEntity}
      onShowGrouped={onShowGrouped}
      onShowNetwork={onShowNetwork}
    />
  );
});

GraphViewTab.displayName = 'GraphViewTab';
