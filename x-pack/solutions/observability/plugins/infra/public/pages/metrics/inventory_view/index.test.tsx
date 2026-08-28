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
import { SnapshotPage } from '.';
import { inventoryTitle } from '../../../translations';

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

jest.mock('./components/snapshot_container', () => ({
  SnapshotContainer: () => <div data-test-subj="inventorySnapshotContainer" />,
}));

jest.mock('./hooks/use_waffle_time', () => ({
  WaffleTimeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./hooks/use_waffle_filters', () => ({
  WaffleFiltersProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./hooks/use_waffle_options', () => ({
  WaffleOptionsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./hooks/use_inventory_views', () => ({
  InventoryViewsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./providers/inventory_timerange_metadata_provider', () => ({
  InventoryTimeRangeMetadataProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../header/use_metrics_app_header_menu', () => ({
  useMetricsAppHeaderMenu: () => ({
    menu: { items: [] },
    flyouts: null,
  }),
}));

const renderSnapshotPage = () =>
  render(
    <EuiProvider>
      <MockAppHeaderProvider>
        <SnapshotPage />
      </MockAppHeaderProvider>
    </EuiProvider>
  );

describe('SnapshotPage', () => {
  beforeEach(() => {
    mockFetcherState.hasData = true;
    mockFetcherState.status = 'success';
    lastInfraPageTemplateProps = {};
  });

  it('renders AppHeader with the inventory title and no back control when metrics exist', async () => {
    renderSnapshotPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      inventoryTitle
    );
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
    expect(screen.getByTestId('inventorySnapshotContainer')).toBeInTheDocument();
    expect(screen.queryByTestId('kbnNoDataPage')).not.toBeInTheDocument();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(true);
  });

  it('keeps AppHeader and shows onboarding instead of the waffle when there is no metrics data', async () => {
    mockFetcherState.hasData = false;

    renderSnapshotPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      inventoryTitle
    );
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
    expect(screen.getByTestId('kbnNoDataPage')).toBeInTheDocument();
    expect(screen.queryByTestId('inventorySnapshotContainer')).not.toBeInTheDocument();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(false);
  });

  it('does not show onboarding while metrics data is loading', async () => {
    mockFetcherState.hasData = false;
    mockFetcherState.status = 'loading';

    renderSnapshotPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      inventoryTitle
    );
    expect(screen.queryByTestId('kbnNoDataPage')).not.toBeInTheDocument();
    expect(screen.getByTestId('inventorySnapshotContainer')).toBeInTheDocument();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(true);
  });
});
