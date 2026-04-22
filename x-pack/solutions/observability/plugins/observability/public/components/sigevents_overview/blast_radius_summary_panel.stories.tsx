/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { BlastRadiusSummaryPanel } from './blast_radius_summary_panel';

const meta: Meta<typeof BlastRadiusSummaryPanel> = {
  title: 'app/SigeventsOverview/BlastRadiusSummaryPanel',
  component: BlastRadiusSummaryPanel,
  argTypes: {
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
type Story = StoryObj<typeof BlastRadiusSummaryPanel>;

export const Default: Story = {
  args: {
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

export const CriticalScore: Story = {
  args: {
    blastRadiusScore: 95,
    criticalCount: 12,
    highCount: 18,
    significantEventsCount: 48,
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onAttachEntity: action('onAttachEntity'),
    onAttachEvent: action('onAttachEvent'),
    onOpenConversation: action('onOpenConversation'),
  },
};

export const ModerateScore: Story = {
  args: {
    blastRadiusScore: 55,
    criticalCount: 2,
    highCount: 4,
    significantEventsCount: 8,
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onAttachEntity: action('onAttachEntity'),
    onAttachEvent: action('onAttachEvent'),
    onOpenConversation: action('onOpenConversation'),
  },
};

export const LowScore: Story = {
  args: {
    blastRadiusScore: 25,
    criticalCount: 0,
    highCount: 2,
    significantEventsCount: 3,
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onAttachEntity: action('onAttachEntity'),
    onAttachEvent: action('onAttachEvent'),
    onOpenConversation: action('onOpenConversation'),
  },
};

export const CustomEntities: Story = {
  args: {
    blastRadiusScore: 78,
    criticalCount: 4,
    highCount: 8,
    significantEventsCount: 15,
    entities: [
      {
        id: 'database',
        title: 'Production databases',
        iconType: 'errorFilled',
        iconColor: 'danger',
        badgeLabel: '2/8',
        badgeColor: 'danger',
      },
      {
        id: 'api',
        title: 'API services',
        iconType: 'alert',
        iconColor: 'warning',
        badgeLabel: '4/12',
        badgeColor: 'warning',
      },
      {
        id: 'sig',
        title: 'Active incidents',
        iconType: 'errorFilled',
        iconColor: 'danger',
        badgeLabel: '15',
        badgeColor: 'danger',
      },
    ],
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onAttachEntity: action('onAttachEntity'),
    onAttachEvent: action('onAttachEvent'),
    onOpenConversation: action('onOpenConversation'),
  },
};

export const CustomSignificantEvents: Story = {
  args: {
    blastRadiusScore: 82,
    criticalCount: 5,
    highCount: 6,
    significantEventsCount: 12,
    significantEvents: [
      {
        id: '1',
        label: 'Database connection pool exhausted',
        subtitle: 'logs · postgres',
        severityLabel: 'Critical',
        severityColor: 'danger',
      },
      {
        id: '2',
        label: 'Memory pressure on worker nodes',
        subtitle: 'metrics · k8s-workers',
        severityLabel: 'High',
        severityColor: 'warning',
      },
      {
        id: '3',
        label: 'Increased error rate on checkout',
        subtitle: 'logs · checkout-service',
        severityLabel: 'Critical',
        severityColor: 'danger',
      },
    ],
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onAttachEntity: action('onAttachEntity'),
    onAttachEvent: action('onAttachEvent'),
    onOpenConversation: action('onOpenConversation'),
  },
};
