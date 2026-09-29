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
import { SnapshotPage } from '.';
import { inventoryTitle } from '../../../translations';

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

vi.mock('./components/snapshot_container', () => {
      const mocked = {
      SnapshotContainer: () => <div data-test-subj="inventorySnapshotContainer" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./hooks/use_waffle_time', () => {
      const mocked = {
      WaffleTimeProvider: ({ children }: { children: React.ReactNode }) => children,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./hooks/use_waffle_filters', () => {
      const mocked = {
      WaffleFiltersProvider: ({ children }: { children: React.ReactNode }) => children,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./hooks/use_waffle_options', () => {
      const mocked = {
      WaffleOptionsProvider: ({ children }: { children: React.ReactNode }) => children,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./hooks/use_inventory_views', () => {
      const mocked = {
      InventoryViewsProvider: ({ children }: { children: React.ReactNode }) => children,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./providers/inventory_timerange_metadata_provider', () => {
      const mocked = {
      InventoryTimeRangeMetadataProvider: ({ children }: { children: React.ReactNode }) => children,
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

  it('keeps the waffle mounted when the has-data check fails', async () => {
    mockFetcherState.hasData = false;
    mockFetcherState.status = 'failure';

    renderSnapshotPage();

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      inventoryTitle
    );
    expect(screen.queryByTestId('kbnNoDataPage')).not.toBeInTheDocument();
    expect(screen.getByTestId('inventorySnapshotContainer')).toBeInTheDocument();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(true);
  });
});
