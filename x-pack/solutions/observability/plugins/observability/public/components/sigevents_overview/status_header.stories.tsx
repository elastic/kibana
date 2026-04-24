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
};

export default meta;
type Story = StoryObj<typeof StatusHeader>;

export const Default: Story = {
  args: {},
};

export const CustomContent: Story = {
  args: {
    modeLabel: 'MONITORING',
    title: 'A critical event has been detected',
    description:
      'Review the affected services, escalate if needed, and start investigating from the significant event below.',
  },
};

export const CustomIcon: Story = {
  args: {
    iconType: 'alert',
    iconColor: 'warning',
    title: 'Warning: unusual patterns detected',
  },
};
