/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { MetricsExplorerPage } from '.';
import { metricsExplorerTitle } from '../../../translations';

vi.mock('@kbn/core/public', () => {
      const mocked = {
      APP_WRAPPER_CLASS: 'kbnAppWrapper',
    };
      return { ...mocked, default: mocked };
    });

type MockFetchStatus = 'loading' | 'success' | 'failure' | 'not_initiated' | 'pending';

const mockFetcherState: { hasData: boolean; status: MockFetchStatus } = {
  hasData: true,
  status: 'success',
};

vi.mock('@kbn/observability-shared-plugin/public', () => {
      const mocked = {
      useTrackPageview: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/ebt-tools', () => {
      const mocked = {
      usePerformanceContext: () => ({ onPageReady: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_metrics_breadcrumbs', () => {
      const mocked = {
      useMetricsBreadcrumbs: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_fetcher', () => {
      const mocked = {
      FETCH_STATUS: {
        LOADING: 'loading',
        SUCCESS: 'success',
        FAILURE: 'failure',
        NOT_INITIATED: 'not_initiated',
        PENDING: 'pending',
      },
      isPending: (status: string) =>
        status === 'loading' || status === 'not_initiated' || status === 'pending',
      isSuccess: (status: string) => status === 'success',
      useFetcher: () => ({
        data: mockFetcherState.status === 'failure' ? undefined : { hasData: mockFetcherState.hasData },
        status: mockFetcherState.status,
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_kibana', () => {
      const mocked = {
      useKibanaContextForPlugin: () => ({
        services: {
          share: {
            url: {
              locators: {
                get: () => ({ getRedirectUrl: () => '/app/observabilityOnboarding' }),
              },
            },
          },
          docLinks: { links: { observability: { guide: 'https://docs.elastic.co' } } },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/shared-ux-page-no-data', () => {
      const mocked = {
      NoDataPage: () => <div data-test-subj="kbnNoDataPage" />,
    };
      return { ...mocked, default: mocked };
    });

let lastInfraPageTemplateProps: { hasDataOverride?: boolean } = {};

vi.mock('../../../components/shared/templates/infra_page_template', () => {
      const mocked = {
      InfraPageTemplate: ({
        children,
        hasDataOverride,
        header,
      }: {
        children: React.ReactNode;
        hasDataOverride?: boolean;
        header?: React.ReactNode;
      }) => {
        lastInfraPageTemplateProps = { hasDataOverride };
        return (
          <div data-test-subj="infraPageTemplate">
            {header}
            {children}
          </div>
        );
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../containers/metrics_explorer/with_metrics_explorer_options_url_state', () => {
      const mocked = {
      WithMetricsExplorerOptionsUrlState: () => null,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_metrics_explorer_views', () => {
      const mocked = {
      useMetricsExplorerViews: () => ({ currentView: { id: '0' } }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./hooks/use_metrics_explorer_options', () => {
      const mocked = {
      MetricsExplorerOptionsContainer: ({ children }: { children: React.ReactNode }) => children,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./hooks/use_metric_explorer_state', () => {
      const mocked = {
      useMetricsExplorerState: () => ({
        isLoading: false,
        error: null,
        data: undefined,
        timeRange: { from: 'now-1h', to: 'now', interval: '>=10s' },
        options: { aggregation: 'avg', metrics: [] },
        chartOptions: {},
        setChartOptions: vi.fn(),
        handleAggregationChange: vi.fn(),
        handleMetricsChange: vi.fn(),
        handleFilterQuerySubmit: vi.fn(),
        handleGroupByChange: vi.fn(),
        handleTimeChange: vi.fn(),
        handleLoadMore: vi.fn(),
        onViewStateChange: vi.fn(),
        refresh: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/toolbar', () => {
      const mocked = {
      MetricsExplorerToolbar: () => <div data-test-subj="metricsExplorerToolbar" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/charts', () => {
      const mocked = {
      MetricsExplorerCharts: () => <div data-test-subj="metricsExplorerCharts" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/metrics_in_discover_callout', () => {
      const mocked = {
      MetricsInDiscoverCallout: () => null,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../header/use_metrics_app_header_menu', () => {
      const mocked = {
      useMetricsAppHeaderMenu: () => ({
        menu: { items: [] },
        flyouts: null,
      }),
    };
      return { ...mocked, default: mocked };
    });

const trackedPageviews = () =>
  Array.from(
    new Set((useTrackPageview as Mock).mock.calls.map(([options]) => JSON.stringify(options)))
  );

const renderMetricsExplorerPage = () =>
  render(
    <EuiProvider>
      <MockAppHeaderProvider>
        <MetricsExplorerPage />
      </MockAppHeaderProvider>
    </EuiProvider>
  );

describe('MetricsExplorerPage', () => {
  beforeEach(() => {
    mockFetcherState.hasData = true;
    mockFetcherState.status = 'success';
    lastInfraPageTemplateProps = {};
    (useTrackPageview as Mock).mockClear();
  });

  it('renders AppHeader with the explorer title and no back control when metrics exist', async () => {
    renderMetricsExplorerPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      metricsExplorerTitle
    );
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
    expect(screen.getByTestId('metricsExplorerToolbar')).toBeInTheDocument();
    expect(screen.getByTestId('metricsExplorerCharts')).toBeInTheDocument();
    expect(screen.queryByTestId('kbnNoDataPage')).not.toBeInTheDocument();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(true);
  });

  it('keeps AppHeader and shows onboarding instead of toolbar and charts when there is no metrics data', async () => {
    mockFetcherState.hasData = false;

    renderMetricsExplorerPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      metricsExplorerTitle
    );
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
    expect(screen.getByTestId('kbnNoDataPage')).toBeInTheDocument();
    expect(screen.queryByTestId('metricsExplorerToolbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('metricsExplorerCharts')).not.toBeInTheDocument();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(false);
  });

  it('does not show onboarding while metrics data is loading', async () => {
    mockFetcherState.hasData = false;
    mockFetcherState.status = 'loading';

    renderMetricsExplorerPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      metricsExplorerTitle
    );
    expect(screen.queryByTestId('kbnNoDataPage')).not.toBeInTheDocument();
    expect(screen.getByTestId('metricsExplorerToolbar')).toBeInTheDocument();
    expect(screen.getByTestId('metricsExplorerCharts')).toBeInTheDocument();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(true);
  });

  it('keeps toolbar and charts mounted when the has-data check fails', async () => {
    mockFetcherState.hasData = false;
    mockFetcherState.status = 'failure';

    renderMetricsExplorerPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      metricsExplorerTitle
    );
    expect(screen.queryByTestId('kbnNoDataPage')).not.toBeInTheDocument();
    expect(screen.getByTestId('metricsExplorerToolbar')).toBeInTheDocument();
    expect(screen.getByTestId('metricsExplorerCharts')).toBeInTheDocument();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(true);
  });

  it('tracks the same pageviews whether charts or onboarding render', async () => {
    renderMetricsExplorerPage();
    await screen.findByTestId('metricsExplorerCharts');

    const chartsPageviews = trackedPageviews();
    expect(chartsPageviews).toEqual([
      JSON.stringify({ app: 'infra_metrics', path: 'metrics_explorer' }),
      JSON.stringify({ app: 'infra_metrics', path: 'metrics_explorer', delay: 15000 }),
    ]);

    cleanup();
    (useTrackPageview as Mock).mockClear();
    mockFetcherState.hasData = false;

    renderMetricsExplorerPage();
    await screen.findByTestId('kbnNoDataPage');

    expect(trackedPageviews()).toEqual(chartsPageviews);
  });
});
