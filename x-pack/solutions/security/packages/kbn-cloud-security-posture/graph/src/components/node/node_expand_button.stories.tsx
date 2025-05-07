/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-literals */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import type { Meta, StoryObj } from '@storybook/react';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';
import { NodeShapeContainer } from './styles';
import { NodeExpandButton } from './node_expand_button';

const meta = {
  component: NodeExpandButton,
  render: (args) => (
    <ThemeProvider theme={{ darkMode: false }}>
      <NodeShapeContainer>
        Hover me
        <NodeExpandButton color={args.color} onClick={args.onClick} />
      </NodeShapeContainer>
    </ThemeProvider>
  ),
  title: 'Components/Graph Components/Additional Components',
  argTypes: {
    onClick: { action: 'onClick' },
    color: {
      options: ['primary', 'danger', 'warning'],
      control: { type: 'radio' },
    },
  },
  args: {
    color: 'primary',
  },
  decorators: [GlobalStylesStorybookDecorator],
} satisfies Meta<typeof NodeExpandButton>;

export default meta;

export const ExpandButton: StoryObj<typeof meta> = {};
