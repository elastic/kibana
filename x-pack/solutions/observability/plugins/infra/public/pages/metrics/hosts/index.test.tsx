/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { HostsPage } from '.';
import { hostsTitle } from '../../../translations';

jest.mock('@kbn/core/public', () => ({
  APP_WRAPPER_CLASS: 'kbnAppWrapper',
}));

type MockFetchStatus = 'loading' | 'success' | 'failure' | 'not_initiated' | 'pending';

const mockFetcherState: { hasData: boolean; status: MockFetchStatus } = {
  hasData: true,
  status: 'success',
};

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useTrackPageview: jest.fn(),
}));

jest.mock('../../../hooks/use_metrics_breadcrumbs', () => ({
  useMetricsBreadcrumbs: jest.fn(),
}));

jest.mock('../../../hooks/use_fetcher', () => ({
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
    PENDING: 'pending',
  },
  isPending: (status: string) =>
    status === 'loading' || status === 'not_initiated' || status === 'pending',
  useFetcher: () => ({
    data: { hasData: mockFetcherState.hasData },
    status: mockFetcherState.status,
  }),
}));

jest.mock('../../../hooks/use_kibana', () => ({
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
}));

jest.mock('@kbn/shared-ux-page-no-data', () => ({
  NoDataPage: () => <div data-test-subj="kbnNoDataPage" />,
}));

let lastInfraPageTemplateProps: { hasDataOverride?: boolean } = {};

jest.mock('../../../components/shared/templates/infra_page_template', () => ({
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
}));

jest.mock('./components/hosts_container', () => ({
  HostsContainer: () => <div data-test-subj="hostsContainer" />,
}));

jest.mock('./components/search_bar/search_bar', () => ({
  SearchBar: () => <div data-test-subj="hostsSearchBar" />,
}));

jest.mock('./hooks/use_unified_search', () => ({
  UnifiedSearchProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./hooks/use_hosts_metadata_provider', () => ({
  HostsTimeRangeMetadataProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../header/use_metrics_app_header_menu', () => ({
  useMetricsAppHeaderMenu: () => ({
    menu: { items: [] },
    flyouts: null,
  }),
}));

const renderHostsPage = () =>
  render(
    <EuiProvider>
      <MockAppHeaderProvider>
        <HostsPage />
      </MockAppHeaderProvider>
    </EuiProvider>
  );

describe('HostsPage', () => {
  beforeEach(() => {
    mockFetcherState.hasData = true;
    mockFetcherState.status = 'success';
    lastInfraPageTemplateProps = {};
  });

  it('renders AppHeader with the hosts title and no back control when host data exists', async () => {
    renderHostsPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(hostsTitle);
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
    expect(screen.getByTestId('hostsSearchBar')).toBeInTheDocument();
    expect(screen.getByTestId('hostsContainer')).toBeInTheDocument();
    expect(screen.queryByTestId('kbnNoDataPage')).not.toBeInTheDocument();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(true);
  });

  it('keeps AppHeader and shows onboarding instead of search and table when there is no host data', async () => {
    mockFetcherState.hasData = false;

    renderHostsPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(hostsTitle);
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
    expect(screen.getByTestId('kbnNoDataPage')).toBeInTheDocument();
    expect(screen.queryByTestId('hostsSearchBar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hostsContainer')).not.toBeInTheDocument();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(false);
  });

  it('does not show onboarding while host data is loading', async () => {
    mockFetcherState.hasData = false;
    mockFetcherState.status = 'loading';

    renderHostsPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(hostsTitle);
    expect(screen.queryByTestId('kbnNoDataPage')).not.toBeInTheDocument();
    expect(screen.getByTestId('hostsSearchBar')).toBeInTheDocument();
    expect(screen.getByTestId('hostsContainer')).toBeInTheDocument();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(true);
  });
});
