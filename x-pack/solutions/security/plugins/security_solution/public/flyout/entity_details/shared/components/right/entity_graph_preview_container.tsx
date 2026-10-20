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
import { getScopeFlyoutTimeRange } from '../../../../../entity_analytics/common/scope_time_ranges';

const DEFAULT_PREVIEW_TIME_RANGE = { from: 'now-30d', to: 'now' } as const;

export interface EntityGraphPreviewContainerProps
  extends Pick<GraphPreviewPanelProps, 'onShowGraph' | 'showIcon'> {
  /** Entity Store v2 entity ID (`entity.id`) to center the graph preview on. */
  entityId: string;
  /** Scope the flyout was opened from; a scope that pins a time range replaces the 30-day default. */
  scopeId?: string;
}

export const EntityGraphPreviewContainer = memo(
  ({ entityId, scopeId, onShowGraph, showIcon }: EntityGraphPreviewContainerProps) => {
    const shouldShowGraph = useShouldShowGraph();
    const timeRange = getScopeFlyoutTimeRange(scopeId) ?? DEFAULT_PREVIEW_TIME_RANGE;

    const { isLoading, isError, data } = useFetchGraphData({
      req: {
        query: {
          entityIds: [{ id: entityId, isOrigin: true }],
          start: timeRange.from,
          end: timeRange.to,
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
        shouldShowGraph={shouldShowGraph}
        isLoading={isLoading}
        isError={isError}
        data={data}
      />
    );
  }
);

EntityGraphPreviewContainer.displayName = 'EntityGraphPreviewContainer';
