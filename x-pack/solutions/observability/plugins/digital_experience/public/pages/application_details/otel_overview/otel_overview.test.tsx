/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { BrushEndListener, SettingsProps } from '@elastic/charts';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import { getCoreVitalsComponent } from '@kbn/observability-plugin/public';
import { encodeOverviewFilters } from '../../../../common/overview_filters_param';
import type { FilterValue } from '../../../../common/filter_values';
import type { OverviewFilters, OverviewPercentile } from '../../../../common/overview_filters';
import type { ApplicationErrorsResponse } from '../../../../common/types/errors';
import type {
  ApplicationEntryPagesResponse,
  ApplicationOverviewKpisResponse,
  ApplicationOverviewResponse,
} from '../../../../common/types/overview';
import type { ApplicationUsageResponse } from '../../../../common/types/usage';
import { useEnvironment } from '../../../hooks/use_environment';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { useOverviewFilters } from '../../../hooks/use_overview_filters';
import { useQueryParam } from '../../../hooks/use_query_param';
import {
  useOverviewKuery,
  useOverviewPercentile,
  useOverviewSearchParams,
} from '../../../hooks/use_overview_search';
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
// Links as the page's own `href`, so the test can tell which query a tile opens.
jest.mock('../../../hooks/use_discover_href', () => ({
  useDiscoverHrefOf: () => (esql: string | undefined) => esql ? `/discover/${esql}` : undefined,
}));
jest.mock('../../../hooks/use_environment');
jest.mock('../../../hooks/use_overview_filters');
jest.mock('../../../hooks/use_overview_search');
jest.mock('../../../hooks/use_query_param');
// Stand in for the Unified Search bars, which the Overview's own test does not render: the date
// picker's Refresh button loads the Overview again.
jest.mock('./components/overview_search_bar', () => ({
  OverviewSearchBar: () => <div data-test-subj="kueryBar" />,
}));
jest.mock('../../../components/time_range_picker', () => ({
  TimeRangePicker: ({ onRefresh }: { onRefresh: () => void }) => (
    <button type="button" onClick={onRefresh}>
      Refresh
    </button>
  ),
}));
jest.mock('../../../hooks/use_time_range', () => ({
  ...jest.requireActual('../../../hooks/use_time_range'),
  useTimeRange: jest.fn(),
}));

const OVERVIEW_ENDPOINT = 'GET /internal/digital_experience/applications/{serviceName}/overview';

const KPIS_ENDPOINT = 'GET /internal/digital_experience/applications/{serviceName}/overview/kpis';

const ENTRY_PAGES_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/overview/entry-pages';

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

/** The responses of every endpoint, the Overview's and its KPIs' with `pageLoads` page loads. */
const respondWith = (pageLoads: number) => async (endpoint: string) => {
  if (endpoint === USAGE_ENDPOINT) {
    return USAGE_RESPONSE;
  }
  if (endpoint === KPIS_ENDPOINT) {
    return kpisResponse(pageLoads);
  }
  if (endpoint === ENTRY_PAGES_ENDPOINT) {
    return ENTRY_PAGES_RESPONSE;
  }
  return endpoint === ERRORS_ENDPOINT ? ERRORS_RESPONSE : response(pageLoads);
};

const respond = respondWith(1533);

const ENTRY_PAGES_RESPONSE: ApplicationEntryPagesResponse = {
  entryPages: [
    { page: '/', sessions: 30, bounceRate: 0.4 },
    { page: '/products', sessions: 10, bounceRate: 0.1 },
  ],
  totalSessions: 40,
};

const NO_VITAL = { p75Ms: null, sampleCount: 0, ratings: null };

const USAGE_RESPONSE: ApplicationUsageResponse = {
  serviceName: 'shop',
  environments: [],
  topPages: [
    {
      url: 'https://shop.example.com/',
      pageLoads: 9,
      loadTimeP75Ms: 1200,
      lcpP75Ms: null,
      inpP75Ms: null,
      clsP75: null,
      jsErrors: null,
    },
  ],
  breakdowns: {
    pageLoads: 9,
    browsers: [{ name: 'Chrome', pageLoads: 9 }],
    operatingSystems: [{ name: 'macOS', pageLoads: 9 }],
    devices: [{ name: 'MacBook Pro', pageLoads: 9 }],
  },
  topClicks: [{ cssSelector: '#add-to-cart', tagName: 'BUTTON', count: 5 }],
  totalClicks: 5,
  frustration: { rageClicks: 0, deadClicks: 0, errorClicks: 0, total: 0, sessions: 0 },
  frustratedElements: [],
  frustratedPages: [],
};

