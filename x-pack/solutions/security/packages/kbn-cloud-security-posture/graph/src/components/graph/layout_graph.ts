/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { EdgeViewModel, NodeViewModel, Size } from '../types';
import { getStackNodeStyle } from '../node/styles';
import { isEntityNode, isConnectorNode, isStackNode, isStackedLabel } from '../utils';
import {
  GRID_SIZE,
  STACK_NODE_VERTICAL_PADDING,
  STACK_NODE_HORIZONTAL_PADDING,
  NODE_HEIGHT,
  ENTITY_NODE_TOTAL_HEIGHT,
  NODE_LABEL_TOTAL_HEIGHT,
  NODE_WIDTH,
  NODE_LABEL_WIDTH,
  NODE_LABEL_HEIGHT,
  NODE_LABEL_DETAILS,
} from '../constants';

const GRID_SIZE_OFFSET = GRID_SIZE * 2;

export const layoutGraph = (
  nodes: Array<Node<NodeViewModel>>,
  edges: Array<Edge<EdgeViewModel>>
): { nodes: Array<Node<NodeViewModel>> } => {
  const nodesById: { [key: string]: Node<NodeViewModel> } = {};
  const graphOpts = {
    compound: true,
    directed: true,
  };

  const g = new Dagre.graphlib.Graph(graphOpts)
    .setGraph({
      rankdir: 'LR',
      align: 'UL',
      ranksep: GRID_SIZE_OFFSET * 3,
    })
    .setDefaultEdgeLabel(() => ({}));

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  const nodesOfParent: { [key: string]: Array<Node<NodeViewModel>> } = {};

  nodes.forEach((node) => {
    if (node.parentId) {
      nodesOfParent[node.parentId] = nodesOfParent[node.parentId] || [];
      nodesOfParent[node.parentId].push(node);
    }
  });
  nodes.forEach((node) => {
    let size = { width: NODE_WIDTH, height: node.measured?.height ?? NODE_HEIGHT };

    if (isConnectorNode(node.data)) {
      size = {
        height: NODE_LABEL_TOTAL_HEIGHT,
        width: NODE_LABEL_WIDTH,
      };

      // TODO: waiting for a fix: https://github.com/dagrejs/dagre/issues/238
      // if (node.parentId) {
      //   g.setParent(node.id, node.parentId);
      // }
    } else if (isStackNode(node.data)) {
      const res = layoutStackedLabels(node, nodesOfParent[node.id]);

      size = res.size;

      res.children.forEach((child) => {
        nodesById[child.data.id] = child;
      });
    } else if (isEntityNode(node.data)) {
      size.height = ENTITY_NODE_TOTAL_HEIGHT;
    }

    if (!nodesById[node.id]) {
      nodesById[node.id] = node;
    }

    if (node.parentId) {
      return;
    }

    g.setNode(node.id, {
      ...node,
      ...size,
    });
  });

  Dagre.layout(g);

  alignNodesCenterInPlace(g, (nodeId: string) => {
    const node = nodesById[nodeId].data;
    return node && isStackedLabel(node);
  });

  const layoutedNodes = nodes.map((node) => {
    // For stacked nodes, we want to keep the original position relative to the parent
    if (isConnectorNode(node.data) && node.data.parentId) {
      return {
        ...node,
        position: nodesById[node.data.id].position,
      };
    }

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    // We also need to snap the position to avoid subpixel rendering issues.
    // Y position is snapped as part of `alignNodesCenterInPlace` function (double snapping will cause misalignments).

    const dagreNode = g.node(node.data.id);

    if (isConnectorNode(node.data)) {
      const x = snapped(Math.round(dagreNode.x - (dagreNode.width ?? 0) / 2));
      const y = Math.round(dagreNode.y - NODE_LABEL_HEIGHT / 2);

      return {
        ...node,
        position: { x, y },
      };
    }

    if (isEntityNode(node.data)) {
      const x = snapped(Math.round(dagreNode.x - (dagreNode.width ?? 0) / 2));
      const y = Math.round(dagreNode.y - NODE_HEIGHT / 2);

      return {
        ...node,
        position: { x, y },
      };
    }

    const x = snapped(Math.round(dagreNode.x - (dagreNode.width ?? 0) / 2));
    const y = Math.round(dagreNode.y - (dagreNode.height ?? 0) / 2);

    if (isStackNode(node.data)) {
      return {
        ...node,
        position: { x, y },
        style: getStackNodeStyle({
          width: dagreNode.width,
          height: dagreNode.height,
        }),
      };
    }

    return {
      ...node,
      position: { x, y },
    };
  });

  layoutedNodes.forEach((node) => {
    nodesById[node.data.id] = node;
  });

  return { nodes: layoutedNodes };
};

