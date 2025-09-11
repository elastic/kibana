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
