/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Meta, Story } from '@storybook/react/types-6-0';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../../../test_utils/use_global_storybook_theme';
import type { PodMetricsTableProps } from './pod_metrics_table';
import { PodMetricsTable } from './pod_metrics_table';
import { PodNodeMetricsRow } from './use_pod_metrics_table';

const mockServices = {
  application: {
    getUrlForApp: (app: string, { path }: { path: string }) => `your-kibana/app/${app}/${path}`,
  },
};

export default {
  title: 'infra/Node Metrics Tables/Pod',
  decorators: [
    (wrappedStory) => <EuiCard title="Pod metrics">{wrappedStory()}</EuiCard>,
    (wrappedStory) => (
      <I18nProvider>
        <KibanaContextProvider services={mockServices}>{wrappedStory()}</KibanaContextProvider>
      </I18nProvider>
    ),
    decorateWithGlobalStorybookThemeProviders,
  ],
  component: PodMetricsTable,
  args: {
    data: {
      state: 'empty-indices',
    },
    isLoading: false,
    sortState: {
      direction: 'desc',
      field: 'averageCpuUsagePercent',
    },
    timerange: {
      from: 'now-15m',
      to: 'now',
    },
  },
  argTypes: {
    setSortState: {
      action: 'Sort field or direction changed',
    },
    setCurrentPageIndex: {
      action: 'Page changed',
    },
  },
} as Meta;

const loadedPods: PodNodeMetricsRow[] = [
  {
    id: '358d96e3-026f-4440-a487-f6c2301884c0',
    name: 'gke-edge-oblt-pool-1-9a60016d-lgg1',
    averageCpuUsagePercent: 99,
    averageMemoryUsageMegabytes: 34,
  },
  {
    id: '358d96e3-026f-4440-a487-f6c2301884c1',
    name: 'gke-edge-oblt-pool-1-9a60016d-lgg2',
    averageCpuUsagePercent: 72,
    averageMemoryUsageMegabytes: 68,
  },
  {
    id: '358d96e3-026f-4440-a487-f6c2301884c0',
    name: 'gke-edge-oblt-pool-1-9a60016d-lgg3',
    averageCpuUsagePercent: 54,
    averageMemoryUsageMegabytes: 132,
  },
  {
    id: '358d96e3-026f-4440-a487-f6c2301884c0',
    name: 'gke-edge-oblt-pool-1-9a60016d-lgg4',
    averageCpuUsagePercent: 34,
    averageMemoryUsageMegabytes: 264,
  },
  {
    id: '358d96e3-026f-4440-a487-f6c2301884c0',
    name: 'gke-edge-oblt-pool-1-9a60016d-lgg5',
    averageCpuUsagePercent: 13,
    averageMemoryUsageMegabytes: 512,
  },
];

const Template: Story<PodMetricsTableProps> = (args) => {
  return <PodMetricsTable {...args} />;
};

export const Basic = Template.bind({});
Basic.args = {
  data: {
    state: 'data',
    currentPageIndex: 1,
    pageCount: 10,
    rows: loadedPods,
  },
};

export const Loading = Template.bind({});
Loading.args = {
  isLoading: true,
};

export const Reloading = Template.bind({});
Reloading.args = {
  data: {
    state: 'data',
    currentPageIndex: 1,
    pageCount: 10,
    rows: loadedPods,
  },
  isLoading: true,
};

export const MissingIndices = Template.bind({});
MissingIndices.args = {
  data: {
    state: 'no-indices',
  },
};

export const EmptyIndices = Template.bind({});
EmptyIndices.args = {
  data: {
    state: 'empty-indices',
  },
};

export const FailedToLoadSource = Template.bind({});
FailedToLoadSource.args = {
  data: {
    state: 'error',
    errors: [new Error('Failed to load source configuration')],
  },
};

export const FailedToLoadMetrics = Template.bind({});
FailedToLoadMetrics.args = {
  data: {
    state: 'error',
    errors: [new Error('Failed to load metrics')],
  },
};