const response = (pageLoads: number): ApplicationOverviewResponse => ({
  overview: {
    serviceName: 'shop',
    percentile: 75,
    pageLoads: { count: pageLoads },
    loadTime: { percentileMs: 2412.5 },
    webVitals: {
      lcp: { p75Ms: 2412.5, sampleCount: 2, ratings: { good: 1, needsImprovement: 0, poor: 0 } },
      inp: NO_VITAL,
      cls: { p75: null, sampleCount: 0, ratings: null },
      fcp: NO_VITAL,
      ttfb: NO_VITAL,
    },
    trend: [{ timestamp: 1_000, pageLoads, loadTimePercentileMs: 2412.5 }],
    trendHistogram: { interval: { value: 60, unit: 's' }, start: 0, end: 60_000 },
  },
  environments: ['production', 'staging'],
  filters: {
    browser: [
      { key: 'Chrome', count: 1200 },
      { key: 'Firefox', count: 333 },
    ],
    os: [{ key: 'macOS', count: 900 }],
    device: [],
    country: [],
    appVersion: [
      { key: '1.3.0', count: 800 },
      { key: '1.2.0', count: 733 },
    ],
    pageUrl: [{ key: 'https://shop.example.com/cart', count: 40 }],
    pageContains: [],
  },
});

const compared = (value: number | null, previous: number | null) => ({
  value,
  previous,
  delta: value !== null && previous !== null ? value - previous : null,
});

const kpisResponse = (pageLoads: number): ApplicationOverviewKpisResponse => ({
  percentile: 75,
  sessions: compared(400, 320),
  errorFreeSessions: compared(0.9, 0.95),
  pageLoads: compared(pageLoads, 1000),
  loadTime: compared(2412.5, 3000),
  jsErrors: compared(3, 3),
  failedHttpRequests: compared(0.25, 0.25),
  requestLatency: compared(180, null),
  discover: {
    sessions: 'sessions-query',
    errorFreeSessions: 'error-free-query',
    pageLoads: 'page-loads-query',
    loadTime: 'load-time-query',
    jsErrors: 'js-errors-query',
    failedHttpRequests: 'failed-requests-query',
    requestLatency: 'latency-query',
  },
  counts: {
    sessionsWithErrors: 40,
    loadTimeSamples: pageLoads,
    httpRequests: 8,
    failedHttpRequests: 2,
  },
});

const fetch = jest.fn();
const setEnvironment = jest.fn();
const setFilter = jest.fn();
const setFilters = jest.fn();
const setPercentile = jest.fn();
const clearFilters = jest.fn();
const setTimeRange = jest.fn();

const timeRange = { rangeFrom: '2021-01-18T12:00:00.000Z', rangeTo: '2021-01-18T13:00:00.000Z' };

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

const include = (...values: string[]): FilterValue[] =>
  values.map((value) => ({ value, exclude: false }));
const exclude = (...values: string[]): FilterValue[] =>
  values.map((value) => ({ value, exclude: true }));

// What the URL holds: the filters param and the KQL query, as the hooks return them together.
let filterParams: { filters?: string } = {};
let currentKuery: string | undefined;

const mockSearchParams = () =>
  jest
    .mocked(useOverviewSearchParams)
    .mockReturnValue(currentKuery ? { ...filterParams, kuery: currentKuery } : filterParams);

const mockFilters = (filters: OverviewFilters) => {
  const encoded = encodeOverviewFilters(filters);
  filterParams = encoded ? { filters: encoded } : {};
  mockSearchParams();
  return jest.mocked(useOverviewFilters).mockReturnValue({
    filters,
    params: filterParams,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters: Object.keys(filters).length > 0,
  });
};

const mockSearch = ({
  percentile = 75,
  kuery,
}: { percentile?: OverviewPercentile; kuery?: string } = {}) => {
  jest.mocked(useOverviewPercentile).mockReturnValue({
    percentile,
    percentileParam: percentile === 75 ? undefined : `${percentile}`,
    setPercentile,
  });
  jest.mocked(useOverviewKuery).mockReturnValue({ kuery, setKuery: jest.fn() });
  currentKuery = kuery;
  mockSearchParams();
};

