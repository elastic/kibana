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
import { NodeViewModel } from '../types';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';
import { HexagonNode, PentagonNode, EllipseNode, RectangleNode, DiamondNode, LabelNode } from '.';

import '@xyflow/react/dist/style.css';

const meta: Meta<NodeViewModel> = {
  title: 'Components/Graph Components',
  argTypes: {
    color: {
      options: ['primary', 'danger', 'warning'],
      control: { type: 'radio' },
    },
    shape: {
      options: ['ellipse', 'hexagon', 'pentagon', 'rectangle', 'diamond', 'label'],
      control: { type: 'radio' },
    },
    entityType: {
      options: ['user', 'host', 'other'],
      control: { type: 'radio' },
    },
    expandButtonClick: { action: 'expandButtonClick' },
  },
  args: {
    id: 'siem-windows',
    label: 'Entity Name',
    color: 'primary',
    shape: 'hexagon',
    icon: 'okta',
    interactive: true,
    entityType: 'host',
    secondaryLabel: 'Detail information',
    flagBadges: [
      { flag: '🇺🇸', count: 5 },
      { flag: '🇬🇧', count: 99 },
    ],
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
  label: LabelNode,
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
          data: pick(args, ['id', 'label', 'color', 'icon', 'interactive', 'expandButtonClick', 'entityType', 'secondaryLabel', 'flagBadges']),
          position: { x: 0, y: 0 },
        },
      ]}
    >
      <Controls />
      <Background />
    </ReactFlow>
  </ThemeProvider>
);

export const Node: StoryObj<NodeViewModel> = {
  render: Template,
};
