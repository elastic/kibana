/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
  type NodeMouseHandler,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FabricNode } from '../../mock_data';
import { SourceNode } from './source_node';
import { TransformNode } from './transform_node';
import { DestinationNode } from './destination_node';
import { applyDagreLayout } from './layout';

const nodeTypes: NodeTypes = {
  source: SourceNode as React.ComponentType<any>,
  transform: TransformNode as React.ComponentType<any>,
  destination: DestinationNode as React.ComponentType<any>,
};

interface PipelineGraphProps {
  nodes: FabricNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onPaneClick: () => void;
}

const GraphInner = ({
  nodes: propNodes,
  edges: propEdges,
  selectedNodeId,
  onNodeClick,
  onPaneClick,
}: PipelineGraphProps) => {
  const { euiTheme } = useEuiTheme();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<FabricNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const laid = applyDagreLayout(propNodes, propEdges);
    setNodes(laid);
    setEdges(propEdges);
  }, [propNodes, propEdges, setNodes, setEdges]);

  useEffect(() => {
    fitView({ padding: 0.1, duration: 300 });
  }, [propNodes, fitView]);

  // Reflect selection state on nodes without triggering layout recalc
  useEffect(() => {
    setNodes((current) =>
      current.map((n) => ({ ...n, selected: n.id === selectedNodeId }))
    );
  }, [selectedNodeId, setNodes]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      style: { stroke: euiTheme.colors.borderBasePlain, strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: euiTheme.colors.borderBasePlain,
      },
      labelStyle: { fontSize: 10, fill: euiTheme.colors.subduedText },
      labelBgStyle: { fill: euiTheme.colors.backgroundBaseSubdued },
    }),
    [euiTheme]
  );

  return (
    <div
      css={css`
        width: 100%;
        height: 100%;
      `}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: euiTheme.colors.backgroundBaseSubdued }}
      >
        <Background color={euiTheme.colors.borderBasePlain} gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

export const PipelineGraph = (props: PipelineGraphProps) => (
  <ReactFlowProvider>
    <GraphInner {...props} />
  </ReactFlowProvider>
);
