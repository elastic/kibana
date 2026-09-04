/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';

// Default fallback dimensions — actual values are set per node type in service_map.tsx.
const DEFAULT_NODE_WIDTH = 140;
const DEFAULT_NODE_HEIGHT = 140;
const RANK_SEPARATION = 160;
const NODE_SEPARATION = 60;
const GRAPH_MARGIN = 50;

/** Left-to-right dagre layout. Returns a new nodes array with x/y positions set.
 *  Reads each node's width/height when set so different node types are spaced correctly. */
export const applyDagreLayout = (nodes: Node[], edges: Edge[]): Node[] => {
  if (nodes.length === 0) return nodes;

  const g = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: 'LR',
      ranksep: RANK_SEPARATION,
      nodesep: NODE_SEPARATION,
      marginx: GRAPH_MARGIN,
      marginy: GRAPH_MARGIN,
    })
    .setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    const w = node.width ?? DEFAULT_NODE_WIDTH;
    const h = node.height ?? DEFAULT_NODE_HEIGHT;
    g.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  Dagre.layout(g);

  // Dagre gives centre coordinates; ReactFlow expects top-left origin.
  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    const w = node.width ?? DEFAULT_NODE_WIDTH;
    const h = node.height ?? DEFAULT_NODE_HEIGHT;
    return {
      ...node,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: dagreNode ? { x: dagreNode.x - w / 2, y: dagreNode.y - h / 2 } : node.position,
    };
  });
};
