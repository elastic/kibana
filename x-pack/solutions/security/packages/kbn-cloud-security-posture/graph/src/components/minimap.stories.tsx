/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@emotion/react';
import { ReactFlowProvider, ReactFlow, type Node } from '@xyflow/react';
import { Minimap as MinimapComp, type MinimapProps } from './minimap';
import { GlobalStylesStorybookDecorator } from '../../.storybook/decorators';
import type {
  EdgeViewModel,
  EntityNodeViewModel,
  LabelNodeViewModel,
  NodeViewModel,
} from './types';

const nodes: Array<EntityNodeViewModel | LabelNodeViewModel> = [
  {
    id: 'admin@example.com',
    label: 'admin@example.com',
    color: 'primary',
    shape: 'ellipse',
    icon: 'user',
  },
  {
    id: 'projects/your-project-id/roles/customRole',
    label: 'projects/your-project-id/roles/customRole',
    color: 'primary',
    shape: 'hexagon',
    icon: 'question',
  },
  {
    id: 'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
    label: 'google.iam.admin.v1.CreateRole',
    source: 'admin@example.com',
    target: 'projects/your-project-id/roles/customRole',
    color: 'primary',
    shape: 'label',
  },
];

const edges: EdgeViewModel[] = [
  {
    id: 'a(admin@example.com)-b(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))',
    source: 'admin@example.com',
    sourceShape: 'ellipse',
    target:
      'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
    targetShape: 'label',
    color: 'primary',
  },
  {
    id: 'a(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))-b(projects/your-project-id/roles/customRole)',
    source:
      'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
    sourceShape: 'label',
    target: 'projects/your-project-id/roles/customRole',
    targetShape: 'hexagon',
    color: 'primary',
  },
];

const WrappedMinimap = (props: MinimapProps) => {
  // TODO Convert nodes into nodesState

  // eslint-disable-next-line no-console
  console.log(nodes);

  const nodesState: Node<NodeViewModel>[] = [];
  return (
    <ReactFlow nodes={nodesState} edges={edges} fitView>
      <MinimapComp {...props} nodesState={nodesState} />
    </ReactFlow>
  );
};

export default {
  title: 'Components/Graph Components/Additional Components/Minimap',
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
      control: { type: 'number', min: 0.1, max: 5, step: 0.1 },
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

export const Minimap: StoryObj<typeof WrappedMinimap> = {
  args: {
    zoomable: true,
    pannable: true,
    zoomStep: 2,
  },
};
