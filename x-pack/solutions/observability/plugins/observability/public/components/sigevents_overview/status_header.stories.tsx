/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StatusHeader } from './status_header';

const meta: Meta<typeof StatusHeader> = {
  title: 'app/SigeventsOverview/StatusHeader',
  component: StatusHeader,
  argTypes: {
    variant: {
      control: 'select',
      options: ['critical', 'noCriticalEvents'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusHeader>;

export const Critical: Story = {
  args: { variant: 'critical' },
};

export const NoCriticalEvents: Story = {
  args: { variant: 'noCriticalEvents' },
};

export const CustomContent: Story = {
  args: {
    variant: 'critical',
    title: 'A critical event has been detected',
    description:
      'Review the affected services, escalate if needed, and start investigating from the significant event below.',
  },
};

export const CustomIcon: Story = {
  args: {
    variant: 'critical',
    iconType: 'warning',
    title: 'Warning: unusual patterns detected',
  },
};
