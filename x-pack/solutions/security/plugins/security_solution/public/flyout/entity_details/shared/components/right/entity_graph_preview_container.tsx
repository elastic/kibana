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

export interface EntityGraphPreviewContainerProps
  extends Pick<GraphPreviewPanelProps, 'onShowGraph' | 'showIcon' | 'disableNavigation'> {
  /** Entity Store v2 entity ID (`entity.id`) to center the graph preview on. */
  entityId: string;
  /**
   * Flyout Entity risk score (`calculated_score_norm`).
   * `null` = Unknown / missing (preview must not show a mock Critical badge).
   * `undefined` = not provided (fall back to graph node data).
   */
  originRiskScore?: number | null;
}

export const EntityGraphPreviewContainer = memo(
  ({
    entityId,
    onShowGraph,
    showIcon,
    disableNavigation,
    originRiskScore,
  }: EntityGraphPreviewContainerProps) => {
    const shouldShowGraph = useShouldShowGraph();

    const { isLoading, isError, data } = useFetchGraphData({
      req: {
        query: {
          entityIds: [{ id: entityId, isOrigin: true }],
          start: 'now-30d',
          end: 'now',
        },
      },
      options: {
        enabled: shouldShowGraph,
        refetchOnWindowFocus: false,
      },
    });

    return (
      <GraphPreviewPanel
        onShowGraph={onShowGraph}
        showIcon={showIcon}
        disableNavigation={disableNavigation}
        shouldShowGraph={shouldShowGraph}
        isLoading={isLoading}
        isError={isError}
        data={data}
        originEntityId={entityId}
        originRiskScore={originRiskScore}
      />
    );
  }
);

EntityGraphPreviewContainer.displayName = 'EntityGraphPreviewContainer';
