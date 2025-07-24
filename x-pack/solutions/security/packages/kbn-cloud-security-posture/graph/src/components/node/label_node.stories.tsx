/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { LabelNode } from '../label_node';
import type { LabelNodeViewModel } from '../../types';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';

import '@xyflow/react/dist/style.css';

const meta: Meta<LabelNodeViewModel> = {
  title: 'Components/Graph Components/Label Node',
  argTypes: {
    color: {
      options: ['primary', 'danger', 'warning'],
      control: { type: 'radio' },
    },
  },
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;

const nodeTypes = {
  label: LabelNode,
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
          type: 'label',
          data: args,
          position: { x: 0, y: 0 },
        },
      ]}
    >
      <Controls />
      <Background />
    </ReactFlow>
  </ThemeProvider>
);

export const SingleEvent: StoryObj<LabelNodeViewModel> = {
  render: Template,
  args: {
    id: 'single-event',
    label: 'Process started',
    color: 'primary',
    shape: 'label',
    interactive: true,
    documentsData: [
      { id: 'event1', type: 'event' }
    ],
  },
};

export const SingleAlert: StoryObj<LabelNodeViewModel> = {
  render: Template,
  args: {
    id: 'single-alert',
    label: 'Malware detected',
    color: 'danger',
    shape: 'label',
    interactive: true,
    documentsData: [
      { id: 'alert1', type: 'alert' }
    ],
  },
};

export const GroupOfEvents: StoryObj<LabelNodeViewModel> = {
  render: Template,
  args: {
    id: 'group-events',
    label: 'Multiple processes started',
    color: 'primary',
    shape: 'label',
    interactive: true,
    documentsData: [
      { id: 'event1', type: 'event' },
      { id: 'event2', type: 'event' },
      { id: 'event3', type: 'event' },
    ],
  },
};

export const GroupOfAlerts: StoryObj<LabelNodeViewModel> = {
  render: Template,
  args: {
    id: 'group-alerts',
    label: 'Multiple security alerts',
    color: 'danger',
    shape: 'label',
    interactive: true,
    documentsData: [
      { id: 'alert1', type: 'alert' },
      { id: 'alert2', type: 'alert' },
      { id: 'alert3', type: 'alert' },
    ],
  },
};

export const GroupOfEventsAndAlerts: StoryObj<LabelNodeViewModel> = {
  render: Template,
  args: {
    id: 'mixed-group',
    label: 'Mixed security activity',
    color: 'danger',
    shape: 'label',
    interactive: true,
    documentsData: [
      { id: 'event1', type: 'event' },
      { id: 'event2', type: 'event' },
      { id: 'alert1', type: 'alert' },
      { id: 'alert2', type: 'alert' },
    ],
  },
};