const layoutStackedLabels = (
  groupNode: Node<NodeViewModel>,
  nodes: Array<Node<NodeViewModel>>
): { size: Size; children: Array<Node<NodeViewModel>> } => {
  const children = nodes.filter(
    (child) => isConnectorNode(child.data) && child.parentId === groupNode.id
  );
  const stackSize = children.length;
  const stackWidth = NODE_LABEL_WIDTH + STACK_NODE_HORIZONTAL_PADDING * 2;
  const spaceBetweenLabelShapes = snapped(NODE_LABEL_DETAILS + STACK_NODE_VERTICAL_PADDING);
  const stackHeight = spaceBetweenLabelShapes * (stackSize + 1) + NODE_LABEL_HEIGHT * stackSize;

  // Layout children relative to parent
  children.forEach((child, index) => {
    child.position = {
      x: stackWidth / 2 - NODE_LABEL_WIDTH / 2,
      y: spaceBetweenLabelShapes * (index + 1) + NODE_LABEL_HEIGHT * index,
    };
  });

  return {
    size: { width: stackWidth, height: stackHeight },
    children,
  };
};

/**
 * Shared context for graph alignment operations.
 * - Y/Height/setY: accessors for node vertical position and height in Dagre
 * - prevNodeY: tracks original Y positions before adjustments for cascading calculations
 */
interface GraphHelpers {
  g: Dagre.graphlib.Graph;
  filter: (node: string) => boolean;
  Y: (id: string) => number;
  Height: (id: string) => number;
  setY: (id: string, y: number) => number;
  prevNodeY: Record<string, number>;
}

/** Returns child nodes (successors) that pass the filter. */
const getFilteredSuccessors = (
  g: Dagre.graphlib.Graph,
  node: string,
  filter: (n: string) => boolean
): string[] =>
  (g.successors(node)?.filter((sV) => filter(sV.toString())) ?? []).map((s) => s.toString());

/** Returns parent nodes (predecessors) that pass the filter. */
const getFilteredPredecessors = (
  g: Dagre.graphlib.Graph,
  node: string,
  filter: (n: string) => boolean
): string[] =>
  (g.predecessors(node)?.filter((pV) => filter(pV.toString())) ?? []).map((p) => p.toString());

/**
 * Finds all sibling nodes (via shared parents) that also share at least one child with currNode.
 * Used to identify nodes that need coordinated vertical distribution to avoid overlap.
 */
const findSiblingsWithSharedChildren = (
  helpers: GraphHelpers,
  currNode: string,
  children: string[],
  parents: string[]
): string[] => {
  const { g, filter } = helpers;
  const siblingsWithSharedChildren: string[] = [];

  for (const parent of parents) {
    const allSiblings = getFilteredSuccessors(g, parent, filter);

    for (const sibling of allSiblings) {
      if (!siblingsWithSharedChildren.includes(sibling)) {
        const siblingChildren = getFilteredSuccessors(g, sibling, filter);

        if (children.some((child) => siblingChildren.includes(child))) {
          siblingsWithSharedChildren.push(sibling);
        }
      }
    }
  }

  return siblingsWithSharedChildren;
};

/**
 * Positions a node with multiple children at the vertical center of its children.
 * If siblings share the same children (fan-in pattern), distributes them evenly
 * around that center to prevent overlap while maintaining visual balance.
 */
