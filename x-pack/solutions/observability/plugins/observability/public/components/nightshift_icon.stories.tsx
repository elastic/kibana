/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NightshiftIcon } from './nightshift_icon';

const meta: Meta<typeof NightshiftIcon> = {
  title: 'app/Observability/NightshiftIcon',
  component: NightshiftIcon,
  decorators: [
    (Story) => (
      <div style={{ padding: 40, background: '#1D1E24', display: 'inline-block' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NightshiftIcon>;

export const Large: Story = {
  args: {
    width: 256,
    height: 256,
  },
};

export const Medium: Story = {
  args: {
    width: 128,
    height: 128,
  },
};

export const NavSize: Story = {
  args: {
    width: 32,
    height: 32,
  },
};
