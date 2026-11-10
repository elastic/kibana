/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { OverviewFilters } from '../../../common/overview_filters';
import { encodeOverviewFilters } from '../../../common/overview_filters_param';
import type { ApplicationErrorsResponse } from '../../../common/types/errors';
import { useEnvironment } from '../../hooks/use_environment';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useOverviewFilters } from '../../hooks/use_overview_filters';
import { useOverviewKuery, useOverviewSearchParams } from '../../hooks/use_overview_search';
import { useTimeRange } from '../../hooks/use_time_range';
import { createUiSettingsMock } from '../../test_utils/ui_settings_mock';
import { ErrorsTab } from './errors_tab';

jest.mock('@kbn/server-route-repository-client');
jest.mock('../../hooks/use_kibana_services');
jest.mock('../../hooks/use_environment');
jest.mock('../../hooks/use_overview_filters');
jest.mock('../../hooks/use_overview_search');
jest.mock('../../hooks/use_time_range', () => {
  return {
    ...jest.requireActual('../../hooks/use_time_range'),
    useTimeRange: jest.fn(),
  };
});

const ERRORS_ENDPOINT = 'GET /internal/digital_experience/applications/{serviceName}/errors';

const RESPONSE: ApplicationErrorsResponse = {
  serviceName: 'shop',
  errors: [
    {
      type: 'TypeError',
      stacktrace: 'TypeError: x is undefined\n    at app.js:1:1',
      message: 'x is undefined',
      count: 2,
      lastSeen: '2021-01-18T12:30:00.000Z',
    },
  ],
  hasMoreErrors: false,
  environments: ['production'],
};

const timeRange = { rangeFrom: '2021-01-18T12:00:00.000Z', rangeTo: '2021-01-18T13:00:00.000Z' };
const fetch = jest.fn();
const setFilter = jest.fn();
const setFilters = jest.fn();
const setKuery = jest.fn();

/** The Overview's filters and KQL query in the URL, as the hooks return them. */
const mockSearch = ({
  filters = {},
  kuery,
}: {
  filters?: OverviewFilters;
  kuery?: string;
} = {}) => {
  const encoded = encodeOverviewFilters(filters);
  const params = encoded ? { filters: encoded } : {};
  jest.mocked(useOverviewSearchParams).mockReturnValue(kuery ? { ...params, kuery } : params);
  jest.mocked(useOverviewKuery).mockReturnValue({ kuery, setKuery });
  jest.mocked(useOverviewFilters).mockReturnValue({
    filters,
    params,
    setFilter,
    setFilters,
    clearFilters: jest.fn(),
    hasActiveFilters: Object.keys(filters).length > 0,
  });
};

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <I18nProvider>
      <EuiProvider>{children}</EuiProvider>
    </I18nProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockResolvedValue(RESPONSE);
  mockSearch();
  jest
    .mocked(createRepositoryClient)
    .mockReturnValue({ fetch } as unknown as ReturnType<typeof createRepositoryClient>);
  jest
    .mocked(useEnvironment)
    .mockReturnValue({ environment: 'production', setEnvironment: jest.fn() });
  jest
    .mocked(useTimeRange)
    .mockReturnValue({ timeRange, isTimeRangeInUrl: true, setTimeRange: jest.fn() });
  jest.mocked(useKibanaServices).mockReturnValue({
    http: {},
    uiSettings: createUiSettingsMock(),
    unifiedSearch: {
      ui: {
        SearchBar: () => {
          return null;
        },
      },
    },
  } as unknown as ReturnType<typeof useKibanaServices>);
});

describe('ErrorsTab', () => {
  it('asks for the errors of the application in the time range and environment', async () => {
    render(<ErrorsTab serviceName="shop" />, { wrapper: Providers });

    await waitFor(() => {
      return expect(fetch).toHaveBeenCalledWith(
        ERRORS_ENDPOINT,
        expect.objectContaining({
          params: {
            path: { serviceName: 'shop' },
            query: {
              start: timeRange.rangeFrom,
              end: timeRange.rangeTo,
              environment: 'production',
            },
          },
        })
      );
    });
  });

  it('asks for the errors of the filters and the KQL query of the URL, without the page', async () => {
    mockSearch({
      filters: {
        browser: [
          { value: 'Chrome', exclude: false },
          { value: 'Safari', exclude: true },
        ],
        pageUrl: [{ value: 'https://shop.example.com/', exclude: false }],
      },
      kuery: 'user_agent.name: Chrome',
    });
    render(<ErrorsTab serviceName="shop" />, { wrapper: Providers });

    await waitFor(() => {
      return expect(fetch).toHaveBeenCalledWith(
        ERRORS_ENDPOINT,
        expect.objectContaining({
          params: {
            path: { serviceName: 'shop' },
            query: {
              start: timeRange.rangeFrom,
              end: timeRange.rangeTo,
              environment: 'production',
              filters: encodeOverviewFilters({
                browser: [
                  { value: 'Chrome', exclude: false },
                  { value: 'Safari', exclude: true },
                ],
              }),
              kuery: 'user_agent.name: Chrome',
            },
          },
        })
      );
    });
  });

  it('shows what narrows the errors, so it can be removed, but not the page, which does not', async () => {
    mockSearch({
      filters: {
        browser: [{ value: 'Chrome', exclude: false }],
        pageUrl: [{ value: 'https://shop.example.com/', exclude: false }],
      },
      kuery: 'user_agent.name: Chrome',
    });
    render(<ErrorsTab serviceName="shop" />, { wrapper: Providers });

    expect(await screen.findByTestId('digitalExperienceOverviewPill-browser-Chrome')).toBeVisible();
    expect(
      screen.queryByTestId('digitalExperienceOverviewPill-pageUrl-https://shop.example.com/')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceErrorsKuery')).toHaveTextContent(
      'user_agent.name: Chrome'
    );

    // Clears what shows, and leaves the page, which the Overview shows.
    fireEvent.click(screen.getByTestId('digitalExperienceOverviewClearFilters'));
    expect(setFilters).toHaveBeenCalledWith({ browser: [] });
  });

  it('clears the KQL query from the tab, as it is the only thing that narrows the errors', async () => {
    mockSearch({ kuery: 'user_agent.name: Chrome' });
    render(<ErrorsTab serviceName="shop" />, { wrapper: Providers });

    expect(await screen.findByTestId('digitalExperienceErrorsKuery')).toHaveTextContent(
      'user_agent.name: Chrome'
    );
    fireEvent.click(screen.getByTestId('digitalExperienceErrorsKueryClear'));

    expect(setKuery).toHaveBeenCalledWith('');
    expect(setFilters).not.toHaveBeenCalled();
  });

  it('shows no filters while none narrows the errors', async () => {
    render(<ErrorsTab serviceName="shop" />, { wrapper: Providers });

    expect(await screen.findByText('TypeError')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceOverviewPills')).not.toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceErrorsKuery')).not.toBeInTheDocument();
  });

  it('lists the error groups', async () => {
    render(<ErrorsTab serviceName="shop" />, { wrapper: Providers });

    expect(await screen.findByText('TypeError')).toBeInTheDocument();
    expect(screen.getByText('x is undefined')).toBeInTheDocument();
  });

  it('shows the error with a retry that loads the errors again', async () => {
    fetch.mockRejectedValueOnce(new Error('Could not load.'));
    render(<ErrorsTab serviceName="shop" />, { wrapper: Providers });

    expect(await screen.findByTestId('digitalExperienceErrorsError')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('digitalExperienceErrorsRetry'));

    expect(await screen.findByText('TypeError')).toBeInTheDocument();
  });
});
