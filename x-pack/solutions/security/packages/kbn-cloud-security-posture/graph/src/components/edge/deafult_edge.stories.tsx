/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import {
  ReactFlow,
  Controls,
  Background,
  Position,
  Handle,
  useNodesState,
  useEdgesState,
  type BuiltInNode,
  type NodeProps,
} from '@xyflow/react';
import { Story } from '@storybook/react';
import { SvgDefsMarker } from './styles';
import { DefaultEdge } from '.';

import '@xyflow/react/dist/style.css';
import { LabelNode } from '../node';
import type { NodeViewModel } from '../types';

export default {
  title: 'Components/Graph Components/Default Edge',
  description: 'CDR - Graph visualization',
  argTypes: {
    color: {
      options: ['primary', 'danger', 'warning'],
      control: { type: 'radio' },
    },
  },
};

const nodeTypes = {
  default: ((props: NodeProps<BuiltInNode>) => {
    const handleStyle = {
      width: 0,
      height: 0,
      'min-width': 0,
      'min-height': 0,
      border: 'none',
    };
    return (
      <div>
        <Handle type="source" position={Position.Right} style={handleStyle} />
        <Handle type="target" position={Position.Left} style={handleStyle} />
        {props.data.label}
      </div>
    );
  }) as React.FC<NodeProps<BuiltInNode>>,
  label: LabelNode,
};

const edgeTypes = {
  default: DefaultEdge,
};

const Template: Story<NodeViewModel> = (args: NodeViewModel) => {
  const initialNodes = [
    {
      id: 'source',
      type: 'default',
      data: { label: 'source' },
      position: { x: 0, y: 0 },
      draggable: true,
    },
    {
      id: 'target',
      type: 'default',
      data: { label: 'target' },
      position: { x: 320, y: 100 },
      draggable: true,
    },
    {
      id: args.id,
      type: 'label',
      data: args,
      position: { x: 160, y: 50 },
      draggable: true,
    },
  ];

  const initialEdges = [
    {
      id: 'source-' + args.id,
      source: 'source',
      target: args.id,
      data: {
        id: 'source-' + args.id,
        source: 'source',
        sourceShape: 'rectangle',
        target: args.id,
        targetShape: 'label',
        color: args.color,
        interactive: true,
      },
      type: 'default',
    },
    {
      id: args.id + '-target',
      source: args.id,
      target: 'target',
      data: {
        id: args.id + '-target',
        source: args.id,
        sourceShape: 'label',
        target: 'target',
        targetShape: 'rectangle',
        color: args.color,
        interactive: true,
      },
      type: 'default',
    },
  ];

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <ThemeProvider theme={{ darkMode: false }}>
      <SvgDefsMarker />
      <ReactFlow
        fitView
        attributionPosition={undefined}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodes={nodes}
        edges={edges}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </ThemeProvider>
  );
};

export const Edge = Template.bind({});

Edge.args = {
  id: 'siem-windows',
  label: 'User login to OKTA',
  color: 'primary',
  icon: 'okta',
  interactive: true,
};
