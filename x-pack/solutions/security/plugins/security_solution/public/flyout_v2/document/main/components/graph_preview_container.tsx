/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { getFieldValue, type DataTableRecord } from '@kbn/discover-utils';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import {
  GraphPreviewPanel,
  type GraphPreviewPanelProps,
} from '../../../shared/components/graph_preview_panel';
import { useGraphPreview } from '../hooks/use_graph_preview';
import { EventKind } from '../constants/event_kinds';

export interface GraphPreviewContainerProps
  extends Pick<GraphPreviewPanelProps, 'onShowGraph' | 'showIcon' | 'disableNavigation'> {
  hit: DataTableRecord;
}

export const GraphPreviewContainer = memo(
  ({ hit, onShowGraph, showIcon, disableNavigation }: GraphPreviewContainerProps) => {
    const { eventIds, timestamp, shouldShowGraph } = useGraphPreview({ hit });
    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );
    const anchor = useMemo(() => timestamp ?? new Date().toISOString(), [timestamp]);

    const { isLoading, isError, data } = useFetchGraphData({
      req: {
        query: {
          originEventIds: eventIds.map((id) => ({ id, isAlert })),
          start: `${anchor}||-30m`,
          end: `${anchor}||+30m`,
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
      />
    );
  }
);

GraphPreviewContainer.displayName = 'GraphPreviewContainer';
