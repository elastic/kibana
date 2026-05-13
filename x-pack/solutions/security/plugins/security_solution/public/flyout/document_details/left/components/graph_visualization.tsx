/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useDocumentDetailsContext } from '../../shared/context';
import { useGraphPreview } from '../../shared/hooks/use_graph_preview';
import { GraphVisualization as SharedGraphVisualization } from '../../../shared/components/graph_visualization';

export { GRAPH_ID } from '../../../shared/components/graph_visualization';

/**
 * Graph visualization view displayed in the document details expandable flyout left section under the Visualize tab.
 * Reads event context from {@link useDocumentDetailsContext} and delegates rendering to the shared {@link SharedGraphVisualization}.
 */
export const GraphVisualization: React.FC = memo(() => {
  const { getFieldsData, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId } =
    useDocumentDetailsContext();
  const { eventIds, timestamp, isAlert } = useGraphPreview({
    getFieldsData,
    ecsData: dataAsNestedObject,
    dataFormattedForFieldBrowser,
  });

  return (
    <SharedGraphVisualization
      mode="event"
      scopeId={scopeId}
      eventIds={eventIds}
      timestamp={timestamp ?? new Date().toISOString()}
      isAlert={isAlert}
    />
  );
});

GraphVisualization.displayName = 'GraphVisualization';
