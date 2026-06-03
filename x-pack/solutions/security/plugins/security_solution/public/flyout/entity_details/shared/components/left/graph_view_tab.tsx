/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { GraphVisualization } from '../../../../shared/components/graph_visualization';

export interface GraphViewTabProps {
  /** Entity Store v2 entity ID (`entity.id`) to center the graph on */
  entityId: string;
  /** Scope ID for the flyout panel */
  scopeId: string;
}

/**
 * Graph view tab content for entity detail left panels.
 * Renders the full graph investigation view centered on the given entity.
 */
export const GraphViewTab: FC<GraphViewTabProps> = memo(({ entityId, scopeId }) => {
  return <GraphVisualization mode="entity" entityId={entityId} scopeId={scopeId} />;
});

GraphViewTab.displayName = 'GraphViewTab';
