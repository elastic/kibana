/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RootCausePanel, RootCauseCode } from './root_cause_panel';

const meta: Meta<typeof RootCausePanel> = {
  title: 'app/SigeventsOverview/RootCausePanel',
  component: RootCausePanel,
};

export default meta;
type Story = StoryObj<typeof RootCausePanel>;

export const Default: Story = {
  args: {},
};

export const CustomDescription: Story = {
  args: {
    children: (
      <p>
        The <RootCauseCode>orders</RootCauseCode> Postgres primary is reporting{' '}
        <RootCauseCode>too_many_connections</RootCauseCode> ({' '}
        <RootCauseCode>pool_size=200</RootCauseCode> ) under sustained burst traffic. Workers are
        queuing on <RootCauseCode>pg_bouncer</RootCauseCode> connections leading to elevated
        checkout latency.
      </p>
    ),
  },
};

export const CustomTitle: Story = {
  args: {
    title: 'Confirmed root cause',
  },
};
