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

// Additional stories for comprehensive testing scenarios
export const NodeColorVariants: StoryObj = {
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
      position: { x: index * 150, y: 0 },
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

export const NodeEdgeCases: StoryObj = {
  render: () => {
    const edgeCaseNodes = [
      {
        id: 'empty-node',
        type: 'rectangle',
        data: {
          id: 'empty-node',
          interactive: true,
          shape: 'rectangle',
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'no-label-node',
        type: 'ellipse',
        data: {
          id: 'no-label-with-tag',
          tag: 'Host',
          color: 'primary',
          interactive: true,
          shape: 'ellipse',
        },
        position: { x: 150, y: 0 },
      },
      {
        id: 'many-ips-node',
        type: 'pentagon',
        data: {
          id: 'many-ips-node',
          label: 'Multi-IP Server',
          tag: 'Server',
          ips: Array.from({ length: 15 }, (_, i) => `192.168.1.${i + 1}`),
          color: 'warning',
          interactive: true,
          shape: 'pentagon',
        },
        position: { x: 300, y: 0 },
      },
      {
        id: 'count-zero-node',
        type: 'diamond',
        data: {
          id: 'count-zero-node',
          label: 'Zero Count',
          tag: 'Process',
          count: 0,
          color: 'danger',
          interactive: true,
          shape: 'diamond',
        },
        position: { x: 450, y: 0 },
      },
    ];

    return (
      <ThemeProvider theme={{ darkMode: false }}>
        <ReactFlow
          fitView
          attributionPosition={undefined}
          nodeTypes={nodeTypes}
          nodes={edgeCaseNodes}
        >
          <Controls />
          <Background />
        </ReactFlow>
        <GlobalGraphStyles />
      </ThemeProvider>
    );
  },
};

export const NodeInteractivityStates: StoryObj = {
  render: () => {
    const interactivityNodes = [
      {
        id: 'interactive-node',
        type: 'hexagon',
        data: {
          id: 'interactive-node',
          label: 'Interactive Node',
          tag: 'Interactive',
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
          tag: 'Static',
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

export const NodeWithMixedFlags: StoryObj = {
  render: () => {
    const flagNodes = [
      {
        id: 'single-flag-node',
        type: 'ellipse',
        data: {
          id: 'single-flag-node',
          label: 'Single Flag',
          tag: 'Host',
          countryCodes: ['us'],
          color: 'primary',
          interactive: true,
          shape: 'ellipse',
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'multiple-flags-node',
        type: 'ellipse',
        data: {
          id: 'multiple-flags-node',
          label: 'Multiple Flags',
          tag: 'Host',
          countryCodes: ['us', 'gb', 'fr', 'de', 'jp'],
          color: 'primary',
          interactive: true,
          shape: 'ellipse',
        },
        position: { x: 200, y: 0 },
      },
      {
        id: 'many-flags-node',
        type: 'ellipse',
        data: {
          id: 'many-flags-node',
          label: 'Many Flags',
          tag: 'Host',
          countryCodes: ['us', 'gb', 'fr', 'de', 'jp', 'au', 'ca', 'br', 'in', 'cn'],
          color: 'primary',
          interactive: true,
          shape: 'ellipse',
        },
        position: { x: 400, y: 0 },
      },
    ];

    return (
      <ThemeProvider theme={{ darkMode: false }}>
        <ReactFlow fitView attributionPosition={undefined} nodeTypes={nodeTypes} nodes={flagNodes}>
          <Controls />
          <Background />
        </ReactFlow>
        <GlobalGraphStyles />
      </ThemeProvider>
    );
  },
};
