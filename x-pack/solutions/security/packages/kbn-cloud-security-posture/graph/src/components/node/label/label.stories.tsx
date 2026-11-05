/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { pick } from 'lodash';
import { ReactFlow, Controls, Background } from '@xyflow/react';
import type { StoryFn, StoryObj } from '@storybook/react';
import type { NodeViewModel } from '../../types';
import { GlobalStylesStorybookDecorator } from '../../../../.storybook/decorators';
import { EntityCardNode, EventNode } from '..';

import '@xyflow/react/dist/style.css';

export default {
  title: 'Components/Graph Components/Additional Components/Labels',
  description: 'CDR - Graph visualization',
  argTypes: {
    color: {
      options: ['primary', 'danger', 'warning'],
      control: { type: 'radio' },
    },
    kind: {
      options: ['entity', 'event'],
      control: { type: 'radio' },
    },
    expandButtonClick: { action: 'expandButtonClick' },
  },
  decorators: [GlobalStylesStorybookDecorator],
};

const nodeTypes = {
  entity: EntityCardNode,
  event: EventNode,
};

const Template: StoryFn<NodeViewModel> = (args: NodeViewModel) => (
  <ReactFlow
    fitView
    attributionPosition={undefined}
    nodeTypes={nodeTypes}
    nodes={[
      {
        id: args.id,
        type: args.kind,
        data: pick(args, ['id', 'label', 'color', 'icon', 'interactive', 'expandButtonClick']),
        position: { x: 0, y: 0 },
      },
    ]}
  >
    <Controls />
    <Background />
  </ReactFlow>
);

export const ShortLabel: StoryObj<NodeViewModel> = {
  render: Template,

  args: {
    id: 'siem-windows',
    label: '',
    color: 'primary',
    kind: 'entity',
    icon: 'okta',
    interactive: true,
  },
};

export const ArnLabel: StoryObj<NodeViewModel> = {
  render: Template,

  args: {
    id: 'siem-windows',
    label: 'arn:aws:iam::1234567890:user/lorem-ipsumdol-sitamet-user-1234',
    color: 'primary',
    kind: 'entity',
    icon: 'okta',
    interactive: true,
  },
};

export const DashedLabel: StoryObj<NodeViewModel> = {
  render: Template,

  args: {
    id: 'siem-windows',
    label: 'lore-ipsumdol-sitameta-consectetu-adipis342',
    color: 'primary',
    kind: 'entity',
    icon: 'okta',
    interactive: true,
  },
};

export const NoSpacesLabel: StoryObj<NodeViewModel> = {
  render: Template,

  args: {
    id: 'siem-windows',
    label: 'LoremIpsumDolorSitAmetConsectetur123',
    color: 'primary',
    kind: 'entity',
    icon: 'okta',
    interactive: true,
  },
};

export const NoSpacesAllLoweredLabel: StoryObj<NodeViewModel> = {
  render: Template,

  args: {
    id: 'siem-windows',
    label: 'loremipsumdolorsitametconsectetur123',
    color: 'primary',
    kind: 'entity',
    icon: 'okta',
    interactive: true,
  },
};
