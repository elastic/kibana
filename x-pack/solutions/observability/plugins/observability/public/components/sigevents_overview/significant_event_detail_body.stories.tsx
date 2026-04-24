/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SignificantEventDetailBody } from './significant_event_detail_body';

const meta: Meta<typeof SignificantEventDetailBody> = {
  title: 'app/SigeventsOverview/SignificantEventDetailBody',
  component: SignificantEventDetailBody,
};

export default meta;
type Story = StoryObj<typeof SignificantEventDetailBody>;

export const CriticalEvent: Story = {
  args: {
    event: {
      id: '1',
      label: 'Fleet Server Dependency Chain - Single Point of Failure',
      subtitle: 'logs · fleet-coordination',
      severityLabel: 'Critical',
      severityColor: 'danger',
    },
    detectedAtLabel: 'Detected 5 minutes ago',
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};

export const HighSeverityEvent: Story = {
  args: {
    event: {
      id: '2',
      label: 'Central Authentication Server - Outage Impact',
      subtitle: 'metrics · identity',
      severityLabel: 'High',
      severityColor: 'warning',
    },
    detectedAtLabel: 'Detected 12 minutes ago',
    criticalityLabel: 'Medium',
    criticalityColor: 'warning',
    impactLabel: 'Medium',
    impactColor: 'warning',
    confidenceLabel: 'Medium (72%)',
    impactingLabel: '2 services',
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};

export const CustomMetadata: Story = {
  args: {
    event: {
      id: '4',
      label: 'Database Connection Pooling - Potential Bottleneck',
      subtitle: 'metrics · orders-db',
      severityLabel: 'Critical',
      severityColor: 'danger',
    },
    detectedAtLabel: 'Detected Jan 18, 2025 @ 14:12:31',
    criticalityLabel: 'High',
    criticalityColor: 'danger',
    impactLabel: 'High',
    impactColor: 'danger',
    recommendedActionLabel: 'Escalate',
    recommendedActionIconType: 'warning',
    confidenceLabel: 'High (95%)',
    impactingLabel: '6 services',
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};

export const CustomRecommendationSteps: Story = {
  args: {
    event: {
      id: '5',
      label: 'Kubernetes Control Plane - Elevated API Latency',
      subtitle: 'metrics · kube-system',
      severityLabel: 'Critical',
      severityColor: 'danger',
    },
    detectedAtLabel: 'Detected 3 minutes ago',
    recommendationSteps: [
      {
        id: '1',
        title: 'Check etcd cluster health',
        description:
          'Inspect etcd member health, leader election history, and disk fsync latency for signs of degraded consensus.',
      },
      {
        id: '2',
        title: 'Review API server logs',
        description:
          'Filter API server logs for elevated error rates and identify the noisiest clients responsible for the latency.',
      },
      {
        id: '3',
        title: 'Scale control plane nodes',
        description:
          'Add additional control plane replicas if CPU saturation is observed across the existing instances.',
      },
    ],
    onRemediate: action('onRemediate'),
    onOpenDetails: action('onOpenDetails'),
  },
};
