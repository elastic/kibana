/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { RemediationPlanPanel } from './remediation_plan_panel';

const meta: Meta<typeof RemediationPlanPanel> = {
  title: 'app/SigeventsOverview/RemediationPlanPanel',
  component: RemediationPlanPanel,
};

export default meta;
type Story = StoryObj<typeof RemediationPlanPanel>;

export const Default: Story = {
  args: {
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onOpenConversation: action('onOpenConversation'),
  },
};

export const CustomSteps: Story = {
  args: {
    steps: [
      { id: '1', label: 'Scale up database connection pool' },
      { id: '2', label: 'Restart affected worker nodes' },
      { id: '3', label: 'Clear cache on API gateway' },
      { id: '4', label: 'Update incident status in PagerDuty' },
      { id: '5', label: 'Create post-mortem document' },
    ],
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onOpenConversation: action('onOpenConversation'),
  },
};

export const SingleStep: Story = {
  args: {
    steps: [{ id: '1', label: 'Restart the service' }],
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onOpenConversation: action('onOpenConversation'),
  },
};

export const ManySteps: Story = {
  args: {
    steps: [
      { id: '1', label: 'Identify root cause' },
      { id: '2', label: 'Scale horizontal replicas' },
      { id: '3', label: 'Update load balancer config' },
      { id: '4', label: 'Clear CDN cache' },
      { id: '5', label: 'Restart affected services' },
      { id: '6', label: 'Verify health checks' },
      { id: '7', label: 'Monitor for 15 minutes' },
      { id: '8', label: 'Update status page' },
      { id: '9', label: 'Notify stakeholders' },
      { id: '10', label: 'Schedule post-mortem' },
    ],
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onOpenConversation: action('onOpenConversation'),
  },
};
