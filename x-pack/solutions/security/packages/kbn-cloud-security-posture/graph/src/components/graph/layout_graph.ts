/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { EdgeViewModel, NodeViewModel, Size } from '../types';
import { ACTUAL_LABEL_HEIGHT, GroupStyleOverride } from '../node/styles';
import { isStackedLabel } from '../utils';
import {
  GRID_SIZE,
  STACK_NODE_VERTICAL_PADDING,
  STACK_NODE_HORIZONTAL_PADDING,
  STACK_NODE_MIN_HEIGHT,
  NODE_HEIGHT,
  NODE_WIDTH,
  NODE_LABEL_HEIGHT,
  NODE_LABEL_WIDTH,
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

    if (node.data.shape === 'label') {
      size = {
        height: NODE_LABEL_HEIGHT,
        width: NODE_LABEL_WIDTH,
      };

      // TODO: waiting for a fix: https://github.com/dagrejs/dagre/issues/238
      // if (node.parentId) {
      //   g.setParent(node.id, node.parentId);
      // }
    } else if (node.data.shape === 'group') {
      const res = layoutStackedLabels(node, nodesOfParent[node.id]);

      size = res.size;

      res.children.forEach((child) => {
        nodesById[child.data.id] = child;
      });
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
    if (node.data.shape === 'label' && node.data.parentId) {
      return {
        ...node,
        position: nodesById[node.data.id].position,
      };
    }

    const dagreNode = g.node(node.data.id);

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    // We also need to snap the position to avoid subpixel rendering issues.
    // Y position is snapped as part of `alignNodesCenterInPlace` function (double snapping will cause misalignments).
    const x = snapped(Math.round(dagreNode.x - (dagreNode.width ?? 0) / 2));
    const y = Math.round(dagreNode.y - (dagreNode.height ?? 0) / 2);

    if (node.data.shape === 'group') {
      return {
        ...node,
        position: { x, y },
        style: GroupStyleOverride({
          width: dagreNode.width,
          height: dagreNode.height,
        }),
      };
    } else {
      return {
        ...node,
        position: { x, y },
      };
    }
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
    (child) => child.data.shape === 'label' && child.parentId === groupNode.id
  );

  const stackSize = children.length;
  const allChildrenHeight = children.reduce(
    (prevHeight, node) => prevHeight + ACTUAL_LABEL_HEIGHT,
    0
  );
  const stackHeight = Math.max(
    allChildrenHeight + (stackSize - 1) * STACK_NODE_VERTICAL_PADDING,
    STACK_NODE_MIN_HEIGHT
  );
  const space = (stackHeight - allChildrenHeight) / (stackSize - 1);
  const groupNodeWidth = children.reduce((acc, child) => {
    const currLblWidth = STACK_NODE_HORIZONTAL_PADDING * 2 + NODE_LABEL_WIDTH;
    return Math.max(acc, currLblWidth);
  }, 0);

  const roundStackHeight = snapped(stackHeight);
  const diffFromRounded = roundStackHeight - stackHeight;

  // Layout children relative to parent
  children.forEach((child, index) => {
    child.position = {
      x: groupNodeWidth / 2 - NODE_LABEL_WIDTH / 2,
      y: index * (ACTUAL_LABEL_HEIGHT + space) + diffFromRounded,
    };
  });

  return {
    size: { width: groupNodeWidth, height: roundStackHeight },
    children,
  };
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
  const Y = (id: string) => (g.node(id) as Dagre.Node).y;
  const Height = (id: string) => (g.node(id) as Dagre.Node).height;
  const setY = (id: string, y: number) => ((g.node(id) as Dagre.Node).y = y);

  const prevNodeY: Record<string, number> = {};
  const topo = topsort(g, filter);

  for (const currNode of topo.reverse()) {
    const currY = Y(currNode);
    const children = (g.successors(currNode)?.filter((sV) => filter(sV.toString())) ?? []).map(
      (childNode) => childNode.toString()
    );

    if (children.length > 1) {
      const first = children.reduce(
        (min, childNode) => (Y(childNode) < Y(min) ? childNode : min),
        children[0]
      );
      const last = children.reduce(
        (max, childNode) => (Y(childNode) > Y(max) ? childNode : max),
        children[0]
      );

      const centerY = Y(first) + (Y(last) - Y(first)) / 2;
      const prevY = Y(currNode);

      // Log the diff for current node
      prevNodeY[currNode] = prevY;
      setY(currNode, snapped(centerY));
    } else if (children.length === 1) {
      const child = children[0].toString();
      const siblings = (
        g.predecessors(child)?.filter((parentNode) => filter(parentNode.toString())) ?? []
      ).map((siblingNode) => siblingNode.toString());

      if (siblings.length > 1) {
        const { lastSiblingInfo, firstSiblingInfo } = analyzeSiblings(
          siblings,
          prevNodeY,
          Y,
          Height
        );

        // We want to center the current node vertically between the first and last sibling
        // So that the edges between the first and last sibling are equal in their length
        const edgesHeight = lastSiblingInfo.middle - firstSiblingInfo.middle;

        // Final Y position is effected by the node height (checkout layoutGraph function)
        const finalChildY = Y(child) - Height(child) / 2;

        // Position of the first sibling when adjusted
        const firstSiblingNewY = finalChildY - (edgesHeight - Height(child)) / 2;

        // Final Y position is effected by the node height (checkout layoutGraph function)
        const finalFirstSiblingNewY = firstSiblingNewY - firstSiblingInfo.h / 2;

        // Calculate the current node position relative to the first sibling
        const newY = snapped(finalFirstSiblingNewY) + currY - firstSiblingInfo.top;

        // Log the diff for current node
        prevNodeY[currNode] = currY;
        setY(currNode, newY);
      } else if (prevNodeY[child] !== undefined) {
        // There is only one child, and that child was already adjusted
        const newY = currY - (prevNodeY[child] - Y(child));

        // Log the diff for current node
        prevNodeY[currNode] = currY;
        setY(currNode, newY);
      }
    } else if (children.length === 0) {
      // No children, so we center by its parents
      const parents = (
        g.predecessors(currNode)?.filter((parentNode) => filter(parentNode.toString())) ?? []
      ).map((parentNode) => parentNode.toString());

      if (parents.length > 1) {
        // const avg = parents.reduce((sum, parentNode) => sum + Y(parentNode), 0) / parents.length;
        const { firstSiblingInfo: firstParentInfo, lastSiblingInfo: lastParentInfo } =
          analyzeSiblings(parents, prevNodeY, Y, Height);

        // We want to center the current node vertically between the first and last sibling
        // So that the edges between the first and last sibling are equal in their length
        const edgesHeight = lastParentInfo.middle - firstParentInfo.middle;

        // Calculate the current node position relative to the first sibling
        const newY = firstParentInfo.middle + (edgesHeight - Height(currNode)) / 2;

        // Log the diff for current node
        prevNodeY[currNode] = currY;
        setY(currNode, snapped(newY));
      } else if (parents.length === 1) {
        // There is only one parent, so we just set the current node to the parent's Y position
        const parent = parents[0].toString();
        const newY = Y(parent) - Height(currNode) / 2;

        // Log the diff for current node
        prevNodeY[currNode] = currY;
        setY(currNode, snapped(newY));
      }
    } else {
      // No children and no parents, so we just set the current node to its own Y position
      // This is a no-op, but we log it for consistency
      prevNodeY[currNode] = currY;
      setY(currNode, snapped(currY));
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
