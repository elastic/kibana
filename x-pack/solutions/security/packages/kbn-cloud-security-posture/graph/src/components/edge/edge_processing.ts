/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge } from '@xyflow/react';
import type { EdgeViewModel, NodeViewModel } from '../types';
import { isConnectorShape } from '../utils';
import { GRAPH_ORIGIN_EDGE_CLASS, isOriginEntityOrEventNode } from '../graph/graph_origin_utils';

export type GraphEdgeRenderColor = 'danger' | 'subdued';

type EdgeColorContext = Pick<EdgeViewModel, 'color'> & {
  sourceShape?: NodeViewModel['shape'];
  targetShape?: NodeViewModel['shape'];
  sourceColor?: NodeViewModel['color'];
  targetColor?: NodeViewModel['color'];
};

/** Danger when touching an alert/action label node; otherwise subdued. */
export const getGraphEdgeRenderColor = (data?: EdgeColorContext): GraphEdgeRenderColor => {
  if (data?.color === 'danger') {
    return 'danger';
  }

  const touchesDangerLabel =
    (data?.sourceShape === 'label' && data?.sourceColor === 'danger') ||
    (data?.targetShape === 'label' && data?.targetColor === 'danger');

  return touchesDangerLabel ? 'danger' : 'subdued';
};

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

const isOriginPathEdge = (sourceNode: NodeViewModel, targetNode: NodeViewModel): boolean => {
  if (isOriginEntityOrEventNode(sourceNode) || isOriginEntityOrEventNode(targetNode)) {
    return true;
  }

  // Relationship connectors marked as origin (spine path from starting entities).
  return Boolean(
    ('isOrigin' in sourceNode && sourceNode.isOrigin) ||
      ('isOrigin' in targetNode && targetNode.isOrigin)
  );
};

export const mapEdgeViewModelToReactFlowEdge = (
  edgeData: EdgeViewModel,
  nodesById: Record<string, NodeViewModel>,
  highlightOriginsOnly = false
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
  const isOriginHighlightEdge = highlightOriginsOnly && isOriginPathEdge(sourceNode, targetNode);

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
    className: isOriginHighlightEdge ? GRAPH_ORIGIN_EDGE_CLASS : undefined,
    data: {
      ...edgeData,
      sourceShape,
      sourceColor: sourceNode.color,
      targetShape,
      targetColor: targetNode.color,
      isOriginHighlightEdge,
      // Default true; {@link assignBundleArrowLeaders} clears siblings.
      showArrowHead: true,
    },
  };
};

type GraphRfEdge = Edge<
  EdgeViewModel & {
    sourceShape?: NodeViewModel['shape'];
    targetShape?: NodeViewModel['shape'];
    showArrowHead?: boolean;
  }
>;

/**
 * When several edges share a target handle (entity or group), pick one leader:
 * - leader draws the final stem (+ arrow tip on entities)
 * - siblings set `showArrowHead: false` so DefaultEdge truncates at the trunk join
 */
export const assignBundleArrowLeaders = <T extends GraphRfEdge>(edges: T[]): T[] => {
  const byTarget = new Map<string, T[]>();

  edges.forEach((edge) => {
    const targetShape = edge.data?.targetShape;
    // Connectors never receive a stem tip / bundle endpoint.
    if (!targetShape || isConnectorShape(targetShape)) {
      return;
    }
    const key = `${edge.target}::${edge.targetHandle ?? 'in'}`;
    const group = byTarget.get(key);
    if (group) {
      group.push(edge);
    } else {
      byTarget.set(key, [edge]);
    }
  });

  const leaderIds = new Set<string>();
  byTarget.forEach((group) => {
    if (group.length === 0) return;
    // Prefer a middle source so the leader is the visual “trunk” of the fan.
    const leader = group[Math.floor((group.length - 1) / 2)];
    leaderIds.add(leader.id);
  });

  return edges.map((edge) => {
    const targetShape = edge.data?.targetShape;
    if (!targetShape || isConnectorShape(targetShape)) {
      return edge;
    }
    const key = `${edge.target}::${edge.targetHandle ?? 'in'}`;
    if (!byTarget.has(key) || (byTarget.get(key)?.length ?? 0) <= 1) {
      return edge;
    }
    return {
      ...edge,
      data: {
        ...edge.data,
        showArrowHead: leaderIds.has(edge.id),
      },
    };
  });
};
