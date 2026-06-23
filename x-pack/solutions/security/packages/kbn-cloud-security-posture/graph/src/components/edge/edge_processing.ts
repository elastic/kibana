/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge } from '@xyflow/react';
import type { EdgeViewModel, NodeViewModel } from '../types';
import { isConnectorShape } from '../utils';

export interface EdgeHandleConfig {
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Resolves React Flow handle ids for graph edges and identifies return paths inside
 * stacked event groups that duplicate the forward group-to-pill route.
 */
export const getEdgeHandleConfig = (
  sourceShape: NodeViewModel['shape'],
  targetShape: NodeViewModel['shape']
): EdgeHandleConfig & { isReturnStackEdge: boolean } => {
  const isIn = !isConnectorShape(sourceShape) && targetShape === 'group';
  const isInside = sourceShape === 'group' && isConnectorShape(targetShape);
  const isOut = isConnectorShape(sourceShape) && targetShape === 'group';
  const isOutside = sourceShape === 'group' && !isConnectorShape(targetShape);

  return {
    sourceHandle: isInside ? 'inside' : isOutside ? 'outside' : undefined,
    targetHandle: isIn ? 'in' : isOut ? 'out' : undefined,
    isReturnStackEdge: isOut,
  };
};

/** Stacked connector return edges are layout-only and overlap the forward path visually. */
export const shouldRenderGraphEdge = (
  sourceShape: NodeViewModel['shape'],
  targetShape: NodeViewModel['shape']
): boolean => !getEdgeHandleConfig(sourceShape, targetShape).isReturnStackEdge;

export const mapEdgeViewModelToReactFlowEdge = (
  edgeData: EdgeViewModel,
  nodesById: Record<string, NodeViewModel>
): Edge<EdgeViewModel> | null => {
  const sourceNode = nodesById[edgeData.source];
  const targetNode = nodesById[edgeData.target];

  if (!sourceNode || !targetNode) {
    return null;
  }

  const sourceShape = sourceNode.shape;
  const targetShape = targetNode.shape;

  if (!shouldRenderGraphEdge(sourceShape, targetShape)) {
    return null;
  }

  const { sourceHandle, targetHandle } = getEdgeHandleConfig(sourceShape, targetShape);

  return {
    id: edgeData.id,
    type: 'default',
    source: edgeData.source,
    sourceHandle,
    target: edgeData.target,
    targetHandle,
    focusable: false,
    selectable: false,
    deletable: false,
    data: {
      ...edgeData,
      sourceShape,
      sourceColor: sourceNode.color,
      targetShape,
      targetColor: targetNode.color,
    },
  };
};
