/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { MetricDetailPage } from './metric_detail_page';

const mockInventoryTitle = 'Infrastructure inventory';

interface MockMetadataState {
  name: string;
  filteredRequiredMetrics: string[];
  loading: boolean;
  cloudId: string;
  metadata: { name?: string } | undefined;
}

const mockMetadataState: MockMetadataState = {
  name: '',
  filteredRequiredMetrics: [],
  loading: true,
  cloudId: '',
  metadata: undefined,
};

vi.mock('react-router-dom', () => {
      const mocked = {
      useRouteMatch: () => ({
        params: { type: 'pod', node: 'pod-1' },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/metrics-data-access-plugin/common', () => {
      const mocked = {
      findInventoryModel: () => ({
        metrics: { requiredTsvb: [] },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_metrics_breadcrumbs', () => {
      const mocked = {
      useMetricsBreadcrumbs: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_parent_breadcrumb_resolver', () => {
      const mocked = {
      useParentBreadcrumbResolver: () => ({
        getBreadcrumbOptions: () => ({
          text: mockInventoryTitle,
          link: { href: '/app/metrics/inventory' },
        }),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../containers/metrics_source', () => {
      const mocked = {
      useSourceContext: () => ({ sourceId: 'default' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./hooks/use_metrics_time', () => {
      const mocked = {
      useMetricsTimeContext: () => ({
        timeRange: { from: 'now-1h', to: 'now', interval: '>=1m' },
        parsedTimeRange: { from: 1, to: 2 },
        setTimeRange: vi.fn(),
        refreshInterval: 0,
        setRefreshInterval: vi.fn(),
        isAutoReloading: false,
        setAutoReload: vi.fn(),
        triggerRefresh: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../components/asset_details/hooks/use_metadata', () => {
      const mocked = {
      useMetadata: () => mockMetadataState,
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

vi.mock('../../../components/loading', () => {
      const mocked = {
      InfraLoadingPanel: () => <div data-test-subj="metricDetailLoadingPanel" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/node_details_page', () => {
      const mocked = {
      NodeDetailsPage: () => <div data-test-subj="metricDetailNodePage" />,
    };
      return { ...mocked, default: mocked };
    });

let lastInfraPageTemplateProps: { onboardingFlow?: string; hasDataOverride?: boolean } = {};

vi.mock('../../../components/shared/templates/infra_page_template', () => {
      const mocked = {
      InfraPageTemplate: ({
        children,
        header,
        onboardingFlow,
        hasDataOverride,
      }: {
        children: React.ReactNode;
        header?: React.ReactNode;
        onboardingFlow?: string;
        hasDataOverride?: boolean;
      }) => {
        lastInfraPageTemplateProps = { onboardingFlow, hasDataOverride };
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

const renderPage = () =>
  render(
    <EuiProvider>
      <MockAppHeaderProvider>
        <MetricDetailPage />
      </MockAppHeaderProvider>
    </EuiProvider>
  );

describe('MetricDetailPage', () => {
  beforeEach(() => {
    mockMetadataState.name = '';
    mockMetadataState.filteredRequiredMetrics = [];
    mockMetadataState.loading = true;
    mockMetadataState.metadata = undefined;
    lastInfraPageTemplateProps = {};
  });

  it('keeps AppHeader mounted while metadata loads', async () => {
    renderPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('pod-1');
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/metrics/inventory'
    );
    expect(screen.getByTestId('metricDetailLoadingPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('infraAssetDetailsReturnButton')).not.toBeInTheDocument();
    expect(lastInfraPageTemplateProps.onboardingFlow).toBeUndefined();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(true);
  });

  it('renders the node body under AppHeader after metadata loads', async () => {
    mockMetadataState.loading = false;
    mockMetadataState.name = 'pod-1';
    mockMetadataState.metadata = { name: 'pod-1' };

    renderPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('pod-1');
    expect(screen.getByTestId('metricDetailNodePage')).toBeInTheDocument();
    expect(screen.queryByTestId('metricDetailLoadingPanel')).not.toBeInTheDocument();
    expect(lastInfraPageTemplateProps.onboardingFlow).toBeUndefined();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(true);
  });
});
