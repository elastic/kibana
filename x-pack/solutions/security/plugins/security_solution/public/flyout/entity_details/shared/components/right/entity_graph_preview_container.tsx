/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  GraphPreviewPanel,
  type GraphPreviewPanelProps,
} from '../../../../../flyout_v2/shared/components/graph_preview_panel';
import { useShouldShowGraph } from '../../../../shared/hooks/use_should_show_graph';
import { useActiveFaceliftVersion } from '../../../../../entity_analytics/components/home/facelift/active_version';

const EMPTY_GRAPH = { nodes: [], edges: [] };

export interface EntityGraphPreviewContainerProps
  extends Pick<GraphPreviewPanelProps, 'onShowGraph' | 'showIcon'> {
  /** Entity Store v2 entity ID (`entity.id`) to center the graph preview on. */
  entityId: string;
}

export const EntityGraphPreviewContainer = memo(
  ({ entityId, onShowGraph, showIcon }: EntityGraphPreviewContainerProps) => {
    const graphAvailable = useShouldShowGraph();
    // Prototype v.8 keeps the section visible with the existing empty state
    // when the graph feature (license / entity store) is not available.
    const [faceliftVersion] = useActiveFaceliftVersion();
    const showEmptyState = faceliftVersion === 'v8' && !graphAvailable;

    const { isLoading, isError, data } = useFetchGraphData({
      req: {
        query: {
          entityIds: [{ id: entityId, isOrigin: true }],
          start: 'now-30d',
          end: 'now',
        },
      },
      options: {
        enabled: graphAvailable,
        refetchOnWindowFocus: false,
      },
    });

    return (
      <GraphPreviewPanel
        onShowGraph={onShowGraph}
        showIcon={showIcon}
        shouldShowGraph={graphAvailable || showEmptyState}
        isLoading={showEmptyState ? false : isLoading}
        isError={showEmptyState ? false : isError}
        data={showEmptyState ? EMPTY_GRAPH : data}
      />
    );
  }
);

EntityGraphPreviewContainer.displayName = 'EntityGraphPreviewContainer';
