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
import { LabelNode as LabelNodeComponent } from './label_node';
import type { LabelNodeViewModel } from '../../types';
import { GlobalStylesStorybookDecorator } from '../../../../.storybook/decorators';
import { GlobalGraphStyles } from '../../graph/styles';

import '@xyflow/react/dist/style.css';

const meta: Meta<LabelNodeViewModel> = {
  title: 'Components/Graph Components/Label Node',
  args: {
    id: 'mixed-group',
    label: 'Mixed security activity',
    shape: 'label',
    color: 'primary',
    interactive: true,
    uniqueEventsCount: 2,
    uniqueAlertsCount: 2,
    ips: [
      '10.200.0.202',
      '192.14.29.80',
      '192.14.29.80',
      '74.25.14.20',
      '192.14.29.80',
      '10.200.0.202',
    ],
    countryCodes: ['us', 'ru', 'es', 'us', 'us'],
  },
  argTypes: {
    color: {
      options: ['primary', 'danger'],
      control: { type: 'radio' },
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
  label: LabelNodeComponent,
};

const Template: StoryFn<LabelNodeViewModel> = (args: LabelNodeViewModel) => (
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

export const LabelNode: StoryObj<LabelNodeViewModel> = {
  render: Template,
};
