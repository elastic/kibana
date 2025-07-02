/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-literals */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import type { StoryFn, StoryObj } from '@storybook/react';
import { NodeShapeContainer } from './styles';
import { NodeExpandButton, type NodeExpandButtonProps } from './node_expand_button';

export default {
  title: 'Components/Graph Components/Additional Components',
  description: 'CDR - Graph visualization',
  argTypes: {
    onClick: { action: 'onClick' },
    color: {
      options: ['primary', 'danger', 'warning'],
      control: { type: 'radio' },
      defaultValue: 'primary',
    },
  },
};

const Template: StoryFn<NodeExpandButtonProps> = (args) => (
  <ThemeProvider theme={{ darkMode: false }}>
    <NodeShapeContainer>
      Hover me
      <NodeExpandButton color={args.color} onClick={args.onClick} />
    </NodeShapeContainer>
  </ThemeProvider>
);

export const ExpandButton: StoryObj<NodeExpandButtonProps> = {
  render: Template,
};
