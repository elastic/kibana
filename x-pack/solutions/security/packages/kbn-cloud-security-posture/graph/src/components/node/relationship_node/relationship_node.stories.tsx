/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import { ReactFlow, Background } from '@xyflow/react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { RelationshipNode as RelationshipNodeComponent } from './relationship_node';
import type { RelationshipNodeViewModel } from '../../types';
import { GlobalStylesStorybookDecorator } from '../../../../.storybook/decorators';
import { GlobalGraphStyles } from '../../graph/styles';

import '@xyflow/react/dist/style.css';

const meta: Meta<RelationshipNodeViewModel> = {
  title: 'Components/Graph Components/Relationship Node',
  args: {
    id: 'relationship-1',
    label: 'Owns',
    shape: 'relationship',
    interactive: false,
  },
  argTypes: {
    label: {
      control: { type: 'text' },
    },
    interactive: {
      control: {
        type: 'boolean',
      },
    },
  },
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;

const nodeTypes = {
  relationship: RelationshipNodeComponent,
};

const Template: StoryFn<RelationshipNodeViewModel> = (args: RelationshipNodeViewModel) => (
  <ThemeProvider theme={{ darkMode: false }}>
    <ReactFlow
      fitView
      attributionPosition={undefined}
      nodeTypes={nodeTypes}
      nodes={[
        {
          id: args.id,
          type: args.shape,
          data: args,
          position: { x: 0, y: 0 },
        },
      ]}
    >
      <Background />
    </ReactFlow>
    <GlobalGraphStyles />
  </ThemeProvider>
);

export const RelationshipNode: StoryObj<RelationshipNodeViewModel> = {
  render: Template,
};
