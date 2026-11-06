/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { BrushEndListener, SettingsProps } from '@elastic/charts';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import { getCoreVitalsComponent } from '@kbn/observability-plugin/public';
import type { ApplicationErrorsResponse } from '../../../../common/types/errors';
import type { ApplicationOverviewResponse } from '../../../../common/types/overview';
import type { ApplicationUsageResponse } from '../../../../common/types/usage';
import { useEnvironment } from '../../../hooks/use_environment';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { useTimeRange } from '../../../hooks/use_time_range';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { OtelOverview } from './otel_overview';

const mockBrushEndListeners: BrushEndListener[] = [];

// jsdom draws no canvas to drag over, so the test calls the listener each chart registers.
jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  const { createElement } = jest.requireActual('react');
  return {
    ...actual,
    Settings: (props: SettingsProps) => {
      if (props.onBrushEnd) {
        mockBrushEndListeners.push(props.onBrushEnd);
      }
      return createElement(actual.Settings, props);
    },
  };
});
jest.mock('@kbn/observability-plugin/public', () => ({ getCoreVitalsComponent: jest.fn() }));
jest.mock('@kbn/server-route-repository-client');
jest.mock('../../../hooks/use_kibana_services');
jest.mock('../../../hooks/use_application_links', () => {
  return {
    useApplicationLinks: () => {
      return {
        sessionsHref: () => {
          return '/sessions';
        },
        errorsHref: '/errors',
      };
    },
  };
});
jest.mock('../../../hooks/use_environment');
jest.mock('../../../hooks/use_time_range', () => ({
  ...jest.requireActual('../../../hooks/use_time_range'),
  useTimeRange: jest.fn(),
}));

const OVERVIEW_ENDPOINT = 'GET /internal/digital_experience/applications/{serviceName}/overview';

const USAGE_ENDPOINT = 'GET /internal/digital_experience/applications/{serviceName}/usage';

const ERRORS_ENDPOINT = 'GET /internal/digital_experience/applications/{serviceName}/errors';

const ERRORS_RESPONSE: ApplicationErrorsResponse = {
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

const respond = async (endpoint: string) => {
  if (endpoint === USAGE_ENDPOINT) {
    return USAGE_RESPONSE;
  }
  return endpoint === ERRORS_ENDPOINT ? ERRORS_RESPONSE : response(1533);
};

const NO_VITAL = { p75Ms: null, sampleCount: 0, ratings: null };

const USAGE_RESPONSE: ApplicationUsageResponse = {
  topPages: [{ url: 'https://shop.example.com/', pageLoads: 9, loadTimeP75Ms: 1200 }],
  breakdowns: {
    pageLoads: 9,
    browsers: [{ name: 'Chrome', pageLoads: 9 }],
    operatingSystems: [{ name: 'macOS', pageLoads: 9 }],
    devices: [{ name: 'desktop', pageLoads: 9 }],
  },
  topClicks: [{ cssSelector: '#add-to-cart', tagName: 'BUTTON', count: 5 }],
  totalClicks: 5,
};

const response = (pageLoads: number): ApplicationOverviewResponse => ({
  overview: {
    serviceName: 'shop',
    pageLoads: { count: pageLoads },
    loadTime: { p75Ms: 2412.5, sampleCount: pageLoads },
    jsErrors: { count: 3 },
    httpRequests: { count: 8, failedCount: 2, failedRatio: 0.25 },
    webVitals: {
      lcp: { p75Ms: 2412.5, sampleCount: 2, ratings: { good: 1, needsImprovement: 0, poor: 0 } },
      inp: NO_VITAL,
      cls: { p75: null, sampleCount: 0, ratings: null },
      fcp: NO_VITAL,
      ttfb: NO_VITAL,
    },
    trend: [{ timestamp: 1_000, pageLoads, loadTimeP75Ms: 2412.5 }],
  },
  environments: ['production', 'staging'],
});

const fetch = jest.fn();
const setEnvironment = jest.fn();
const setTimeRange = jest.fn();

const timeRange = { rangeFrom: '2021-01-18T12:00:00.000Z', rangeTo: '2021-01-18T13:00:00.000Z' };

/** Stands in for the Unified Search bar: submitting without an update means Refresh. */
const SearchBar = ({
  onQuerySubmit,
}: {
  onQuerySubmit: (query: unknown, isUpdate: boolean) => void;
}) => (
  <button type="button" onClick={() => onQuerySubmit({ dateRange: timeRange }, false)}>
    Refresh
  </button>
);

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <I18nProvider>
      <EuiProvider>{children}</EuiProvider>
    </I18nProvider>
  );
};

