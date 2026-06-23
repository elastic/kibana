/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { EdgeViewModel, NodeViewModel } from '../types';
import { isEntityNode, isRelationshipNode, isStackNode } from '../utils';
import { isOriginEntityOrEventNode } from './graph_origin_utils';
import { GRID_SIZE, NODE_HEIGHT, NODE_LABEL_HEIGHT } from '../constants';

const GRID_SIZE_OFFSET = GRID_SIZE * 2;

/** Dagre minimum separation between nodes in the same rank (vertical gaps in LR layout). */
const GRAPH_NODE_SEP = GRID_SIZE_OFFSET * 10;

export interface LayoutEdge {
  source: string;
  target: string;
}

/** Structural nodes that belong on the origin investigation spine (not expanded entities). */
export const isOriginSpineConnector = (node: NodeViewModel): boolean => {
  if (isStackNode(node)) {
    return true;
  }

  if (isRelationshipNode(node)) {
    return Boolean(node.isOrigin);
  }

  return isOriginEntityOrEventNode(node);
};

const isOriginSpineSeed = (node: NodeViewModel): boolean => {
  if (isRelationshipNode(node)) {
    return Boolean(node.isOrigin);
  }

  return isOriginEntityOrEventNode(node);
};

/** Collects origin entities/events plus connectors and groups on paths between them. */
export const collectOriginSpineNodeIds = (
  nodesById: Record<string, Node<NodeViewModel>>,
  layoutEdges: LayoutEdge[],
  stackedNodeIds: Set<string>
): Set<string> => {
  const seeds = new Set<string>();

  for (const node of Object.values(nodesById)) {
    if (!node.parentId && isOriginSpineSeed(node.data)) {
      seeds.add(node.id);
    }
  }

  if (seeds.size === 0) {
    return seeds;
  }

  const spine = new Set(seeds);
  let changed = true;

  while (changed) {
    changed = false;

    for (const { source, target } of layoutEdges) {
      const spineEndpoint = spine.has(source) ? source : spine.has(target) ? target : undefined;

      if (!spineEndpoint) {
        // Not connected to the spine yet.
      } else {
        const candidate = source === spineEndpoint ? target : source;

        if (!spine.has(candidate) && !stackedNodeIds.has(candidate)) {
          const candidateNode = nodesById[candidate];

          if (candidateNode && !candidateNode.parentId) {
            const candidateData = candidateNode.data;
            const isExpandedEntity =
              isEntityNode(candidateData) && !isOriginEntityOrEventNode(candidateData);

            if (!isExpandedEntity && isOriginSpineConnector(candidateData)) {
              spine.add(candidate);
              changed = true;
            }
          }
        }
      }
    }
  }

  return spine;
};

const snapped = (value: number): number => Math.round(value / GRID_SIZE_OFFSET) * GRID_SIZE_OFFSET;

const getNodeCenterY = (g: Dagre.graphlib.Graph, nodeId: string): number =>
  (g.node(nodeId) as Dagre.Node).y;

const getNodeHeight = (g: Dagre.graphlib.Graph, nodeId: string): number =>
  (g.node(nodeId) as Dagre.Node).height ?? NODE_HEIGHT;

const setNodeCenterY = (g: Dagre.graphlib.Graph, nodeId: string, y: number): void => {
  (g.node(nodeId) as Dagre.Node).y = y;
};

const distributeNonSpineNodesAtRank = (
  g: Dagre.graphlib.Graph,
  nodeIds: string[],
  spineIds: Set<string>,
  spineY: number
): void => {
  const nonSpineInRank = nodeIds.filter((nodeId) => !spineIds.has(nodeId));

  if (nonSpineInRank.length === 0) {
    return;
  }

  const sorted = [...nonSpineInRank].sort((a, b) => getNodeCenterY(g, a) - getNodeCenterY(g, b));

  sorted.forEach((nodeId, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    const slot = Math.floor(index / 2) + 1;
    const spacing = getNodeHeight(g, nodeId) + GRAPH_NODE_SEP;
    const newY = spineY + direction * slot * spacing;

    setNodeCenterY(g, nodeId, snapped(newY));
  });
};

const pushNonSpineNodesAwayFromSpine = (
  g: Dagre.graphlib.Graph,
  nodeIds: string[],
  spineIds: Set<string>,
  spineY: number
): void => {
  const spineHalfBand =
    Math.max(...[...spineIds].map((nodeId) => getNodeHeight(g, nodeId))) / 2 + GRAPH_NODE_SEP / 2;

  for (const nodeId of nodeIds) {
    if (!spineIds.has(nodeId)) {
      const currentY = getNodeCenterY(g, nodeId);

      if (Math.abs(currentY - spineY) < spineHalfBand) {
        const direction = currentY >= spineY ? 1 : -1;
        const offset = spineHalfBand + getNodeHeight(g, nodeId) / 2;

        setNodeCenterY(g, nodeId, snapped(spineY + direction * offset));
      }
    }
  }
};

/**
 * Aligns the origin investigation path on a single horizontal spine, then fans
 * non-origin nodes above and below it at each rank.
 */
export const alignOriginSpineInPlace = (
  g: Dagre.graphlib.Graph,
  nodesById: Record<string, Node<NodeViewModel>>,
  edges: Array<Edge<EdgeViewModel>>,
  stackedNodeIds: Set<string>,
  filter: (nodeId: string) => boolean
): void => {
  const layoutEdges = edges
    .filter((edge) => !stackedNodeIds.has(edge.source) && !stackedNodeIds.has(edge.target))
    .map(({ source, target }) => ({ source, target }));

  const spineIds = collectOriginSpineNodeIds(nodesById, layoutEdges, stackedNodeIds);

  if (spineIds.size === 0) {
    return;
  }

  const spineYValues = [...spineIds].map((nodeId) => getNodeCenterY(g, nodeId));
  const spineY = snapped(spineYValues.reduce((sum, y) => sum + y, 0) / spineYValues.length);

  for (const nodeId of spineIds) {
    setNodeCenterY(g, nodeId, spineY);
  }

  const nodesByRank = new Map<number, string[]>();

  for (const nodeId of g.nodes()) {
    if (filter(nodeId)) {
      const rankKey = Math.round((g.node(nodeId) as Dagre.Node).x);
      const rankNodes = nodesByRank.get(rankKey) ?? [];

      rankNodes.push(nodeId);
      nodesByRank.set(rankKey, rankNodes);
    }
  }

  for (const rankNodes of nodesByRank.values()) {
    const hasSpineNode = rankNodes.some((nodeId) => spineIds.has(nodeId));

    if (hasSpineNode) {
      distributeNonSpineNodesAtRank(g, rankNodes, spineIds, spineY);
    }
  }

  const layoutNodeIds = g.nodes().filter((nodeId) => filter(nodeId));

  pushNonSpineNodesAwayFromSpine(g, layoutNodeIds, spineIds, spineY);
};

/** Converts a laid-out node position to its vertical center for spine comparisons. */
export const getLayoutNodeCenterY = (node: Node<NodeViewModel>): number => {
  if (node.type === 'label' || node.type === 'relationship') {
    return node.position.y + NODE_LABEL_HEIGHT / 2;
  }

  if (
    node.type === 'ellipse' ||
    node.type === 'hexagon' ||
    node.type === 'pentagon' ||
    node.type === 'rectangle' ||
    node.type === 'diamond'
  ) {
    return node.position.y + NODE_HEIGHT / 2;
  }

  return node.position.y;
};
