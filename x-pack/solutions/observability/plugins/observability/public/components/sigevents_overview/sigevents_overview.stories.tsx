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
    criticalCount: {
      control: { type: 'number', min: 0 },
    },
    highCount: {
      control: { type: 'number', min: 0 },
    },
    significantEventsCount: {
      control: { type: 'number', min: 0 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SigeventsOverview>;

export const Critical: Story = {
  args: {
    state: 'critical',
    blastRadiusScore: 85,
    criticalCount: 6,
    highCount: 7,
    significantEventsCount: 24,
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onAttachEntity: action('onAttachEntity'),
    onAttachEvent: action('onAttachEvent'),
    onOpenConversation: action('onOpenConversation'),
  },
};

export const HighScore: Story = {
  args: {
    ...Critical.args,
    blastRadiusScore: 95,
    criticalCount: 12,
    highCount: 15,
    significantEventsCount: 48,
  },
};

export const ModerateScore: Story = {
  args: {
    ...Critical.args,
    blastRadiusScore: 65,
    criticalCount: 2,
    highCount: 4,
    significantEventsCount: 8,
  },
};

export const CustomEntities: Story = {
  args: {
    ...Critical.args,
    entities: [
      {
        id: 'critical',
        title: 'Production database servers',
        iconType: 'errorFilled',
        iconColor: 'danger',
        badgeLabel: '3/12',
        badgeColor: 'danger',
      },
      {
        id: 'high',
        title: 'API gateway instances',
        iconType: 'alert',
        iconColor: 'warning',
        badgeLabel: '5/20',
        badgeColor: 'warning',
      },
      {
        id: 'sig',
        title: 'Active alerts',
        iconType: 'errorFilled',
        iconColor: 'danger',
        badgeLabel: '15',
        badgeColor: 'danger',
      },
    ],
  },
};

export const CustomSignificantEvents: Story = {
  args: {
    ...Critical.args,
    significantEvents: [
      {
        id: '1',
        label: 'Database Connection Pool Exhaustion',
        subtitle: 'logs · postgres-primary',
        severityLabel: 'Critical',
        severityColor: 'danger',
      },
      {
        id: '2',
        label: 'Memory Usage Spike on Worker Nodes',
        subtitle: 'metrics · kubernetes-workers',
        severityLabel: 'High',
        severityColor: 'warning',
      },
      {
        id: '3',
        label: 'Increased Error Rate on Payment Service',
        subtitle: 'logs · payment-gateway',
        severityLabel: 'Critical',
        severityColor: 'danger',
      },
      {
        id: '4',
        label: 'Network Latency Between Data Centers',
        subtitle: 'metrics · network',
        severityLabel: 'High',
        severityColor: 'warning',
      },
    ],
  },
};

export const CustomMetrics: Story = {
  args: {
    ...Critical.args,
    metrics: [
      {
        subtitle: 'logs.postgres.error',
        value: 45200,
        domainMax: 100000,
        extra: { value: '+45%' },
      },
      {
        subtitle: 'metrics.cpu.usage',
        value: 78,
        domainMax: 100,
        extra: { value: '+12%' },
      },
    ],
  },
};

export const CustomRemediationSteps: Story = {
  args: {
    ...Critical.args,
    remediationSteps: [
      { id: '1', label: 'Scale up database connection pool' },
      { id: '2', label: 'Restart affected worker nodes' },
      { id: '3', label: 'Clear cache on API gateway' },
      { id: '4', label: 'Update incident status in PagerDuty' },
      { id: '5', label: 'Create post-mortem document' },
    ],
  },
};
