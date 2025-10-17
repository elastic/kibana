/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import { pick } from 'lodash';
import { ReactFlow, Controls, Background } from '@xyflow/react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import type { NodeViewModel } from '../types';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';
import { HexagonNode, PentagonNode, EllipseNode, RectangleNode, DiamondNode } from '.';

import '@xyflow/react/dist/style.css';
import { GlobalGraphStyles } from '../graph/styles';

const meta: Meta<NodeViewModel> = {
  title: 'Components/Graph Components/Node',
  argTypes: {
    color: {
      options: ['primary', 'danger', 'warning'],
      control: { type: 'radio' },
    },
    shape: {
      options: ['ellipse', 'hexagon', 'pentagon', 'rectangle', 'diamond'],
      control: { type: 'radio' },
    },
    expandButtonClick: { action: 'expandButtonClick' },
  },
  args: {
    id: 'siem-windows',
    label: 'tin-mpb-pro-15',
    tag: 'Host',
    ips: [
      '10.200.0.202',
      '192.14.29.80',
      '192.14.29.80',
      '74.25.14.20',
      '192.14.29.80',
      '10.200.0.202',
    ],
    countryCodes: ['us', 'ru', 'es', 'us', 'us'],
    count: 5,
    color: 'primary',
    shape: 'hexagon',
    icon: 'aws',
    interactive: true,
  },
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;

const nodeTypes = {
  hexagon: HexagonNode,
  pentagon: PentagonNode,
  ellipse: EllipseNode,
  rectangle: RectangleNode,
  diamond: DiamondNode,
};

const Template: StoryFn<NodeViewModel> = (args: NodeViewModel) => (
  <ThemeProvider theme={{ darkMode: false }}>
    <ReactFlow
      fitView
      attributionPosition={undefined}
      nodeTypes={nodeTypes}
      nodes={[
        {
          id: args.id,
          type: args.shape,
          data: pick(args, [
            'id',
            'tag',
            'label',
            'color',
            'icon',
            'count',
            'ips',
            'oss',
            'countryCodes',
            'interactive',
            'expandButtonClick',
          ]),
          position: { x: 0, y: 0 },
        },
      ]}
    >
      <Controls />
      <Background />
    </ReactFlow>
    <GlobalGraphStyles />
  </ThemeProvider>
);

export const Node: StoryObj<NodeViewModel> = {
  render: Template,
};

export const Colors: StoryObj = {
  parameters: {
    controls: { disable: true },
  },
  render: () => {
    const colorNodes = (['primary', 'danger', 'warning'] as const).map((color, index) => ({
      id: `color-${color}`,
      type: 'hexagon',
      data: {
        id: `color-${color}`,
        label: `${color} Node`,
        tag: 'Server',
        color,
        icon: 'storage',
        interactive: true,
        shape: 'hexagon',
      },
      position: { x: index * 200, y: 0 },
    }));

    return (
      <ThemeProvider theme={{ darkMode: false }}>
        <ReactFlow fitView attributionPosition={undefined} nodeTypes={nodeTypes} nodes={colorNodes}>
          <Controls />
          <Background />
        </ReactFlow>
        <GlobalGraphStyles />
      </ThemeProvider>
    );
  },
};

export const Shapes: StoryObj = {
  parameters: {
    controls: { disable: true },
  },
  render: () => {
    const shapes = (['hexagon', 'ellipse', 'rectangle', 'pentagon', 'diamond'] as const).map(
      (shape, index) => ({
        id: `entity-${shape}`,
        type: shape,
        data: {
          id: `entity-${shape}`,
          label: `${shape} node`,
          color: 'primary',
          icon: 'okta',
          interactive: true,
          shape,
        },
        position: { x: index * 200, y: 0 },
      })
    );

    return (
      <ThemeProvider theme={{ darkMode: false }}>
        <ReactFlow fitView attributionPosition={undefined} nodeTypes={nodeTypes} nodes={shapes}>
          <Controls />
          <Background />
        </ReactFlow>
        <GlobalGraphStyles />
      </ThemeProvider>
    );
  },
};

const detailsUseCases = {
  'No details': {},
  'Only Tag': { tag: 'Host' },
  'Tag and IPs': { tag: 'Host', ips: ['10.200.0.202', '74.25.14.20'] },
  'Tag and Country Codes': { tag: 'Host', countryCodes: ['us', 'fr', 'es'] },
  'Tag and Count > 1': { tag: 'Host', count: 2 },
  Everything: {
    tag: 'Host',
    count: 2,
    ips: ['10.200.0.202', '74.25.14.20'],
    countryCodes: ['us', 'fr', 'es'],
  },
};

export const Details: StoryObj = {
  parameters: {
    controls: { disable: true },
  },
  render: () => {
    const nodes = Object.entries(detailsUseCases).map(([useCaseName, props], index) => ({
      id: useCaseName,
      type: 'hexagon',
      data: {
        id: useCaseName,
        shape: 'hexagon',
        color: 'primary',
        icon: 'storage',
        interactive: true,
        ...props,
      },
      position: { x: index * 200, y: 0 },
    }));

    return (
      <ThemeProvider theme={{ darkMode: false }}>
        <ReactFlow fitView attributionPosition={undefined} nodeTypes={nodeTypes} nodes={nodes}>
          <Controls />
          <Background />
        </ReactFlow>
        <GlobalGraphStyles />
      </ThemeProvider>
    );
  },
};

export const Interactivity: StoryObj = {
  parameters: {
    controls: { disable: true },
  },
  render: () => {
    const interactivityNodes = [
      {
        id: 'interactive-node',
        type: 'hexagon',
        data: {
          id: 'interactive-node',
          label: 'Interactive Node',
          tag: 'Host',
          color: 'primary',
          icon: 'gear',
          interactive: true,
          shape: 'hexagon',
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'non-interactive-node',
        type: 'hexagon',
        data: {
          id: 'non-interactive-node',
          label: 'Non-Interactive Node',
          tag: 'Host',
          color: 'primary',
          icon: 'gear',
          interactive: false,
          shape: 'hexagon',
        },
        position: { x: 200, y: 0 },
      },
    ];

    return (
      <ThemeProvider theme={{ darkMode: false }}>
        <ReactFlow
          fitView
          attributionPosition={undefined}
          nodeTypes={nodeTypes}
          nodes={interactivityNodes}
        >
          <Controls />
          <Background />
        </ReactFlow>
        <GlobalGraphStyles />
      </ThemeProvider>
    );
  },
};
