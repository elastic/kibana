/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useRef } from 'react';
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
  type Node as xyNode,
  type Edge as xyEdge,
} from '@xyflow/react';
import { isEmpty, isEqual, pick, size, xorWith } from 'lodash';
import { Story } from '@storybook/react';
import { DefaultEdge } from '.';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';
import { LabelNode } from '../node';
import type { EdgeViewModel } from '../types';
import { SvgDefsMarker } from './markers';

import '@xyflow/react/dist/style.css';
import { HandleStyleOverride } from '../node/styles';

export default {
  title: 'Components/Graph Components',
  description: 'CDR - Graph visualization',
  argTypes: {
    color: {
      options: ['primary', 'danger', 'warning'],
      control: { type: 'radio' },
    },
    type: {
      options: ['solid', 'dashed'],
      control: { type: 'radio' },
    },
  },
  decorators: [GlobalStylesStorybookDecorator],
};

const nodeTypes = {
  // eslint-disable-next-line react/display-name
  default: memo<NodeProps<BuiltInNode>>((props: NodeProps<BuiltInNode>) => {
    return (
      <div>
        <Handle
          type="target"
          isConnectable={false}
          position={Position.Left}
          id="in"
          style={HandleStyleOverride}
        />
        <Handle
          type="source"
          isConnectable={false}
          position={Position.Right}
          id="out"
          style={HandleStyleOverride}
        />
        {props.data.label}
      </div>
    );
  }),
  label: LabelNode,
};

const edgeTypes = {
  default: DefaultEdge,
};

const Template: Story<EdgeViewModel> = (args: EdgeViewModel) => {
  const nodes = useMemo(
    () => [
      {
        id: 'source',
        type: 'default',
        data: {
          label: 'source',
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'target',
        type: 'default',
        data: {
          label: 'target',
        },
        position: { x: 420, y: 0 },
      },
      {
        id: args.id,
        type: 'label',
        data: pick(args, ['id', 'label', 'interactive', 'source', 'target', 'color', 'type']),
        position: { x: 230, y: 6 },
      },
    ],
    [args]
  );

  const edges = useMemo(
    () => [
      {
        id: `source-${args.id}`,
        source: 'source',
        target: args.id,
        data: {
          id: `source-${args.id}`,
          source: 'source',
          sourceShape: 'custom',
          target: args.id,
          targetShape: 'label',
          color: args.color,
          type: args.type,
        },
        type: 'default',
      },
      {
        id: `${args.id}-target`,
        source: args.id,
        target: 'target',
        data: {
          id: `${args.id}-target`,
          source: args.id,
          sourceShape: 'label',
          target: 'target',
          targetShape: 'custom',
          color: args.color,
          type: args.type,
        },
        type: 'default',
      },
    ],
    [args]
  );

  const [nodesState, setNodes, onNodesChange] = useNodesState<xyNode>(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState<xyEdge<EdgeViewModel>>(edges);
  const currNodesRef = useRef(nodes);
  const currEdgesRef = useRef(edges);

  useEffect(() => {
    if (
      !isArrayOfObjectsEqual(nodes, currNodesRef.current) ||
      !isArrayOfObjectsEqual(edges, currEdgesRef.current)
    ) {
      setNodes(nodes);
      setEdges(edges);
      currNodesRef.current = nodes;
      currEdgesRef.current = edges;
    }
  }, [setNodes, setEdges, nodes, edges]);

  return (
    <ThemeProvider theme={{ darkMode: false }}>
      <SvgDefsMarker />
      <ReactFlow
        fitView
        attributionPosition={undefined}
        nodesDraggable={true}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodes={nodesState}
        edges={edgesState}
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
  interactive: true,
  type: 'solid',
};

const isArrayOfObjectsEqual = (x: object[], y: object[]) =>
  size(x) === size(y) && isEmpty(xorWith(x, y, isEqual));
