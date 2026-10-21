/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import Dagre from '@dagrejs/dagre';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { EuiText, useEuiTheme, type EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/css';
import type {
  DecisionEdgeView,
  DecisionNodeType,
  DecisionNodeView,
} from '@kbn/nightshift-decision-trees';

const NODE_WIDTH = 240;
const CHARS_PER_LINE = 30;
const LINE_HEIGHT = 18;
const NODE_VERTICAL_PADDING = 24;
const HEXAGON_INSET = 14;

type DecisionTreeFlowNode = Node<{ label: string; nodeType: DecisionNodeType }, 'decisionTree'>;

const estimateNodeHeight = (label: string): number =>
  NODE_VERTICAL_PADDING + Math.max(1, Math.ceil(label.length / CHARS_PER_LINE)) * LINE_HEIGHT;

const hexagonClipPath = `polygon(${HEXAGON_INSET}px 0, calc(100% - ${HEXAGON_INSET}px) 0, 100% 50%, calc(100% - ${HEXAGON_INSET}px) 100%, ${HEXAGON_INSET}px 100%, 0 50%)`;

const getNodeColors = (
  nodeType: DecisionNodeType,
  { colors }: EuiThemeComputed
): { background: string; border: string } => {
  switch (nodeType) {
    case 'symptom':
      return { background: colors.backgroundBaseDanger, border: colors.borderStrongDanger };
    case 'decision':
      return { background: colors.backgroundBaseWarning, border: colors.borderStrongWarning };
    case 'end':
      return { background: colors.backgroundBaseSuccess, border: colors.borderStrongSuccess };
    case 'evidence_gatherer':
      return { background: colors.backgroundBasePrimary, border: colors.borderStrongPrimary };
  }
};

function DecisionTreeNode({ data: { label, nodeType } }: NodeProps<DecisionTreeFlowNode>) {
  const { euiTheme } = useEuiTheme();
  const { background, border } = getNodeColors(nodeType, euiTheme);
  const isDecision = nodeType === 'decision';

  const shapeClassName = css`
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: ${euiTheme.size.s} ${isDecision ? `${HEXAGON_INSET + 4}px` : euiTheme.size.m};
    background: ${background};
    border: ${isDecision
      ? 'none'
      : `${nodeType === 'end' ? 3 : 1}px ${nodeType === 'end' ? 'double' : 'solid'} ${border}`};
    border-radius: ${nodeType === 'symptom' || nodeType === 'end'
      ? '999px'
      : euiTheme.border.radius.small};
    ${isDecision ? `clip-path: ${hexagonClipPath};` : ''}
  `;

  const shape = (
    <div className={shapeClassName}>
      <EuiText size="xs">{label}</EuiText>
    </div>
  );

  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      {isDecision ? (
        <div
          className={css`
            width: 100%;
            height: 100%;
            padding: 1px;
            background: ${border};
            clip-path: ${hexagonClipPath};
          `}
        >
          {shape}
        </div>
      ) : (
        shape
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </>
  );
}

const nodeTypes = { decisionTree: DecisionTreeNode };

const layoutDecisionTree = (
  nodes: DecisionNodeView[],
  edges: DecisionEdgeView[]
): DecisionTreeFlowNode[] => {
  const graph = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 40, marginx: 16, marginy: 16 })
    .setDefaultEdgeLabel(() => ({}));

  const heights = new Map(nodes.map(({ node_id: id, label }) => [id, estimateNodeHeight(label)]));
  heights.forEach((height, id) => graph.setNode(id, { width: NODE_WIDTH, height }));
  edges.forEach(({ source_node_id: source, target_node_id: target }) => {
    if (graph.hasNode(source) && graph.hasNode(target)) {
      graph.setEdge(source, target);
    }
  });

  Dagre.layout(graph);

  return nodes.map(({ node_id: id, label, node_type: nodeType }) => {
    const { x, y } = graph.node(id);
    const height = heights.get(id) ?? estimateNodeHeight(label);
    return {
      id,
      type: 'decisionTree',
      position: { x: x - NODE_WIDTH / 2, y: y - height / 2 },
      width: NODE_WIDTH,
      height,
      data: { label, nodeType },
    };
  });
};

interface DecisionTreeGraphProps {
  nodes: DecisionNodeView[];
  edges: DecisionEdgeView[];
}

/** Renders a parsed decision tree as a top-down flowchart, highlighting the taken path. */
export function DecisionTreeGraph({ nodes, edges }: DecisionTreeGraphProps) {
  const { euiTheme } = useEuiTheme();

  const flowNodes = useMemo(() => layoutDecisionTree(nodes, edges), [nodes, edges]);

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map(
        ({ source_node_id: source, target_node_id: target, condition, is_taken: taken }, index) => {
          const color = taken
            ? euiTheme.colors.borderStrongSuccess
            : euiTheme.colors.borderBasePlain;
          return {
            id: `${source}-${target}-${index}`,
            source,
            target,
            label: condition || undefined,
            style: { stroke: color, strokeWidth: taken ? 2 : 1 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
            labelStyle: { fontSize: 11, fill: euiTheme.colors.textParagraph },
            labelBgStyle: { fill: euiTheme.colors.backgroundBasePlain },
            labelBgPadding: [4, 2] as [number, number],
          };
        }
      ),
    [edges, euiTheme]
  );

  return (
    <div
      className={css`
        height: 600px;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
      `}
      data-test-subj="nightshiftDecisionTreeGraph"
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
