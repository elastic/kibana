/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import Dagre from '@dagrejs/dagre';
import {
  BaseEdge,
  Background,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  getBezierPath,
  ReactFlow,
  type Edge,
  type EdgeProps,
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

type TopologyFlowEdge = Edge<{ viewEdge: TopologyViewEdge; offset: number }, 'topology'>;

const PARALLEL_EDGE_SPACING = 48;

/** Fans edges that share endpoints apart along the normal so each stays clickable. */
const TopologyEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  data,
}: EdgeProps<TopologyFlowEdge>): React.ReactElement => {
  const offset = data?.offset ?? 0;
  let path: string;
  let labelX: number;
  let labelY: number;

  if (offset === 0) {
    [path, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
  } else {
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    const length = Math.hypot(targetX - sourceX, targetY - sourceY) || 1;
    const normalX = -(targetY - sourceY) / length;
    const normalY = (targetX - sourceX) / length;
    // A quadratic curve peaks at half its control-point displacement.
    path = `M ${sourceX},${sourceY} Q ${midX + normalX * offset * 2},${
      midY + normalY * offset * 2
    } ${targetX},${targetY}`;
    labelX = midX + normalX * offset;
    labelY = midY + normalY * offset;
  }

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={20} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              padding: '2px 4px',
              pointerEvents: 'none',
              ...labelStyle,
              background: labelBgStyle?.fill,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const edgeTypes = { topology: TopologyEdge };

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

  const flowEdges = useMemo<TopologyFlowEdge[]>(() => {
    const groups = new Map<string, TopologyViewEdge[]>();
    model.edges.forEach((viewEdge) => {
      const key = [viewEdge.source, viewEdge.target].sort().join('\u0000');
      groups.set(key, [...(groups.get(key) ?? []), viewEdge]);
    });

    return model.edges.map((viewEdge) => {
      const group = groups.get([viewEdge.source, viewEdge.target].sort().join('\u0000')) ?? [];
      const direction = viewEdge.source <= viewEdge.target ? 1 : -1;
      const offset =
        group.length > 1
          ? (group.indexOf(viewEdge) - (group.length - 1) / 2) * PARALLEL_EDGE_SPACING * direction
          : 0;
      return {
        id: viewEdge.id,
        type: 'topology' as const,
        source: viewEdge.source,
        target: viewEdge.target,
        label: [viewEdge.variant.subtype, viewEdge.variant.protocol].filter(Boolean).join(' · '),
        markerEnd: { type: MarkerType.ArrowClosed },
        data: { viewEdge, offset },
        labelStyle: { color: euiTheme.colors.textParagraph, fontSize: 11 },
        labelBgStyle: { fill: euiTheme.colors.backgroundBasePlain },
      };
    });
  }, [euiTheme, model.edges]);

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
        position: relative;
        flex: 1 1 auto;
        min-height: 480px;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
      `}
      data-test-subj="nightshiftTopologyGraph"
    >
      {/* React Flow needs a definite height, which a flex-sized box does not give its children. */}
      <div
        className={css`
          position: absolute;
          inset: 0;
        `}
      >
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
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
    </div>
  );
}
