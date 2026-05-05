/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';

export const SOURCE_NODE_WIDTH = 200;
export const SOURCE_NODE_HEIGHT = 72;
export const TRANSFORM_NODE_WIDTH = 48;
export const TRANSFORM_NODE_HEIGHT = 48;
export const DESTINATION_NODE_WIDTH = 200;
export const DESTINATION_NODE_HEIGHT = 60;
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 72;
const RANK_SEP = 100;
const NODE_SEP = 20;
const MARGIN = 40;

const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  source: { width: SOURCE_NODE_WIDTH, height: SOURCE_NODE_HEIGHT },
  transform: { width: TRANSFORM_NODE_WIDTH, height: TRANSFORM_NODE_HEIGHT },
  destination: { width: DESTINATION_NODE_WIDTH, height: DESTINATION_NODE_HEIGHT },
};

export const applyDagreLayout = <T extends Node>(nodes: T[], edges: Edge[]): T[] => {
  if (nodes.length === 0) return nodes;

  const g = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: 'LR',
      ranksep: RANK_SEP,
      nodesep: NODE_SEP,
      marginx: MARGIN,
      marginy: MARGIN,
    })
    .setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    const dims = NODE_DIMENSIONS[node.type ?? ''] ?? {
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    };
    g.setNode(node.id, { width: dims.width, height: dims.height });
  });

  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  Dagre.layout(g);

  return nodes.map((node) => {
    const dims = NODE_DIMENSIONS[node.type ?? ''] ?? {
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    };
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;
    return {
      ...node,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: {
        x: Math.round(dagreNode.x - dims.width / 2),
        y: Math.round(dagreNode.y - dims.height / 2),
      },
    };
  });
};
