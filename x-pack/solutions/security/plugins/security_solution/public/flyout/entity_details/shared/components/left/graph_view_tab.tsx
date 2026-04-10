/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { GraphVisualization } from '../../../../shared/components/graph_visualization';

const EXPANDABLE_FLYOUT_LEFT_SECTION_HEADER_HEIGHT = 72;
const VISUALIZE_WRAPPER_PADDING = 16;
const VISUALIZE_BUTTON_GROUP_HEIGHT = 32;
const EUI_SPACER_HEIGHT = 16;

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
  const height =
    window.innerHeight -
    EXPANDABLE_FLYOUT_LEFT_SECTION_HEADER_HEIGHT -
    2 * VISUALIZE_WRAPPER_PADDING -
    VISUALIZE_BUTTON_GROUP_HEIGHT -
    EUI_SPACER_HEIGHT;
  return (
    <GraphVisualization
      mode="entity"
      entityId={entityId}
      scopeId={scopeId}
      height={`${height}px`}
    />
  );
});

GraphViewTab.displayName = 'GraphViewTab';
