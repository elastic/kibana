/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StreamsMetricTiles } from './streams_metric_tiles';

const meta: Meta<typeof StreamsMetricTiles> = {
  title: 'app/SigeventsOverview/StreamsMetricTiles',
  component: StreamsMetricTiles,
  argTypes: {
    height: {
      control: { type: 'range', min: 100, max: 300 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StreamsMetricTiles>;

export const Default: Story = {
  args: {
    height: 160,
  },
};

export const CustomMetrics: Story = {
  args: {
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
    height: 160,
  },
};

export const HighValues: Story = {
  args: {
    metrics: [
      {
        subtitle: 'logs.application.error',
        value: 1250000,
        domainMax: 2000000,
        extra: { value: '+85%' },
      },
      {
        subtitle: 'logs.network.timeout',
        value: 890000,
        domainMax: 1000000,
        extra: { value: '+62%' },
      },
    ],
    height: 160,
  },
};

export const LowValues: Story = {
  args: {
    metrics: [
      {
        subtitle: 'logs.debug.trace',
        value: 125,
        domainMax: 500,
        extra: { value: '+5%' },
      },
      {
        subtitle: 'metrics.memory.mb',
        value: 2048,
        domainMax: 8192,
        extra: { value: '-3%' },
      },
    ],
    height: 160,
  },
};

export const TallerChart: Story = {
  args: {
    height: 240,
  },
};
