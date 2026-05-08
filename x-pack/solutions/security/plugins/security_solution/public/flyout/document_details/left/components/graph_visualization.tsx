/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { useDocumentDetailsContext } from '../../shared/context';
import { useGraphPreview } from '../../../../flyout_v2/document/hooks/use_graph_preview';
import { GraphVisualization as SharedGraphVisualization } from '../../../../flyout_v2/graph/components/graph_visualization';

export { GRAPH_ID } from '../../../../flyout_v2/graph/components/graph_visualization';

/**
 * Graph visualization view displayed in the document details expandable flyout left section under the Visualize tab.
 * Reads event context from {@link useDocumentDetailsContext} and delegates rendering to the shared {@link SharedGraphVisualization}.
 */
export const GraphVisualization: React.FC = memo(() => {
  const { searchHit, scopeId } = useDocumentDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  const { eventIds, timestamp, isAlert } = useGraphPreview(hit);

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
