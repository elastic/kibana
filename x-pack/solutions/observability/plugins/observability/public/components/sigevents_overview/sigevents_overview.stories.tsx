/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SigeventsOverview } from './sigevents_overview';

const meta: Meta<typeof SigeventsOverview> = {
  title: 'app/SigeventsOverview/SigeventsOverview',
  component: SigeventsOverview,
  argTypes: {
    state: {
      control: 'select',
      options: ['critical', 'warning', 'healthy'],
    },
    blastRadiusScore: {
      control: { type: 'range', min: 0, max: 100 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SigeventsOverview>;

export const Critical: Story = {
  args: {
    state: 'critical',
    blastRadiusScore: 90,
    onRemediate: action('onRemediate'),
    onViewDetails: action('onViewDetails'),
  },
};

export const HighScore: Story = {
  args: {
    ...Critical.args,
    blastRadiusScore: 95,
  },
};

export const ModerateScore: Story = {
  args: {
    ...Critical.args,
    blastRadiusScore: 65,
  },
};

export const CustomImpactedServices: Story = {
  args: {
    ...Critical.args,
    mainEventTitle: 'Database connection pool exhausted on checkout and payment',
    impactedServices: [
      { id: 'postgres', label: 'postgres', iconType: 'package' },
      { id: 'checkout', label: 'checkout', iconType: 'package' },
      { id: 'payment', label: 'payment', iconType: 'package' },
    ],
  },
};

export const CustomImpactedCards: Story = {
  args: {
    ...Critical.args,
    impactedCards: [
      { id: 'service-auth', label: 'Service', value: 'auth', iconType: 'package' },
      { id: 'service-payment', label: 'Service', value: 'payment', iconType: 'package' },
      { id: 'service-checkout', label: 'Service', value: 'checkout', iconType: 'package' },
      { id: 'dropped', label: 'Dropped events', value: '1.2M', iconType: 'warning' },
    ],
  },
};

export const NoImpactedCards: Story = {
  args: {
    ...Critical.args,
    impactedCards: [],
  },
};

export const Healthy: Story = {
  args: {
    ...Critical.args,
    state: 'healthy',
  },
};
