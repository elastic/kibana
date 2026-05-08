/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { GraphPreviewContainer as SharedGraphPreviewContainer } from '../../../flyout/shared/components/graph_preview_container';
import { useGraphPreviewData } from '../../graph/hooks/use_graph_preview_data';

export interface GraphPreviewContainerProps {
  /**
   * Document to render the graph preview for.
   */
  hit: DataTableRecord;
  /**
   * Callback invoked when the user expands the preview into the Graph tools flyout.
   */
  onShowGraph: () => void;
}

/**
 * Flyout v2 wrapper around the shared graph preview container. Reads graph parameters from
 * the document `hit` and forwards them in 'event' mode.
 */
export const GraphPreviewContainer = memo(({ hit, onShowGraph }: GraphPreviewContainerProps) => {
  const { eventIds, timestamp, isAlert, shouldShowGraph } = useGraphPreviewData(hit);

  return (
    <SharedGraphPreviewContainer
      mode="event"
      shouldShowGraph={shouldShowGraph}
      isAlert={isAlert}
      timestamp={timestamp ?? new Date().toISOString()}
      eventIds={eventIds}
      indexName={hit.raw._index}
      isPreviewMode={false}
      isRulePreview={false}
      onExpandGraph={onShowGraph}
    />
  );
});

GraphPreviewContainer.displayName = 'GraphPreviewContainer';