const handleMultipleChildren = (
  helpers: GraphHelpers,
  currNode: string,
  children: string[]
): void => {
  const { g, filter, Y, Height, setY, prevNodeY } = helpers;
  const currY = Y(currNode);

  const first = children.reduce(
    (min, childNode) => (Y(childNode) < Y(min) ? childNode : min),
    children[0]
  );
  const last = children.reduce(
    (max, childNode) => (Y(childNode) > Y(max) ? childNode : max),
    children[0]
  );
  const centerY = Y(first) + (Y(last) - Y(first)) / 2;

  const parents = getFilteredPredecessors(g, currNode, filter);
  const siblingsWithSharedChildren = findSiblingsWithSharedChildren(
    helpers,
    currNode,
    children,
    parents
  );

  if (siblingsWithSharedChildren.length > 1) {
    siblingsWithSharedChildren.sort((a, b) => Y(a) - Y(b));

    const siblingIndex = siblingsWithSharedChildren.indexOf(currNode);
    const siblingCount = siblingsWithSharedChildren.length;
    const spacing = Height(currNode) + GRID_SIZE_OFFSET;
    const totalHeight = (siblingCount - 1) * spacing;
    const newY = centerY - totalHeight / 2 + siblingIndex * spacing;

    prevNodeY[currNode] = currY;
    setY(currNode, snapped(newY));
  } else {
    prevNodeY[currNode] = currY;
    setY(currNode, snapped(centerY));
  }
};

/**
 * Positions a node with exactly one child. When multiple nodes converge to the same child
 * (fan-in), calculates position to maintain equal edge lengths from first to last sibling.
 * If child was already adjusted, propagates that adjustment to maintain relative positioning.
 */
const handleSingleChild = (helpers: GraphHelpers, currNode: string, child: string): void => {
  const { g, filter, Y, Height, setY, prevNodeY } = helpers;
  const currY = Y(currNode);
  const siblings = getFilteredPredecessors(g, child, filter);

  if (siblings.length > 1) {
    const { lastSiblingInfo, firstSiblingInfo } = analyzeSiblings(siblings, prevNodeY, Y, Height);
    const edgesHeight = lastSiblingInfo.middle - firstSiblingInfo.middle;
    const finalChildY = Y(child) - Height(child) / 2;
    const firstSiblingNewY = finalChildY - (edgesHeight - Height(child)) / 2;
    const finalFirstSiblingNewY = firstSiblingNewY - firstSiblingInfo.h / 2;
    const newY = snapped(finalFirstSiblingNewY) + currY - firstSiblingInfo.top;

    prevNodeY[currNode] = currY;
    setY(currNode, newY);
  } else if (prevNodeY[child] !== undefined) {
    const newY = currY - (prevNodeY[child] - Y(child));
    prevNodeY[currNode] = currY;
    setY(currNode, newY);
  }
};

/**
 * Positions a leaf node (no children) based on its parents.
 * Delegates to handleMultipleParents or handleSingleParent, or preserves
 * position for isolated nodes.
 */
const handleNoChildren = (helpers: GraphHelpers, currNode: string): void => {
  const { g, filter, Y, setY, prevNodeY } = helpers;
  const currY = Y(currNode);
  const parents = getFilteredPredecessors(g, currNode, filter);

  if (parents.length > 1) {
    handleMultipleParents(helpers, currNode, parents);
  } else if (parents.length === 1) {
    handleSingleParent(helpers, currNode, parents[0]);
  } else {
    prevNodeY[currNode] = currY;
    setY(currNode, snapped(currY));
  }
};

/**
 * Positions a node with multiple parents. If node has siblings (fan-out from any parent),
 * preserves Dagre's positioning to avoid overlap. Otherwise, centers vertically
 * between first and last parent for balanced edge lengths.
 */
const handleMultipleParents = (
  helpers: GraphHelpers,
  currNode: string,
  parents: string[]
): void => {
  const { g, filter, Y, Height, setY, prevNodeY } = helpers;
  const currY = Y(currNode);

  const hasSiblings = parents.some((parent) => getFilteredSuccessors(g, parent, filter).length > 1);

  if (hasSiblings) {
    prevNodeY[currNode] = currY;
  } else {
    const { firstSiblingInfo: firstParentInfo, lastSiblingInfo: lastParentInfo } = analyzeSiblings(
      parents,
      prevNodeY,
      Y,
      Height
    );
    const edgesHeight = lastParentInfo.middle - firstParentInfo.middle;
    const newY = firstParentInfo.middle + (edgesHeight - Height(currNode)) / 2;

    prevNodeY[currNode] = currY;
    setY(currNode, snapped(newY));
  }
};

