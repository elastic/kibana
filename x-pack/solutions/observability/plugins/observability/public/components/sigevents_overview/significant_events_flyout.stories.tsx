/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SignificantEventsFlyout } from './significant_events_flyout';

const defaultEvents = [
  {
    id: '1',
    label: 'Fleet Server Dependency Chain - Single Point of Failure',
    subtitle: 'logs · fleet-coordination',
    severityLabel: 'Critical',
    severityColor: 'danger' as const,
  },
  {
    id: '2',
    label: 'Central Authentication Server - Outage Impact',
    subtitle: 'metrics · identity',
    severityLabel: 'High',
    severityColor: 'warning' as const,
  },
  {
    id: '3',
    label: 'Payment Gateway Integration - Downtime Risk',
    subtitle: 'logs · checkout',
    severityLabel: 'Critical',
    severityColor: 'danger' as const,
  },
  {
    id: '4',
    label: 'Primary DNS Server - Resolution Timeout Spike',
    subtitle: 'metrics · edge-dns',
    severityLabel: 'High',
    severityColor: 'warning' as const,
  },
  {
    id: '5',
    label: 'API Gateway Throttling - Impact on Microservices',
    subtitle: 'logs · api-gateway',
    severityLabel: 'Critical',
    severityColor: 'danger' as const,
  },
];

const meta: Meta<typeof SignificantEventsFlyout> = {
  title: 'app/SigeventsOverview/SignificantEventsFlyout',
  component: SignificantEventsFlyout,
  argTypes: {
    healthyEntities: {
      control: { type: 'number', min: 0 },
    },
    affectedSystems: {
      control: { type: 'number', min: 0 },
    },
    atRiskCount: {
      control: { type: 'number', min: 0 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SignificantEventsFlyout>;

export const Default: Story = {
  args: {
    events: defaultEvents,
    healthyEntities: 24,
    affectedSystems: 20,
    atRiskCount: 4,
    onClose: action('onClose'),
    onAttachEvent: action('onAttachEvent'),
    onRemediate: action('onRemediate'),

    onOpenDetails: action('onOpenDetails'),
  },
};

export const HighImpact: Story = {
  args: {
    events: defaultEvents,
    healthyEntities: 8,
    affectedSystems: 35,
    atRiskCount: 12,
    onClose: action('onClose'),
    onAttachEvent: action('onAttachEvent'),
    onRemediate: action('onRemediate'),

    onOpenDetails: action('onOpenDetails'),
  },
};

export const FewEvents: Story = {
  args: {
    events: defaultEvents.slice(0, 2),
    healthyEntities: 42,
    affectedSystems: 6,
    atRiskCount: 2,
    onClose: action('onClose'),
    onAttachEvent: action('onAttachEvent'),
    onRemediate: action('onRemediate'),

    onOpenDetails: action('onOpenDetails'),
  },
};

export const CustomSummary: Story = {
  args: {
    events: defaultEvents,
    healthyEntities: 24,
    affectedSystems: 20,
    atRiskCount: 4,
    summaryDescription:
      'Custom summary: These events have been detected across your infrastructure and require immediate attention. Review the blast radius before taking action.',
    onClose: action('onClose'),
    onAttachEvent: action('onAttachEvent'),
    onRemediate: action('onRemediate'),

    onOpenDetails: action('onOpenDetails'),
  },
};
