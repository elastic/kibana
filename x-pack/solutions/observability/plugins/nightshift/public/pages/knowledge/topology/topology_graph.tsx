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
import { EuiBadge, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import type { TopologyViewEdge, TopologyViewModel, TopologyViewNode } from './topology_model';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 76;

export type TopologyGraphSelection =
  | { type: 'node'; node: TopologyViewNode }
  | { type: 'edge'; edge: TopologyViewEdge };

type TopologyFlowNode = Node<
  {
    viewNode: TopologyViewNode;
    onSelect: (selection: TopologyGraphSelection) => void;
  },
  'topology'
>;

type TopologyFlowEdge = Edge<{ viewEdge: TopologyViewEdge }>;

const unresolvedLabel = i18n.translate('xpack.nightshift.topology.node.unresolvedLabel', {
  defaultMessage: 'Unresolved',
});

const TopologyNode = ({
  data: { viewNode, onSelect },
}: NodeProps<TopologyFlowNode>): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} css={{ opacity: 0 }} />
      <button
        type="button"
        onClick={() => onSelect({ type: 'node', node: viewNode })}
        {...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.VIEW_TOPOLOGY_NODE,
          element: NIGHTSHIFT_EBT_ELEMENTS.TOPOLOGY,
        })}
        className={css`
          width: ${NODE_WIDTH}px;
          height: ${NODE_HEIGHT}px;
          overflow: hidden;
          padding: ${euiTheme.size.s};
          text-align: left;
          cursor: pointer;
          color: ${euiTheme.colors.textParagraph};
          background: ${viewNode.unresolved
            ? euiTheme.colors.backgroundBaseWarning
            : euiTheme.colors.backgroundBasePlain};
          border: ${euiTheme.border.thin};
          border-style: ${viewNode.unresolved ? 'dashed' : 'solid'};
          border-radius: ${euiTheme.border.radius.medium};

          &:focus-visible {
            outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
            outline-offset: 2px;
          }
        `}
      >
        <EuiText size="xs">
          <strong>{viewNode.label}</strong>
        </EuiText>
        {viewNode.subtitle && (
          <EuiText size="xs" color="subdued">
            {viewNode.subtitle}
          </EuiText>
        )}
        {viewNode.unresolved && <EuiBadge color="warning">{unresolvedLabel}</EuiBadge>}
      </button>
      <Handle type="source" position={Position.Right} isConnectable={false} css={{ opacity: 0 }} />
    </>
  );
};

const nodeTypes = { topology: TopologyNode };

const layoutNodes = (nodes: TopologyFlowNode[], edges: TopologyFlowEdge[]): TopologyFlowNode[] => {
  const graph = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({ rankdir: 'LR', ranksep: 90, nodesep: 40, marginx: 24, marginy: 24 })
    .setDefaultEdgeLabel(() => ({}));

  // graphlib keys plain objects with `in`, so ids like `constructor` collide with Object.prototype.
  const layoutKeys = new Map(nodes.map(({ id }, index) => [id, `n${index}`]));

  layoutKeys.forEach((key) => graph.setNode(key, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach(({ source, target }) => {
    const sourceKey = layoutKeys.get(source);
    const targetKey = layoutKeys.get(target);
    if (sourceKey && targetKey) {
      graph.setEdge(sourceKey, targetKey);
    }
  });
  Dagre.layout(graph);

  return nodes.map((node, index) => {
    const position = graph.node(`n${index}`);
    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    };
  });
};

export function TopologyGraph({
  model,
  onSelect,
}: {
  model: TopologyViewModel;
  onSelect: (selection: TopologyGraphSelection | undefined) => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  const flowEdges = useMemo<TopologyFlowEdge[]>(
    () =>
      model.edges.map((viewEdge) => ({
        id: viewEdge.id,
        source: viewEdge.source,
        target: viewEdge.target,
        label: [viewEdge.variant.subtype, viewEdge.variant.protocol].filter(Boolean).join(' · '),
        markerEnd: { type: MarkerType.ArrowClosed },
        data: { viewEdge },
        labelStyle: { fill: euiTheme.colors.textParagraph, fontSize: 11 },
        labelBgStyle: { fill: euiTheme.colors.backgroundBasePlain },
        labelBgPadding: [4, 2] as [number, number],
      })),
    [euiTheme, model.edges]
  );

  const flowNodes = useMemo(
    () =>
      layoutNodes(
        model.nodes.map(
          (viewNode): TopologyFlowNode => ({
            id: viewNode.id,
            type: 'topology',
            position: { x: 0, y: 0 },
            data: {
              viewNode,
              onSelect: (selection) => onSelect(selection),
            },
          })
        ),
        flowEdges
      ),
    [flowEdges, model.nodes, onSelect]
  );

  const flowStyle = useMemo(
    () =>
      ({
        '--xy-controls-button-background-color': euiTheme.colors.backgroundBasePlain,
        '--xy-controls-button-background-color-hover':
          euiTheme.colors.backgroundBaseInteractiveHover,
        '--xy-controls-button-color': euiTheme.colors.textParagraph,
        '--xy-controls-button-color-hover': euiTheme.colors.textParagraph,
        '--xy-controls-button-border-color': euiTheme.colors.borderBasePlain,
      } as React.CSSProperties),
    [euiTheme]
  );

  return (
    <div
      className={css`
        height: 600px;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
      `}
      data-test-subj="nightshiftTopologyGraph"
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        style={flowStyle}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
        onEdgeClick={(_, edge) => {
          if (edge.data?.viewEdge) {
            onSelect({ type: 'edge', edge: edge.data.viewEdge });
          }
        }}
        onPaneClick={() => onSelect(undefined)}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