/**
 * Positions a node with exactly one parent. If parent has multiple children (fan-out),
 * preserves Dagre's positioning to avoid sibling overlap. Otherwise, aligns
 * vertically centered on the parent.
 */
const handleSingleParent = (helpers: GraphHelpers, currNode: string, parent: string): void => {
  const { g, filter, Y, Height, setY, prevNodeY } = helpers;
  const currY = Y(currNode);
  const siblings = getFilteredSuccessors(g, parent, filter);

  if (siblings.length > 1) {
    prevNodeY[currNode] = currY;
  } else {
    const newY = Y(parent) - Height(currNode) / 2;
    prevNodeY[currNode] = currY;
    setY(currNode, snapped(newY));
  }
};

/**
 * Re-centre a Dagre-laid-out LR graph so that…
 *   • any node with children sits at the vertical mid-point of its children
 *   • any node with ≥2 parents sits at the vertical mid-point of its parents
 *
 * Runs in O(V + E) on Dagre's directed graphs.
 * Mutates the Dagre graph in place.
 */
const alignNodesCenterInPlace = (g: Dagre.graphlib.Graph, filter: (node: string) => boolean) => {
  const helpers: GraphHelpers = {
    g,
    filter,
    Y: (id: string) => (g.node(id) as Dagre.Node).y,
    Height: (id: string) => (g.node(id) as Dagre.Node).height,
    setY: (id: string, y: number) => ((g.node(id) as Dagre.Node).y = y),
    prevNodeY: {},
  };

  const topo = topsort(g, filter);

  for (const currNode of topo.reverse()) {
    const children = getFilteredSuccessors(g, currNode, filter);

    if (children.length > 1) {
      handleMultipleChildren(helpers, currNode, children);
    } else if (children.length === 1) {
      handleSingleChild(helpers, currNode, children[0]);
    } else {
      handleNoChildren(helpers, currNode);
    }
  }
};

const topsort = (g: Dagre.graphlib.Graph, filter: (node: string) => boolean): string[] => {
  const visited: Record<string, boolean> = {};
  const stack: Record<string, boolean> = {};
  const results: string[] = [];

  function visit(node: string): void {
    if (!filter(node)) {
      return;
    }

    if (Object.hasOwn(stack, node)) {
      throw new Error('CycleException');
    }

    if (!Object.hasOwn(visited, node)) {
      stack[node] = true;
      visited[node] = true;
      g.predecessors(node)?.forEach((preNode) => visit(preNode.toString()));
      delete stack[node];
      results.push(node);
    }
  }

  g.sinks().forEach((node) => visit(node.toString()));

  return results;
};

function analyzeSiblings(
  siblings: string[],
  prevNodeY: Record<string, number>,
  Y: (id: string) => number,
  Height: (id: string) => number
) {
  const firstSibling = siblings.reduce(
    (min, siblingNode) => ((prevNodeY[siblingNode] ?? Y(siblingNode)) < Y(min) ? siblingNode : min),
    siblings[0]
  );
  const lastSibling = siblings.reduce(
    (max, siblingNode) => ((prevNodeY[siblingNode] ?? Y(siblingNode)) > Y(max) ? siblingNode : max),
    siblings[0]
  );

  const firstSiblingInfo = {
    id: firstSibling,
    h: Height(firstSibling),
    top: (prevNodeY[firstSibling] ?? Y(firstSibling)) - Height(firstSibling) / 2,
    middle: prevNodeY[firstSibling] ?? Y(firstSibling),
  };
  const lastSiblingInfo = {
    id: lastSibling,
    h: Height(lastSibling),
    top: (prevNodeY[lastSibling] ?? Y(lastSibling)) - Height(lastSibling) / 2,
    middle: prevNodeY[lastSibling] ?? Y(lastSibling),
  };
  return { lastSiblingInfo, firstSiblingInfo };
}

const snapped = (value: number, method: 'round' | 'floor' = 'round'): number => {
  return Math[method](value / GRID_SIZE_OFFSET) * GRID_SIZE_OFFSET;
};
