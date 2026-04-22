/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiBadge, EuiHealth } from '@elastic/eui';
import { MetadataIconCard } from './metadata_icon_card';

const meta: Meta<typeof MetadataIconCard> = {
  title: 'app/SigeventsOverview/MetadataIconCard',
  component: MetadataIconCard,
  argTypes: {
    hideIcon: {
      control: 'boolean',
    },
    iconType: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MetadataIconCard>;

export const WithIcon: Story = {
  args: {
    title: 'Healthy entities',
    value: '24',
    iconType: 'alert',
    color: '#d3f5e8',
    iconColor: '#00bfae',
    hideIcon: false,
  },
};

export const DangerIcon: Story = {
  args: {
    title: 'Affected systems',
    value: '20',
    iconType: 'indexOpen',
    color: '#fde8e8',
    iconColor: '#bd271e',
    hideIcon: false,
  },
};

export const WarningIcon: Story = {
  args: {
    title: 'At risk',
    value: '4',
    iconType: 'clock',
    color: '#fff3cd',
    iconColor: '#f5a700',
    hideIcon: false,
  },
};

export const WithoutIcon: Story = {
  args: {
    title: 'Severity',
    value: <EuiHealth color="danger">Critical</EuiHealth>,
    hideIcon: true,
  },
};

export const WithBadgeValue: Story = {
  args: {
    title: 'Relevance',
    value: <EuiBadge color="accent">75</EuiBadge>,
    hideIcon: true,
  },
};

export const MultipleCards: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '600px' }}>
      <div style={{ flex: '1 1 180px' }}>
        <MetadataIconCard
          title="Healthy entities"
          value="24"
          iconType="alert"
          color="#d3f5e8"
          iconColor="#00bfae"
        />
      </div>
      <div style={{ flex: '1 1 180px' }}>
        <MetadataIconCard
          title="Affected systems"
          value="20"
          iconType="indexOpen"
          color="#fde8e8"
          iconColor="#bd271e"
        />
      </div>
      <div style={{ flex: '1 1 180px' }}>
        <MetadataIconCard
          title="At risk"
          value="4"
          iconType="clock"
          color="#fff3cd"
          iconColor="#f5a700"
        />
      </div>
    </div>
  ),
};
