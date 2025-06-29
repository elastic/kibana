/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { EdgeViewModel, NodeViewModel, Size } from '../types';
import { calcLabelSize } from './utils';
import { GroupStyleOverride, NODE_HEIGHT, NODE_WIDTH } from '../node/styles';

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
    .setGraph({ rankdir: 'LR', align: 'UL', nodesep: 50 })
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
      size = calcLabelSize(node.data.label);

      // TODO: waiting for a fix: https://github.com/dagrejs/dagre/issues/238
      // if (node.parentId) {
      //   g.setParent(node.id, node.parentId);
      // }
    } else if (node.data.shape === 'group') {
      const res = layoutGroupChildren(node, nodesOfParent[node.id]);

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

  const innerLabel = (node: string): boolean =>
    !(nodesById[node].data.shape === 'label' && Boolean(nodesById[node].parentId));
  const isEntity = (node: string): boolean =>
    nodesById[node].data.shape !== 'label' && nodesById[node].data.shape !== 'group';

  // centreLeftByRank(g, innerLabel);
  // alignNodesCenterInPlace(g, innerLabel, isEntity, nodesById);
  alignNodesCenterInPlace(g, innerLabel, isEntity, nodesById, false);

  const layoutedNodes = nodes.map((node) => {
    // For grouped nodes, we want to keep the original position relative to the parent
    if (node.data.shape === 'label' && node.data.parentId) {
      return {
        ...node,
        position: nodesById[node.data.id].position,
      };
    }

    const dagreNode = g.node(node.data.id);

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    // We also need to round the position to avoid subpixel rendering
    const x = // Math.round(dagreNode.x) + (20 - (Math.round(dagreNode.x) % 20));
      Math.round(dagreNode.x - (dagreNode.width ?? 0) / 2) +
      (20 - (Math.round(dagreNode.x - (dagreNode.width ?? 0) / 2) % 20));
    const y = // Math.round(dagreNode.y) + (20 - (Math.round(dagreNode.y) % 20));
      Math.round(dagreNode.y - (dagreNode.height ?? 0) / 2) +
      (20 - (Math.round(dagreNode.y - (dagreNode.height ?? 0) / 2) % 20));

    if (node.data.shape === 'group') {
      return {
        ...node,
        // position: { x, y: dagreNode.y },
        position: { x, y },
        style: GroupStyleOverride({
          width: dagreNode.width,
          height: dagreNode.height,
        }),
      };
    } else if (node.data.shape === 'label') {
      return {
        ...node,
        position: { x, y },
      };
    } else {
      // Align nodes to labels by shifting the node position by it's label height
      return {
        ...node,
        position: { x, y: y + (dagreNode.height - NODE_HEIGHT) / 2 },
      };
    }
  });

  layoutedNodes.forEach((node) => {
    nodesById[node.data.id] = node;
  });

  // alignNodesCenterInPlace(g, innerLabel, isEntity, nodesById, true);

  return { nodes: layoutedNodes };
};

const layoutGroupChildren = (
  groupNode: Node<NodeViewModel>,
  nodes: Array<Node<NodeViewModel>>
): { size: Size; children: Array<Node<NodeViewModel>> } => {
  const children = nodes.filter(
    (child) => child.data.shape === 'label' && child.parentId === groupNode.id
  );

  const STACK_VERTICAL_PADDING = 20;
  const MIN_STACK_HEIGHT = 60;
  const PADDING = 20;
  const stackSize = children.length;
  const allChildrenHeight = children.reduce(
    (prevHeight, node) => prevHeight + calcLabelSize(node.data.label).height,
    0
  );
  const stackHeight = Math.max(
    allChildrenHeight + (stackSize - 1) * STACK_VERTICAL_PADDING,
    MIN_STACK_HEIGHT
  );

  const space = (stackHeight - allChildrenHeight) / (stackSize - 1);
  const groupNodeWidth = children.reduce((acc, child) => {
    const currLblWidth = PADDING * 2 + calcLabelSize(child.data.label).width;
    return Math.max(acc, currLblWidth);
  }, 0);

  // Layout children relative to parent
  children.forEach((child, index) => {
    const childSize = calcLabelSize(child.data.label);
    child.position = {
      x: groupNodeWidth / 2 - childSize.width / 2,
      y: index * (childSize.height + space),
    };
  });

  return {
    size: { width: groupNodeWidth, height: stackHeight },
    children,
  };
};

