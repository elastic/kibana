/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@emotion/react';
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import { Minimap as MinimapComp, type MinimapProps as MinimapPropsType } from './minimap';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';
import { SvgDefsMarker } from '../edge/markers';
import { layoutGraph } from '../graph/layout_graph';
import {
  DiamondNode,
  EdgeGroupNode,
  EllipseNode,
  HexagonNode,
  LabelNode,
  PentagonNode,
  RectangleNode,
} from '../node';
import { DefaultEdge } from '../edge';
import { basicSample } from '../mock/graph_sample';
import { buildGraphFromViewModels } from '../utils';
import type { NodeViewModel, EdgeViewModel } from '../types';

const nodeTypes = {
  hexagon: HexagonNode,
  pentagon: PentagonNode,
  ellipse: EllipseNode,
  rectangle: RectangleNode,
  diamond: DiamondNode,
  label: LabelNode,
  group: EdgeGroupNode,
};

const edgeTypes = {
  default: DefaultEdge,
};

const WrappedMinimap = (props: MinimapPropsType) => {
  const { nodes, edges } = buildGraphFromViewModels(basicSample.nodes, basicSample.edges);
  const { nodes: layoutedNodes } = layoutGraph(nodes, edges);
  const [nodesState, _setNodes, onNodesChange] = useNodesState<Node<NodeViewModel>>(layoutedNodes);
  const [edgesState, _setEdges, onEdgesChange] = useEdgesState<Edge<EdgeViewModel>>(edges);

  const onInit = (xyflow: ReactFlowInstance<Node<NodeViewModel>, Edge<EdgeViewModel>>) => {
    setTimeout(() => {
      xyflow.fitView();
    }, 30);
  };

  return (
    <>
      <SvgDefsMarker />
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={onInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <MinimapComp {...props} nodesState={nodesState} />
      </ReactFlow>
    </>
  );
};

export default {
  title: 'Components/Graph Components/Minimap',
  component: WrappedMinimap,
  parameters: {
    docs: {
      description: {
        component:
          "A minimap component for the Graph visualization that provides a bird's-eye view of the graph structure.",
      },
    },
  },
  argTypes: {
    zoomable: {
      control: { type: 'boolean' },
      description: 'Allow zooming within the minimap',
      defaultValue: true,
    },
    pannable: {
      control: { type: 'boolean' },
      description: 'Allow panning within the minimap',
      defaultValue: true,
    },
    zoomStep: {
      control: { type: 'number' },
      description: 'The zoom speed for the minimap',
      defaultValue: 2,
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={{ darkMode: false }}>
        <ReactFlowProvider>{Story()}</ReactFlowProvider>
      </ThemeProvider>
    ),
    GlobalStylesStorybookDecorator,
  ],
} satisfies Meta<typeof WrappedMinimap>;

export const MinimapProps: StoryObj<typeof WrappedMinimap> = {
  args: {
    zoomable: true,
    pannable: true,
    zoomStep: 2,
  },
};
