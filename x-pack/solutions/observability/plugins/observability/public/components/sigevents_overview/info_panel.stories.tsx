/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiButton, EuiText } from '@elastic/eui';
import { InfoPanel } from './info_panel';

const meta: Meta<typeof InfoPanel> = {
  title: 'app/SigeventsOverview/InfoPanel',
  component: InfoPanel,
};

export default meta;
type Story = StoryObj<typeof InfoPanel>;

export const Basic: Story = {
  args: {
    title: 'Summary',
    children: (
      <EuiText size="s">
        <p>
          This is a basic info panel with some content. It can contain any React children including
          text, lists, or other components.
        </p>
      </EuiText>
    ),
  },
};

export const WithHeaderAction: Story = {
  args: {
    title: 'Details',
    headerRightContent: (
      <EuiButton data-test-subj="o11yViewAllButton" size="s">
        View all
      </EuiButton>
    ),
    children: (
      <EuiText size="s">
        <p>Panel with a header action button on the right side.</p>
      </EuiText>
    ),
  },
};

export const LongContent: Story = {
  args: {
    title: 'General information',
    children: (
      <EuiText size="s">
        <p>
          Significant events highlight unusual patterns in your streams—spikes, drops, or rare
          combinations worth reviewing before they affect dependent services. The summary below
          reflects the same framing as Significant Events discovery: what changed, on which streams,
          and how severe the shift is relative to baseline.
        </p>
        <p>
          This signal was raised on logs · fleet-coordination. Fleet Server Dependency Chain -
          Single Point of Failure reflects a statistically significant deviation from the expected
          pattern for the selected window—review downstream dependencies and blast radius before
          changes propagate.
        </p>
      </EuiText>
    ),
  },
};
