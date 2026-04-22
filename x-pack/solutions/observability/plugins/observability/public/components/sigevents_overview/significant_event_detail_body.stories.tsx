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
  argTypes: {
    relevanceScore: {
      control: { type: 'range', min: 0, max: 100 },
    },
    suggestionsCount: {
      control: { type: 'number', min: 0 },
    },
  },
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
    relevanceScore: 75,
    suggestionsCount: 2,
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onOpenConversation: action('onOpenConversation'),
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
    relevanceScore: 62,
    suggestionsCount: 3,
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onOpenConversation: action('onOpenConversation'),
  },
};

export const LowRelevance: Story = {
  args: {
    event: {
      id: '3',
      label: 'Background Job Scheduler - Missed Execution Windows',
      subtitle: 'metrics · job-runner',
      severityLabel: 'High',
      severityColor: 'warning',
    },
    relevanceScore: 25,
    suggestionsCount: 1,
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onOpenConversation: action('onOpenConversation'),
  },
};

export const CustomMetrics: Story = {
  args: {
    event: {
      id: '4',
      label: 'Database Connection Pooling - Potential Bottleneck',
      subtitle: 'metrics · orders-db',
      severityLabel: 'Critical',
      severityColor: 'danger',
    },
    relevanceScore: 88,
    suggestionsCount: 4,
    metrics: [
      {
        subtitle: 'db.connections.active',
        value: 450,
        domainMax: 500,
        extra: { value: '+90%' },
      },
      {
        subtitle: 'db.queries.slow',
        value: 125,
        domainMax: 200,
        extra: { value: '+45%' },
      },
    ],
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onOpenConversation: action('onOpenConversation'),
  },
};

export const CustomRemediationSteps: Story = {
  args: {
    event: {
      id: '5',
      label: 'Kubernetes Control Plane - Elevated API Latency',
      subtitle: 'metrics · kube-system',
      severityLabel: 'Critical',
      severityColor: 'danger',
    },
    relevanceScore: 92,
    suggestionsCount: 5,
    remediationSteps: [
      { id: '1', label: 'Check etcd cluster health' },
      { id: '2', label: 'Review API server logs' },
      { id: '3', label: 'Scale control plane nodes' },
      { id: '4', label: 'Verify network policies' },
      { id: '5', label: 'Update monitoring alerts' },
    ],
    onRemediate: action('onRemediate'),
    onRunInBackground: action('onRunInBackground'),
    onOpenConversation: action('onOpenConversation'),
  },
};
