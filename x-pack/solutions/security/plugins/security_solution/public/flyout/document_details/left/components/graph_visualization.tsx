/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { buildDataTableRecord, getFieldValue, type EsHitRecord } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useDocumentDetailsContext } from '../../shared/context';
import { useGraphPreview } from '../../../../flyout_v2/document/main/hooks/use_graph_preview';
import { GraphVisualization as SharedGraphVisualization } from '../../../shared/components/graph_visualization';
import { EventKind } from '../../../../flyout_v2/document/main/constants/event_kinds';

export { GRAPH_ID } from '../../../shared/components/graph_visualization';

/**
 * Graph visualization view displayed in the document details expandable flyout left section under the Visualize tab.
 * Reads event context from {@link useDocumentDetailsContext} and delegates rendering to the shared {@link SharedGraphVisualization}.
 */
export const GraphVisualization: React.FC = memo(() => {
  const { searchHit, scopeId } = useDocumentDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  const { eventIds, timestamp } = useGraphPreview({ hit });
  const isAlert = useMemo(
    () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
    [hit]
  );

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