const mockTimeZoneSetting = (timeZoneSetting: string) =>
  jest.mocked(useKibanaServices).mockReturnValue({
    http: {},
    uiSettings: createUiSettingsMock({ 'dateFormat:tz': timeZoneSetting }),
  } as unknown as ReturnType<typeof useKibanaServices>);

beforeEach(() => {
  jest.clearAllMocks();
  mockBrushEndListeners.length = 0;
  fetch.mockImplementation(respond);
  jest.mocked(useQueryParam).mockReturnValue({ value: undefined, setValue: jest.fn() });
  jest
    .mocked(createRepositoryClient)
    .mockReturnValue({ fetch } as unknown as ReturnType<typeof createRepositoryClient>);
  jest.mocked(getCoreVitalsComponent).mockReturnValue(<div data-test-subj="coreVitals" />);
  jest.mocked(useEnvironment).mockReturnValue({ environment: undefined, setEnvironment });
  mockFilters({});
  mockSearch();
  jest.mocked(useTimeRange).mockReturnValue({ timeRange, isTimeRangeInUrl: true, setTimeRange });
  jest.mocked(useKibanaServices).mockReturnValue({
    http: {},
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
});

const pageLoadsKpi = () => screen.getByTestId('digitalExperienceOverviewPageLoads');

/** Waits for the page loads KPI, as the Trends panel shows the same count. */
const findPageLoads = (count: string) =>
  waitFor(() => expect(pageLoadsKpi()).toHaveTextContent(count));

/** Only the Overview charts over time, so only its request carries the time zone, UTC by default. */
const expectFetchedWith = (query: Record<string, string>, endpoint = OVERVIEW_ENDPOINT) => {
  const expectedQuery = endpoint === OVERVIEW_ENDPOINT ? { timeZone: 'UTC', ...query } : query;
  return expect(fetch).toHaveBeenCalledWith(
    endpoint,
    expect.objectContaining({
      params: { path: { serviceName: 'shop' }, query: expectedQuery },
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

    await waitFor(() =>
      expectFetchedWith({ start: timeRange.rangeFrom, end: timeRange.rangeTo, timeZone: 'UTC' })
    );
  });

  it.each([
    ['an explicit time zone', 'America/New_York', 'America/New_York'],
    ['the browser time zone', 'Browser', moment.tz.guess()],
  ])('asks for buckets in %s', async (_, setting, expected) => {
    mockTimeZoneSetting(setting);
    renderOverview();

    await waitFor(() =>
      expectFetchedWith({
        start: timeRange.rangeFrom,
        end: timeRange.rangeTo,
        timeZone: expected,
      })
    );
  });

  it('asks for the selected environment and lists the environments of the application', async () => {
    jest.mocked(useEnvironment).mockReturnValue({ environment: 'staging', setEnvironment });
    renderOverview();

    await waitFor(() =>
      expectFetchedWith({
        start: timeRange.rangeFrom,
        end: timeRange.rangeTo,
        environment: 'staging',
        timeZone: 'UTC',
      })
    );

    fireEvent.click(screen.getByTestId('digitalExperienceEnvironmentFilter'));
    expect(
      screen.getByTestId('digitalExperienceEnvironmentFilterOption-production')
    ).toBeInTheDocument();
  });

  it('asks for the selected filters, with their values and exclusions as params, in every request', async () => {
    mockFilters({
      browser: [...include('Chrome'), ...exclude('Safari')],
      country: include('DE'),
      pageUrl: include('https://shop.example.com/cart'),
    });
    renderOverview();

    const query = {
      start: timeRange.rangeFrom,
      end: timeRange.rangeTo,
      filters:
        encodeOverviewFilters({
          browser: [...include('Chrome'), ...exclude('Safari')],
          country: include('DE'),
          pageUrl: include('https://shop.example.com/cart'),
        }) ?? '',
    };
    await waitFor(() => expectFetchedWith(query));
    await waitFor(() => expectFetchedWith(query, USAGE_ENDPOINT));
    // The errors carry the route of their page, so the page narrows them too.
    await waitFor(() => expectFetchedWith(query, ERRORS_ENDPOINT));
  });

  it('leaves the URL text out of the errors request, as errors carry no URL', async () => {
    mockFilters({ browser: include('Chrome'), pageContains: include('/cart') });
    renderOverview();

    await waitFor(() =>
      expectFetchedWith(
        {
          start: timeRange.rangeFrom,
          end: timeRange.rangeTo,
          filters: encodeOverviewFilters({ browser: include('Chrome') }) ?? '',
        },
        ERRORS_ENDPOINT
      )
    );
  });

  it('asks for the percentile and the KQL query when they are set', async () => {
    mockSearch({ percentile: 95, kuery: 'user_agent.name: Chrome' });
    renderOverview();

    await waitFor(() =>
      expectFetchedWith({
        start: timeRange.rangeFrom,
        end: timeRange.rangeTo,
        percentile: '95',
        kuery: 'user_agent.name: Chrome',
      })
    );
  });

  it('names the percentile in the load time', async () => {
    mockSearch({ percentile: 95 });
    renderOverview();

    await findPageLoads('1,533');
    expect(screen.getByTestId('digitalExperienceOverviewLoadTime')).toHaveTextContent(
      'Load time (p95)'
    );
    expect(screen.getByTestId('digitalExperienceOverviewPercentile')).toHaveValue('95');
  });

  it('sets the percentile picked', async () => {
    renderOverview();
    await findPageLoads('1,533');

    fireEvent.change(screen.getByTestId('digitalExperienceOverviewPercentile'), {
      target: { value: '99' },
    });

    expect(setPercentile).toHaveBeenCalledWith(99);
  });

  it('lists the values of a filter with their page loads, and includes the one picked', async () => {
    renderOverview();
    await findPageLoads('1,533');

    fireEvent.click(screen.getByTestId('digitalExperienceOverviewFilter-browser'));
    const list = await screen.findByTestId('digitalExperienceOverviewFilter-browserList');
    expect(within(list).getByText('Chrome')).toBeInTheDocument();
    expect(within(list).getByText('1,200')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('digitalExperienceOverviewFilter-browserOption-Firefox'));

    expect(setFilter).toHaveBeenCalledWith('browser', include('Firefox'));
  });

  it('adds a value to the selection, and excludes another', async () => {
    mockFilters({ browser: include('Chrome') });
    renderOverview();
    await findPageLoads('1,533');

    fireEvent.click(screen.getByTestId('digitalExperienceOverviewFilter-browser'));
    fireEvent.click(
      await screen.findByTestId('digitalExperienceOverviewFilter-browserOption-Firefox')
    );
    expect(setFilter).toHaveBeenLastCalledWith('browser', include('Chrome', 'Firefox'));

    fireEvent.click(
      screen.getByTestId('digitalExperienceOverviewFilter-browserOption-Firefox-exclude')
    );
    expect(setFilter).toHaveBeenLastCalledWith('browser', [
      ...include('Chrome'),
      ...exclude('Firefox'),
    ]);
  });

  it('removes a value picked again, and clears the selection of a filter', async () => {
    mockFilters({ browser: include('Chrome', 'Firefox') });
    renderOverview();
    await findPageLoads('1,533');

    fireEvent.click(screen.getByTestId('digitalExperienceOverviewFilter-browser'));
    fireEvent.click(
      await screen.findByTestId('digitalExperienceOverviewFilter-browserOption-Chrome')
    );
    expect(setFilter).toHaveBeenLastCalledWith('browser', include('Firefox'));

    fireEvent.click(screen.getByTestId('digitalExperienceOverviewFilter-browserClear'));
    expect(setFilter).toHaveBeenLastCalledWith('browser', []);
  });

  it('shows what the filters select as pills, with "not" before an exclusion', async () => {
    mockFilters({
      browser: [...include('Chrome', 'Firefox'), ...exclude('Safari')],
      os: exclude('Linux'),
    });
    renderOverview();
    await findPageLoads('1,533');

    const pills = screen.getByTestId('digitalExperienceOverviewPills');
    expect(within(pills).getByText('Browser: Chrome')).toBeInTheDocument();
    expect(within(pills).getByText('Browser: Firefox')).toBeInTheDocument();
    expect(within(pills).getByText('Browser: not Safari')).toBeInTheDocument();
    expect(within(pills).getByText('OS: not Linux')).toBeInTheDocument();
  });

  it('shows the filters on their buttons by how many values they select', async () => {
    mockFilters({ browser: include('Chrome', 'Firefox') });
    renderOverview();
    await findPageLoads('1,533');

    expect(screen.getByTestId('digitalExperienceOverviewFilter-browser')).toHaveTextContent('2');
    expect(screen.getByTestId('digitalExperienceOverviewFilter-browser')).not.toHaveTextContent(
      'Chrome'
    );
  });

  it('removes a value with its pill, and keeps the others of the filter', async () => {
    mockFilters({ browser: [...include('Chrome'), ...exclude('Safari')] });
    renderOverview();
    await findPageLoads('1,533');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Browser: Chrome' }));

    expect(setFilter).toHaveBeenCalledWith('browser', exclude('Safari'));
  });

  it('shows no pills while no filter has a value', async () => {
    renderOverview();
    await findPageLoads('1,533');

    expect(screen.queryByTestId('digitalExperienceOverviewPills')).not.toBeInTheDocument();
  });

  it('keeps a value listed that is selected but has no page loads in the range', async () => {
    mockFilters({ browser: include('Edge') });
    renderOverview();
    await findPageLoads('1,533');

    fireEvent.click(screen.getByTestId('digitalExperienceOverviewFilter-browser'));

    expect(
      await screen.findByTestId('digitalExperienceOverviewFilter-browserOption-Edge')
    ).toBeChecked();
  });

  it('hides the pinned filters nothing reports values for, and keeps device in All filters only', async () => {
    renderOverview();
    await findPageLoads('1,533');

    expect(screen.getByTestId('digitalExperienceOverviewFilter-os')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceOverviewFilter-country')).not.toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceOverviewFilter-device')).not.toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceOverviewAllFilters')).toBeInTheDocument();
  });

  it('keeps a selected filter visible although it has no values, with its pill to remove it', async () => {
    mockFilters({ country: include('DE') });
    renderOverview();
    await findPageLoads('1,533');

    expect(screen.getByTestId('digitalExperienceOverviewFilter-country')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceOverviewPill-country-DE')).toHaveTextContent(
      'Country: DE'
    );
  });

  it('counts the selected values on the All filters button', async () => {
    mockFilters({ browser: include('Chrome', 'Firefox'), device: exclude('iPhone') });
    renderOverview();
    await findPageLoads('1,533');

    expect(screen.getByTestId('digitalExperienceOverviewAllFilters')).toHaveTextContent('3');
  });

  it('clears the filters, shown only while one is set', async () => {
    const { unmount } = renderOverview();
    await findPageLoads('1,533');
    expect(screen.queryByTestId('digitalExperienceOverviewClearFilters')).not.toBeInTheDocument();
    unmount();

    mockFilters({ os: include('macOS') });
    renderOverview();
    await findPageLoads('1,533');
    fireEvent.click(screen.getByTestId('digitalExperienceOverviewClearFilters'));

    expect(clearFilters).toHaveBeenCalledTimes(1);
  });

  it('says which panels the page filters narrow, for a page and for text its URL contains', async () => {
    mockFilters({ pageUrl: include('https://shop.example.com/cart') });
    const { unmount } = renderOverview();
    await findPageLoads('1,533');

    expect(screen.getByTestId('digitalExperienceOverviewPageFilterNote')).toHaveTextContent(
      'Page applies to every browser event but HTTP requests'
    );
    unmount();

    mockFilters({ pageContains: include('/cart') });
    renderOverview();
    await findPageLoads('1,533');

    expect(screen.getByTestId('digitalExperienceOverviewPageFilterNote')).toBeInTheDocument();
  });

  describe('All filters', () => {
    const openFlyout = async () => {
      renderOverview();
      await findPageLoads('1,533');
      fireEvent.click(screen.getByTestId('digitalExperienceOverviewAllFilters'));
      return screen.findByTestId('digitalExperienceOverviewFiltersFlyout');
    };

    const flyoutOption = (name: string, value: string) =>
      screen.getByTestId(`digitalExperienceOverviewFiltersFlyout-${name}Option-${value}`);

    it('lists every filter, device included, with a note for one without values', async () => {
      const flyout = await openFlyout();

      ['browser', 'os', 'device', 'country', 'appVersion', 'pageUrl', 'pageContains'].forEach(
        (name) =>
          expect(
            within(flyout).getByTestId(`digitalExperienceOverviewFiltersFlyout-${name}`)
          ).toBeInTheDocument()
      );
      expect(
        within(screen.getByTestId('digitalExperienceOverviewFiltersFlyout-device')).getByText(
          'No values in the selected time range'
        )
      ).toBeInTheDocument();
    });

    it('applies the picks of all the filters in one step, as a draft until then', async () => {
      await openFlyout();

      fireEvent.click(flyoutOption('browser', 'Firefox'));
      fireEvent.click(flyoutOption('os', 'macOS'));
      fireEvent.click(
        screen.getByTestId('digitalExperienceOverviewFiltersFlyout-browserOption-Chrome-exclude')
      );
      expect(setFilters).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('digitalExperienceOverviewFiltersApply'));

      expect(setFilters).toHaveBeenCalledWith({
        browser: [...include('Firefox'), ...exclude('Chrome')],
        os: include('macOS'),
        device: [],
        country: [],
        appVersion: [],
        pageUrl: [],
        pageContains: [],
      });
      await waitFor(() =>
        expect(
          screen.queryByTestId('digitalExperienceOverviewFiltersFlyout')
        ).not.toBeInTheDocument()
      );
    });

    it('starts from the applied filters, and applies a removal', async () => {
      mockFilters({ browser: include('Chrome'), os: include('macOS') });
      await openFlyout();
      expect(flyoutOption('browser', 'Chrome')).toBeChecked();

      fireEvent.click(flyoutOption('browser', 'Chrome'));
      fireEvent.click(screen.getByTestId('digitalExperienceOverviewFiltersApply'));

      expect(setFilters).toHaveBeenCalledWith({
        browser: [],
        os: include('macOS'),
        device: [],
        country: [],
        appVersion: [],
        pageUrl: [],
        pageContains: [],
      });
    });

    it('clears every filter at once', async () => {
      mockFilters({ browser: include('Chrome'), os: include('macOS') });
      await openFlyout();

      fireEvent.click(screen.getByTestId('digitalExperienceOverviewFiltersReset'));
      fireEvent.click(screen.getByTestId('digitalExperienceOverviewFiltersApply'));

      expect(setFilters).toHaveBeenCalledWith({
        browser: [],
        os: [],
        device: [],
        country: [],
        appVersion: [],
        pageUrl: [],
        pageContains: [],
      });
    });

    it('lists the versions of the application to pick from', async () => {
      await openFlyout();

      expect(flyoutOption('appVersion', '1.3.0')).toBeInTheDocument();
      expect(flyoutOption('appVersion', '1.2.0')).toBeInTheDocument();
    });

    it('takes text the URL contains as a value, trimmed and once, with no list to pick from', async () => {
      await openFlyout();
      const section = within(
        screen.getByTestId('digitalExperienceOverviewFiltersFlyout-pageContains')
      );
      expect(section.queryByText('No values in the selected time range')).not.toBeInTheDocument();

      const input = screen.getByTestId(
        'digitalExperienceOverviewFiltersFlyout-pageContainsTextInput'
      );
      fireEvent.change(input, { target: { value: '  /checkout  ' } });
      fireEvent.click(
        screen.getByTestId('digitalExperienceOverviewFiltersFlyout-pageContainsTextAdd')
      );
      fireEvent.change(input, { target: { value: '/checkout' } });
      fireEvent.click(
        screen.getByTestId('digitalExperienceOverviewFiltersFlyout-pageContainsTextAdd')
      );
      expect(flyoutOption('pageContains', '/checkout')).toBeChecked();
      expect(input).toHaveValue('');

      fireEvent.click(screen.getByTestId('digitalExperienceOverviewFiltersApply'));

      expect(setFilters).toHaveBeenCalledWith(
        expect.objectContaining({ pageContains: include('/checkout') })
      );
    });

    it('applies nothing until a pick changes the filters, and nothing on cancel', async () => {
      await openFlyout();
      expect(screen.getByTestId('digitalExperienceOverviewFiltersApply')).toBeDisabled();

      fireEvent.click(flyoutOption('browser', 'Firefox'));
      expect(screen.getByTestId('digitalExperienceOverviewFiltersApply')).toBeEnabled();
      fireEvent.click(screen.getByTestId('digitalExperienceOverviewFiltersCancel'));

      expect(setFilters).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(
          screen.queryByTestId('digitalExperienceOverviewFiltersFlyout')
        ).not.toBeInTheDocument()
      );
    });
  });

  describe('click to filter', () => {
    it('filters by a browser, a system, a device or a page when its row is clicked', async () => {
      renderOverview();
      await findPageLoads('1,533');

      fireEvent.click(
        screen.getByTestId('digitalExperienceOverviewBreakdownFilter-browser-Chrome')
      );
      expect(setFilter).toHaveBeenLastCalledWith('browser', include('Chrome'));
      fireEvent.click(screen.getByTestId('digitalExperienceOverviewBreakdownFilter-os-macOS'));
      expect(setFilter).toHaveBeenLastCalledWith('os', include('macOS'));
      fireEvent.click(
        screen.getByTestId('digitalExperienceOverviewBreakdownFilter-device-MacBook Pro')
      );
      expect(setFilter).toHaveBeenLastCalledWith('device', include('MacBook Pro'));
      fireEvent.click(screen.getByTestId('digitalExperienceOverviewTopPageFilter'));
      expect(setFilter).toHaveBeenLastCalledWith('pageUrl', include('https://shop.example.com/'));
    });

    it('adds to what is selected, and takes a selected row off when it is clicked again', async () => {
      mockFilters({ browser: include('Firefox'), pageUrl: include('https://shop.example.com/') });
      renderOverview();
      await findPageLoads('1,533');

      fireEvent.click(
        screen.getByTestId('digitalExperienceOverviewBreakdownFilter-browser-Chrome')
      );
      expect(setFilter).toHaveBeenLastCalledWith('browser', include('Firefox', 'Chrome'));

      fireEvent.click(screen.getByTestId('digitalExperienceOverviewTopPageFilter'));
      expect(setFilter).toHaveBeenLastCalledWith('pageUrl', []);
    });
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

    // The Overview, its KPIs, its usage, its entry pages and its top errors, on mount and on Refresh.
    await waitFor(() => {
      return expect(fetch).toHaveBeenCalledTimes(10);
    });
  });

  it('shows the usage panels below the trends', async () => {
    renderOverview();

    expect(await screen.findByTitle('https://shop.example.com/')).toBeInTheDocument();
    [
      'digitalExperienceOverviewTopPages',
      'digitalExperienceOverviewBreakdowns',
      'digitalExperienceOverviewTopClicks',
      'digitalExperienceOverviewFrustration',
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
        return respond(endpoint);
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

  it('lists the entry pages with their sessions and bounce rate, each opening its sessions', async () => {
    renderOverview();

    const panel = await screen.findByTestId('digitalExperienceOverviewEntryPages');
    expect(await within(panel).findByTitle('/products')).toBeInTheDocument();
    expect(within(panel).getByText('30')).toBeInTheDocument();
    expect(within(panel).getByText('40%')).toBeInTheDocument();
    expect(
      within(panel).getAllByTestId('digitalExperienceOverviewEntryPageSessionsLink')[0]
    ).toHaveAttribute('href', '/sessions');
  });

  it('narrows the entry pages by the Overview filters', async () => {
    mockFilters({ browser: include('Chrome') });
    renderOverview();

    await waitFor(() =>
      expectFetchedWith(
        {
          start: timeRange.rangeFrom,
          end: timeRange.rangeTo,
          filters: encodeOverviewFilters({ browser: include('Chrome') }) ?? '',
        },
        ENTRY_PAGES_ENDPOINT
      )
    );
  });

  it('shows a retryable error instead of the entry pages only', async () => {
    let entryPagesFail = true;
    fetch.mockImplementation(async (endpoint: string) => {
      if (endpoint !== ENTRY_PAGES_ENDPOINT) {
        return respond(endpoint);
      }
      if (entryPagesFail) {
        throw new Error('Could not load the entry pages.');
      }
      return ENTRY_PAGES_RESPONSE;
    });
    renderOverview();

    expect(
      await screen.findByTestId('digitalExperienceOverviewEntryPagesError')
    ).toBeInTheDocument();
    await findPageLoads('1,533');
    expect(screen.getByTestId('digitalExperienceOverviewTopPages')).toBeInTheDocument();

    entryPagesFail = false;
    fireEvent.click(screen.getByTestId('digitalExperienceOverviewEntryPagesRetry'));

    expect(await screen.findByTitle('/products')).toBeInTheDocument();
  });

  it('opens each tile and trend in Discover with the query of the KPI response', async () => {
    renderOverview();

    await findPageLoads('1,533');
    expect(screen.getByTestId('digitalExperienceOverviewJsErrorsDiscover')).toHaveAttribute(
      'href',
      '/discover/js-errors-query'
    );
    expect(screen.getByTestId('digitalExperienceOverviewPageLoadsTrendDiscover')).toHaveAttribute(
      'href',
      '/discover/page-loads-query'
    );
    expect(screen.getByTestId('digitalExperienceOverviewLoadTimeTrendDiscover')).toHaveAttribute(
      'href',
      '/discover/load-time-query'
    );
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
    let resolvePrevious: (value: ApplicationOverviewKpisResponse) => void = () => {};
    fetch.mockImplementation(
      (endpoint: string, { params }: { params: { query: { environment?: string } } }) => {
        if (params.query.environment === 'staging') {
          return respondWith(7)(endpoint);
        }
        return endpoint === KPIS_ENDPOINT
          ? new Promise((resolve) => (resolvePrevious = resolve))
          : new Promise(() => {});
      }
    );
    const { rerender } = renderOverview();

    jest.mocked(useEnvironment).mockReturnValue({ environment: 'staging', setEnvironment });
    rerender(<OtelOverview serviceName="shop" />);
    await findPageLoads('7');

    await act(async () => resolvePrevious(kpisResponse(1533)));

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

  it('shows the error with a retry that loads the Overview again, and keeps the KPIs', async () => {
    fetch.mockImplementation(async (endpoint: string) => {
      if (endpoint === OVERVIEW_ENDPOINT) {
        throw new Error('Could not load the Overview.');
      }
      return respond(endpoint);
    });
    renderOverview();

    expect(await screen.findByTestId('digitalExperienceOverviewError')).toHaveTextContent(
      'Could not load the Overview'
    );
    await findPageLoads('1,533');
    expect(screen.queryByTestId('digitalExperienceOverviewPageLoadsTrend')).not.toBeInTheDocument();

    fetch.mockImplementation(respond);
    fireEvent.click(screen.getByTestId('digitalExperienceOverviewRetry'));

    expect(
      await screen.findByTestId('digitalExperienceOverviewPageLoadsTrend')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceOverviewError')).not.toBeInTheDocument();
  });

  it('shows the KPIs error with a retry, and keeps the panels below', async () => {
    fetch.mockImplementation(async (endpoint: string) => {
      if (endpoint === KPIS_ENDPOINT) {
        throw new Error('Could not load the KPIs.');
      }
      return respond(endpoint);
    });
    renderOverview();

    expect(await screen.findByTestId('digitalExperienceOverviewKpisError')).toHaveTextContent(
      'Could not load the KPIs'
    );
    expect(
      await screen.findByTestId('digitalExperienceOverviewPageLoadsTrend')
    ).toBeInTheDocument();

    fetch.mockImplementation(respond);
    fireEvent.click(screen.getByTestId('digitalExperienceOverviewKpisRetry'));

    await findPageLoads('1,533');
    expect(screen.queryByTestId('digitalExperienceOverviewKpisError')).not.toBeInTheDocument();
  });

  it('asks for the KPIs with the filters, the query and the percentile', async () => {
    mockFilters({ browser: [{ value: 'Chrome', exclude: false }] });
    mockSearch({ percentile: 95, kuery: 'user.id : "u-1"' });
    renderOverview();

    await waitFor(() =>
      expectFetchedWith(
        {
          start: timeRange.rangeFrom,
          end: timeRange.rangeTo,
          ...filterParams,
          kuery: 'user.id : "u-1"',
          percentile: '95',
        },
        KPIS_ENDPOINT
      )
    );
  });

  it('shows the change against the previous period when Compare is on', async () => {
    jest.mocked(useQueryParam).mockReturnValue({ value: 'true', setValue: jest.fn() });
    renderOverview();
    await findPageLoads('1,533');

    // More sessions, but fewer of them without errors.
    expect(screen.getByTestId('digitalExperienceOverviewSessionsChange')).toHaveTextContent('+25%');
    expect(screen.getByTestId('digitalExperienceOverviewSessionsPrevious')).toHaveTextContent(
      'vs 320'
    );
    expect(
      screen.getByTestId('digitalExperienceOverviewErrorFreeSessionsChange')
    ).toHaveTextContent('-5 pp');
    // No change without a previous value.
    expect(
      screen.queryByTestId('digitalExperienceOverviewRequestLatencyChange')
    ).not.toBeInTheDocument();
  });

  it('shows no change while Compare is off', async () => {
    renderOverview();
    await findPageLoads('1,533');

    expect(screen.queryByTestId('digitalExperienceOverviewLoadTimeChange')).not.toBeInTheDocument();
  });
});
