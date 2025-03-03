/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import type { Meta, StoryObj } from '@storybook/react';
import { euiLightVars } from '@kbn/ui-theme';

import { createItems, TEST_COLUMNS } from './test_utils';
import { ConditionsTable } from '.';

const meta: Meta<typeof ConditionsTable> = {
  title: 'Components/ConditionsTable',
  component: ConditionsTable,
  decorators: [
    (Story) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConditionsTable>;

export const SingleItem: Story = {
  name: 'single item',
  render: () => <ConditionsTable items={createItems(1)} columns={TEST_COLUMNS} badge="and" />,
};

export const And: Story = {
  name: 'and',
  render: () => <ConditionsTable items={createItems(3)} columns={TEST_COLUMNS} badge="and" />,
};

export const Or: Story = {
  name: 'or',
  render: () => <ConditionsTable items={createItems(3)} columns={TEST_COLUMNS} badge="or" />,
};
