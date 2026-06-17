/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { EntityAnalyticsAnomalies } from '.';
import type { AnomaliesCount } from '../../../common/components/ml/anomaly/use_anomalies_search';
import { AnomalyEntity } from '../../../common/components/ml/anomaly/use_anomalies_search';

import { TestProviders } from '../../../common/mock';
import type { SecurityJob } from '../../../common/components/ml_popover/types';

jest.mock('../../../common/components/ml_popover/hooks/use_enable_data_feed', () => ({
  useEnableDataFeed: () => ({
    loading: false,
    enableDatafeed: jest.fn().mockResolvedValue({ enabled: true }),
  }),
}));

// Query toggle only works if pageName.lenght > 0
jest.mock('../../../common/utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      pageName: 'not_empty',
    },
  ]),
}));

const mockUseAggregatedAnomaliesByJob = jest.fn().mockReturnValue({
  isLoading: false,
  data: [],
  refetch: jest.fn(),
});

jest.mock(
  '@kbn/ml-plugin/public/application/components/jobs_awaiting_node_warning/new_job_awaiting_node_shared/lazy_loader',
  () => {
    return {
      MLJobsAwaitingNodeWarning: () => <></>,
    };
  }
);

jest.mock('../../../common/components/ml/anomaly/use_anomalies_search', () => {
  const original = jest.requireActual('../../../common/components/ml/anomaly/use_anomalies_search');
  return {
    ...original,
    useAggregatedAnomaliesByJob: () => mockUseAggregatedAnomaliesByJob(),
  };
});

jest.mock('@kbn/ml-plugin/public', () => {
  const original = jest.requireActual('@kbn/ml-plugin/public');

  return {
    ...original,
    useMlHref: () => 'http://jobsUrl',
  };
});

describe('EntityAnalyticsAnomalies', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('entity_analytics_anomalies')).toBeInTheDocument();
  });

  it('renders links to anomalies pages', () => {
    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies_table_hosts_link')).toBeInTheDocument();
    expect(getByTestId('anomalies_table_users_link')).toBeInTheDocument();
    expect(getByTestId('anomalies_table_all')).toBeInTheDocument();
  });

  it('renders enabled jobs', () => {
    const jobCount: AnomaliesCount = {
      job: { isInstalled: true, datafeedState: 'started', jobState: 'opened' } as SecurityJob,
      name: 'v3_windows_anomalous_script',
      count: 9999,
      entity: AnomalyEntity.User,
    };

    mockUseAggregatedAnomaliesByJob.mockReturnValue({
      isLoading: false,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies-table-column-name')).toHaveTextContent(jobCount.name);
    expect(getByTestId('anomalies-table-column-count')).toHaveTextContent(
      jobCount.count.toString()
    );
  });

  it('renders disabled jobs', () => {
    const jobCount: AnomaliesCount = {
      job: {
        isInstalled: true,
        datafeedState: 'stopped',
        jobState: 'closed',
        isCompatible: true,
      } as SecurityJob,
      name: 'v3_windows_anomalous_script',
      count: 0,
      entity: AnomalyEntity.User,
    };

    mockUseAggregatedAnomaliesByJob.mockReturnValue({
      isLoading: false,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies-table-column-name')).toHaveTextContent(jobCount.name);
    expect(getByTestId('anomalies-table-column-count')).toHaveTextContent('Run job');
    expect(getByTestId('enable-job')).toBeInTheDocument();
  });

  it('renders uninstalled jobs', () => {
    const jobCount: AnomaliesCount = {
      job: { isInstalled: false, isCompatible: true } as SecurityJob,
      name: 'v3_windows_anomalous_script',
      count: 0,

      entity: AnomalyEntity.User,
    };

    mockUseAggregatedAnomaliesByJob.mockReturnValue({
      isLoading: false,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies-table-column-name')).toHaveTextContent(jobCount.name);
    expect(getByTestId('anomalies-table-column-count')).toHaveTextContent('Run job');
    expect(getByTestId('enable-job')).toBeInTheDocument();
  });

  it('renders recently installed jobs', async () => {
    const jobCount: AnomaliesCount = {
      job: { isInstalled: false, isCompatible: true } as SecurityJob,
      name: 'v3_windows_anomalous_script',
      count: 0,

      entity: AnomalyEntity.User,
    };

    mockUseAggregatedAnomaliesByJob.mockReturnValue({
      isLoading: false,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(<EntityAnalyticsAnomalies />, { wrapper: TestProviders });

    act(() => {
      fireEvent.click(getByTestId('enable-job'));
    });

    await waitFor(() => {
      expect(getByTestId('anomalies-table-column-count')).toHaveTextContent('0');
    });
  });

  it('renders failed jobs', () => {
    const jobCount: AnomaliesCount = {
      job: {
        isInstalled: true,
        datafeedState: 'failed',
        jobState: 'failed',
        isCompatible: true,
      } as SecurityJob,
      name: 'v3_windows_anomalous_script',
      count: 0,
      entity: AnomalyEntity.User,
    };

    mockUseAggregatedAnomaliesByJob.mockReturnValue({
      isLoading: false,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies-table-column-name')).toHaveTextContent(jobCount.name);
    expect(getByTestId('anomalies-table-column-count')).toHaveTextContent('failed');
  });

  it('renders empty count column while loading', () => {
    const jobCount: AnomaliesCount = {
      job: undefined,
      name: 'v3_windows_anomalous_script',
      count: 0,
      entity: AnomalyEntity.User,
    };

    mockUseAggregatedAnomaliesByJob.mockReturnValue({
      isLoading: true,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('anomalies-table-column-count')).toHaveTextContent('');
  });

  it('renders a warning message when jobs are incompatible', () => {
    const jobCount: AnomaliesCount = {
      job: {
        isInstalled: true,
        datafeedState: 'started',
        jobState: 'opened',
        isCompatible: false,
      } as SecurityJob,
      name: 'v3_windows_anomalous_script',
      count: 0,
      entity: AnomalyEntity.User,
    };

    mockUseAggregatedAnomaliesByJob.mockReturnValue({
      isLoading: false,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    expect(getByTestId('incompatible_jobs_warnings')).toBeInTheDocument();
  });

  it("doesn't render the warning message when header is collapsed", () => {
    const jobCount: AnomaliesCount = {
      job: {
        isInstalled: true,
        datafeedState: 'started',
        jobState: 'opened',
        isCompatible: false,
      } as SecurityJob,
      name: 'v3_windows_anomalous_script',
      count: 0,
      entity: AnomalyEntity.User,
    };

    mockUseAggregatedAnomaliesByJob.mockReturnValue({
      isLoading: false,
      data: [jobCount],
      refetch: jest.fn(),
    });

    const { queryByTestId, getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsAnomalies />
      </TestProviders>
    );

    fireEvent.click(getByTestId('query-toggle-header'));

    expect(queryByTestId('incompatible_jobs_warnings')).not.toBeInTheDocument();
  });
});