const renderOverview = (serviceName = 'shop') => {
  return render(<OtelOverview serviceName={serviceName} />, { wrapper: Providers });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBrushEndListeners.length = 0;
  fetch.mockImplementation(respond);
  jest
    .mocked(createRepositoryClient)
    .mockReturnValue({ fetch } as unknown as ReturnType<typeof createRepositoryClient>);
  jest.mocked(getCoreVitalsComponent).mockReturnValue(<div data-test-subj="coreVitals" />);
  jest.mocked(useEnvironment).mockReturnValue({ environment: undefined, setEnvironment });
  jest.mocked(useTimeRange).mockReturnValue({ timeRange, isTimeRangeInUrl: true, setTimeRange });
  jest.mocked(useKibanaServices).mockReturnValue({
    http: {},
    uiSettings: createUiSettingsMock(),
    unifiedSearch: { ui: { SearchBar } },
  } as unknown as ReturnType<typeof useKibanaServices>);
});

const pageLoadsKpi = () => screen.getByTestId('digitalExperienceOverviewPageLoads');

/** Waits for the page loads KPI, as the Trends panel shows the same count. */
const findPageLoads = (count: string) =>
  waitFor(() => expect(pageLoadsKpi()).toHaveTextContent(count));

const expectFetchedWith = (query: Record<string, string>, endpoint = OVERVIEW_ENDPOINT) => {
  return expect(fetch).toHaveBeenCalledWith(
    endpoint,
    expect.objectContaining({
      params: { path: { serviceName: 'shop' }, query },
    })
  );
};

