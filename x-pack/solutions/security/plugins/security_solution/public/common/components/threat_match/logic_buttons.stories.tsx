/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';

import { LogicButtons } from './logic_buttons';

const meta: Meta<typeof LogicButtons> = {
  title: 'ThreatMatching/LogicButtons',
  component: LogicButtons,
  decorators: [
    (Story) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LogicButtons>;

export const AndOrButtons: Story = {
  name: 'and/or buttons',
  args: {
    isAndDisabled: false,
    isOrDisabled: false,
    onOrClicked: action('onClick'),
    onAndClicked: action('onClick'),
  },
};

export const AndDisabled: Story = {
  name: 'and disabled',
  args: {
    isAndDisabled: true,
    isOrDisabled: false,
    onOrClicked: action('onClick'),
    onAndClicked: action('onClick'),
  },
};

export const OrDisabled: Story = {
  name: 'or disabled',
  args: {
    isAndDisabled: false,
    isOrDisabled: true,
    onOrClicked: action('onClick'),
    onAndClicked: action('onClick'),
  },
};