const topsort = (g: Dagre.graphlib.Graph, filter: (node: string) => boolean): string[] => {
  const visited: Record<string, boolean> = {};
  const stack: Record<string, boolean> = {};
  const results: string[] = [];

  function visit(node: string): void {
    if (!filter(node)) {
      return; // Skip labels that are children of groups
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

/**
 * Re-centre a Dagre-laid-out LR graph so that…
 *   • any node with children sits at the vertical mid-point of its children
 *   • any node with ≥2 parents sits at the vertical mid-point of its parents
 *
 * Runs in O(V + E) on Dagre's directed graphs.
 * Mutates the Dagre graph in place.
 */
const alignNodesCenterInPlace = (
  g: Dagre.graphlib.Graph,
  filter: (node: string) => boolean,
  nodeCenter: (node: string) => boolean,
  nodesById: { [key: string]: Node<NodeViewModel> },
  useNodesById: boolean
) => {
  /* ---------- util ------------ */
  // const Y = (id: string) => nodesById[id].position.y;
  // const height = (id: string) => g.node(id).height ?? NODE_HEIGHT;
  // const setY = (id: string, y: number) => (nodesById[id].position.y = y);
  const Y = useNodesById
    ? (id: string) => nodesById[id].position.y
    : (id: string) => (g.node(id) as Dagre.Node).y;
  const setY = useNodesById
    ? (id: string, y: number) => (nodesById[id].position.y = y)
    : (id: string, y: number) => ((g.node(id) as Dagre.Node).y = y);
  const adjustNode: Record<string, number> = {};
  const parentsSum: Record<string, number> = {};

  /* ---------- topological order ---------- */
  const topo = topsort(g, filter); // parents appear before children

  /* ---------- 1. bottom-up: centre on children ---------- */
  for (const v of topo.reverse()) {
    const kids = g.successors(v)?.filter((sV) => filter(sV.toString())) ?? [];

    if (kids.length > 1) {
      const avg = kids.reduce((sum, k) => sum + Y(k.toString()), 0) / kids.length;
      const prevY = Y(v);
      adjustNode[v] = prevY - avg; // store adjustment for parents
      setY(v, avg);
    } else if (kids.length === 1 && adjustNode[kids[0].toString()] !== undefined) {
      const currY = Y(v);
      const siblings =
        g.predecessors(kids[0].toString())?.filter((pV) => filter(pV.toString())) ?? [];

      if (siblings.length > 1 && parentsSum[kids[0].toString()] === undefined) {
        parentsSum[kids[0].toString()] = siblings.reduce((sum, s) => sum + Y(s.toString()), 0);
      }
      // height(siblings.reduce((min, s) => Math.min(min, Y(s.toString())), Infinity));

      const siblingsSum =
        siblings.length > 1 ? parentsSum[kids[0].toString()] / siblings.length : 0;
      const centerSiblingsToTarget =
        siblings.length > 1 ? (Y(kids[0].toString()) - siblingsSum) / 2 : 0;

      // console.log('v', v, 'y', Y(kids[0].toString()));
      // console.log('siblings', siblings);
      // console.log('sublingsSum', siblingsSum);
      // console.log('centerSiblingsToTarget', centerSiblingsToTarget);
      const newY = currY - adjustNode[kids[0].toString()] - centerSiblingsToTarget;
      adjustNode[v] = currY - newY; // store adjustment for parents
      setY(v, newY); // adjust for parents
    } else if (kids.length === 0) {
      // no children, so we can by its parents
      const parents = g.predecessors(v)?.filter((pV) => filter(pV.toString())) ?? [];
      if (parents.length >= 1) {
        const avg = parents.reduce((sum, p) => sum + Y(p.toString()), 0) / parents.length;
        setY(v, avg);
      }
    }
  }
};