describe('OtelOverview', () => {
  it('shows the KPIs, the vitals and the trends of the application', async () => {
    renderOverview();

    await findPageLoads('1,533');
    expect(screen.getByTestId('digitalExperienceOverviewLoadTime')).toHaveTextContent('2.41 s');
    expect(screen.getByTestId('coreVitals')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceOverviewPageLoadsTrend')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceOverviewLoadTimeTrend')).toBeInTheDocument();
  });

  it('asks for the application and the time range, and for all environments by default', async () => {
    renderOverview();

    await waitFor(() => expectFetchedWith({ start: timeRange.rangeFrom, end: timeRange.rangeTo }));
  });

  it('asks for the selected environment and lists the environments of the application', async () => {
    jest.mocked(useEnvironment).mockReturnValue({ environment: 'staging', setEnvironment });
    renderOverview();

    await waitFor(() =>
      expectFetchedWith({
        start: timeRange.rangeFrom,
        end: timeRange.rangeTo,
        environment: 'staging',
      })
    );

    fireEvent.click(screen.getByTestId('digitalExperienceEnvironmentFilter'));
    expect(
      screen.getByTestId('digitalExperienceEnvironmentFilterOption-production')
    ).toBeInTheDocument();
  });

  it('keeps the environments in the picker while the Overview loads again', async () => {
    renderOverview();
    await findPageLoads('1,533');

    fetch.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByTestId('digitalExperienceEnvironmentFilter'));

    expect(
      await screen.findByTestId('digitalExperienceEnvironmentFilterOption-production')
    ).toBeInTheDocument();
  });

  it('keeps the environments in the picker when the Overview fails to load again', async () => {
    renderOverview();
    await findPageLoads('1,533');

    fetch.mockRejectedValue(new Error('Could not load the Overview.'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByTestId('digitalExperienceOverviewError');
    fireEvent.click(screen.getByTestId('digitalExperienceEnvironmentFilter'));

    expect(
      screen.getByTestId('digitalExperienceEnvironmentFilterOption-production')
    ).toBeInTheDocument();
  });

  it('loads the Overview again on Refresh', async () => {
    renderOverview();
    await findPageLoads('1,533');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    // The Overview, its usage and its top errors, on mount and on Refresh.
    await waitFor(() => {
      return expect(fetch).toHaveBeenCalledTimes(6);
    });
  });

  it('shows the usage panels below the trends', async () => {
    renderOverview();

    expect(await screen.findByTitle('https://shop.example.com/')).toBeInTheDocument();
    [
      'digitalExperienceOverviewTopPages',
      'digitalExperienceOverviewBreakdowns',
      'digitalExperienceOverviewTopClicks',
    ].forEach((testId) => {
      return expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
    // Network requests have a tab of their own.
    expect(screen.queryByTestId('digitalExperienceNetworkHttpRequests')).not.toBeInTheDocument();
  });

  it('shows the top errors, linked to the Errors tab', async () => {
    renderOverview();

    expect(await screen.findByText('x is undefined')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Top JS errors' })).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceErrorsViewAll')).toHaveAttribute('href', '/errors');
  });

  it('shows a retryable error in place of the top errors only', async () => {
    fetch.mockImplementation(async (endpoint: string) => {
      if (endpoint === ERRORS_ENDPOINT) {
        throw new Error('Could not load the errors.');
      }
      return respond(endpoint);
    });
    renderOverview();

    expect(
      await screen.findByTestId('digitalExperienceOverviewTopErrorsError')
    ).toBeInTheDocument();
    await findPageLoads('1,533');
    expect(screen.getByTestId('digitalExperienceOverviewTopClicks')).toBeInTheDocument();
  });

  it('asks for the usage with the same query as the Overview', async () => {
    jest.mocked(useEnvironment).mockReturnValue({ environment: 'staging', setEnvironment });
    renderOverview();

    const query = { start: timeRange.rangeFrom, end: timeRange.rangeTo, environment: 'staging' };
    await waitFor(() => {
      return expectFetchedWith(query);
    });
    await waitFor(() => {
      return expectFetchedWith(query, USAGE_ENDPOINT);
    });
  });

  it('shows a retryable error instead of the usage panels only, and keeps the KPIs', async () => {
    let usageFails = true;
    fetch.mockImplementation(async (endpoint: string) => {
      if (endpoint !== USAGE_ENDPOINT) {
        return response(1533);
      }
      if (usageFails) {
        throw new Error('Could not load the usage.');
      }
      return USAGE_RESPONSE;
    });
    renderOverview();

    expect(await screen.findByTestId('digitalExperienceOverviewUsageError')).toBeInTheDocument();
    await findPageLoads('1,533');
    expect(screen.queryByTestId('digitalExperienceOverviewError')).not.toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceOverviewTopPages')).not.toBeInTheDocument();

    usageFails = false;
    fireEvent.click(screen.getByTestId('digitalExperienceOverviewUsageRetry'));

    expect(await screen.findByTitle('https://shop.example.com/')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceOverviewUsageError')).not.toBeInTheDocument();
  });

  it('shows the usage panels when the Overview fails', async () => {
    fetch.mockImplementation(async (endpoint: string) => {
      if (endpoint === USAGE_ENDPOINT) {
        return USAGE_RESPONSE;
      }
      throw new Error('Could not load the Overview.');
    });
    renderOverview();

    expect(await screen.findByTestId('digitalExperienceOverviewError')).toBeInTheDocument();
    expect(await screen.findByTitle('https://shop.example.com/')).toBeInTheDocument();
  });

  it('shows no metrics of the previous application while the next one loads', async () => {
    const { rerender } = renderOverview();
    await findPageLoads('1,533');

    fetch.mockReturnValue(new Promise(() => {}));
    rerender(<OtelOverview serviceName="checkout" />);

    expect(screen.queryByText('1,533')).not.toBeInTheDocument();
    expect(screen.queryByText('2.41 s')).not.toBeInTheDocument();
  });

  it('shows no metrics of the previous time range while the next one loads', async () => {
    const { rerender } = renderOverview();
    await findPageLoads('1,533');

    fetch.mockReturnValue(new Promise(() => {}));
    jest.mocked(useTimeRange).mockReturnValue({
      timeRange: { rangeFrom: 'now-15m', rangeTo: 'now' },
      isTimeRangeInUrl: true,
      setTimeRange,
    });
    rerender(<OtelOverview serviceName="shop" />);

    expect(screen.queryByText('1,533')).not.toBeInTheDocument();
  });

  it('never shows the response of the previous environment when it arrives last', async () => {
    let resolvePrevious: (value: ApplicationOverviewResponse) => void = () => {};
    fetch.mockReturnValueOnce(new Promise((resolve) => (resolvePrevious = resolve)));
    const { rerender } = renderOverview();

    fetch.mockResolvedValueOnce(response(7));
    jest.mocked(useEnvironment).mockReturnValue({ environment: 'staging', setEnvironment });
    rerender(<OtelOverview serviceName="shop" />);
    await findPageLoads('7');

    await act(async () => resolvePrevious(response(1533)));

    expect(pageLoadsKpi()).toHaveTextContent('7');
    expect(screen.queryByText('1,533')).not.toBeInTheDocument();
  });

  it('selects the range dragged over a trend as the time range of the URL', async () => {
    renderOverview();
    await findPageLoads('1,533');

    act(() =>
      mockBrushEndListeners[0]({ x: [Date.UTC(2021, 0, 18, 12), Date.UTC(2021, 0, 18, 12, 30)] })
    );

    expect(setTimeRange).toHaveBeenCalledWith({
      rangeFrom: '2021-01-18T12:00:00.000Z',
      rangeTo: '2021-01-18T12:30:00.000Z',
    });
  });

  it('shows the error with a retry that loads the Overview again', async () => {
    fetch.mockRejectedValue(new Error('Could not load the Overview.'));
    renderOverview();

    expect(await screen.findByTestId('digitalExperienceOverviewError')).toHaveTextContent(
      'Could not load the Overview'
    );
    expect(screen.queryByTestId('digitalExperienceOverviewKpis')).not.toBeInTheDocument();

    fetch.mockResolvedValue(response(7));
    fireEvent.click(screen.getByTestId('digitalExperienceOverviewRetry'));

    await findPageLoads('7');
    expect(screen.queryByTestId('digitalExperienceOverviewError')).not.toBeInTheDocument();
  });
});
