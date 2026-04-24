/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { RecommendationsPlanPanel } from './recommendations_plan_panel';

const meta: Meta<typeof RecommendationsPlanPanel> = {
  title: 'app/SigeventsOverview/RecommendationsPlanPanel',
  component: RecommendationsPlanPanel,
};

export default meta;
type Story = StoryObj<typeof RecommendationsPlanPanel>;

export const Default: Story = {
  args: {
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};

export const SingleStep: Story = {
  args: {
    steps: [
      {
        id: '1',
        title: 'Restart the service',
        description:
          'Restart the upstream service and watch its readiness probe stabilise before reopening traffic.',
      },
    ],
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};

export const ManySteps: Story = {
  args: {
    steps: [
      {
        id: '1',
        title: 'Identify the root cause',
        description:
          'Cross-reference the recent deploys, infra changes and traffic spikes that overlap with the elevated error rate window.',
      },
      {
        id: '2',
        title: 'Scale horizontal replicas',
        description:
          'Bump the number of replicas to absorb the additional load while remediation is in progress.',
      },
      {
        id: '3',
        title: 'Update the load balancer',
        description:
          'Drain unhealthy nodes from the load balancer pool to avoid routing requests to degraded pods.',
      },
      {
        id: '4',
        title: 'Notify stakeholders',
        description:
          'Post a status update in Slack and update the incident ticket with the remediation steps applied so far.',
      },
    ],
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};

export const StepsWithoutDescription: Story = {
  args: {
    steps: [
      { id: '1', title: 'Restart Cloud Run service' },
      { id: '2', title: 'Review active critical alerts' },
    ],
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};

export const DetailsOpen: Story = {
  args: {
    initialDetailsOpen: true,
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};

export const DetailsOpenAllStepsCollapsed: Story = {
  args: {
    initialDetailsOpen: true,
    initialOpenStepIds: [],
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};
