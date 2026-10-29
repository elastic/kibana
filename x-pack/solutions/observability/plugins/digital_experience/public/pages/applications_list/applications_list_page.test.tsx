/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { ApplicationsListPage, EDOT_BROWSER_DOCS_URL } from './applications_list_page';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useTimeRange } from '../../hooks/use_time_range';
import { useDigitalExperienceRouter } from '../../hooks/use_digital_experience_router';
import { digitalExperienceRouter } from '../../routes';
import type { ApplicationSummary } from '../../../common/types/applications';
import { TimeRangePicker } from '../../components/time_range_picker';
import { EnvironmentFilter } from '../../components/environment_filter';
import { SourceFilter } from './components/source_filter';
import { useEnvironment } from '../../hooks/use_environment';
import { useSourceFilter } from '../../hooks/use_source_filter';
import { createUiSettingsMock } from '../../test_utils/ui_settings_mock';

jest.mock('../../hooks/use_kibana_services');
jest.mock('../../hooks/use_time_range');
jest.mock('../../hooks/use_environment');
jest.mock('../../hooks/use_source_filter');
jest.mock('../../hooks/use_digital_experience_router');
jest.mock('../../components/time_range_picker', () => ({ TimeRangePicker: jest.fn(() => null) }));
jest.mock('../../components/environment_filter', () => ({
  EnvironmentFilter: jest.fn(() => null),
}));
jest.mock('./components/source_filter', () => ({ SourceFilter: jest.fn(() => null) }));

const timeRange = { rangeFrom: 'now-15m', rangeTo: 'now' };

const mockTimeRange = (range: ReturnType<typeof useTimeRange>['timeRange']) =>
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: range,
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });

const mockFetch = jest.fn();
jest.mock('@kbn/server-route-repository-client', () => ({
  createRepositoryClient: jest.fn(() => ({ fetch: (...args: unknown[]) => mockFetch(...args) })),
}));

const setEnvironment = jest.fn();

const mockEnvironment = (environment?: string) =>
  jest.mocked(useEnvironment).mockReturnValue({ environment, setEnvironment });

const setSourceFilter = jest.fn();

const mockSourceFilter = (sourceFilter?: ApplicationSummary['source']) =>
  jest.mocked(useSourceFilter).mockReturnValue({ sourceFilter, setSourceFilter });

const SAMPLES = 5;

const vital = (value: number | null) => ({
  sampleCount: value === null ? 0 : SAMPLES,
  ratings: value === null ? null : { good: 0.5, needsImprovement: 0.3, poor: 0.2 },
});

const app = ({
  serviceName = 'app-a',
  source = 'classic',
  pageLoads = 10,
  lcp = 2400 as number | null,
  inp = 300 as number | null,
  cls = 0.3 as number | null,
  fcp = 1200 as number | null,
  ttfb = 900 as number | null,
  httpRequests = { count: 8, failedCount: 1 },
}: Partial<{
  serviceName: string;
  source: ApplicationSummary['source'];
  pageLoads: number;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  httpRequests: { count: number; failedCount: number };
}> = {}): ApplicationSummary => ({
  serviceName,
  source,
  environments: [],
  pageLoads: { count: pageLoads },
  webVitals: {
    lcp: { p75Ms: lcp, ...vital(lcp) },
    inp: { p75Ms: inp, ...vital(inp) },
    cls: { p75: cls, ...vital(cls) },
    fcp: { p75Ms: fcp, ...vital(fcp) },
    ttfb: { p75Ms: ttfb, ...vital(ttfb) },
  },
  jsErrors: { count: 2, perPageLoad: pageLoads > 0 ? 2 / pageLoads : null },
  httpRequests: {
    ...httpRequests,
    failedRatio: httpRequests.count > 0 ? httpRequests.failedCount / httpRequests.count : null,
  },
  lastSeen: '2021-01-18T12:25:00.000Z',
});

const respondWith = (
  applications: ApplicationSummary[],
  environments: string[] = [],
  unavailableSources: Array<ApplicationSummary['source']> = []
) => mockFetch.mockResolvedValue({ applications, environments, unavailableSources });

// `isServerless` leaves out the ux plugin, as serverless does.
const renderPage = ({ isServerless = false } = {}) => {
  jest.mocked(useKibanaServices).mockReturnValue({
    application: {
      getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
    },
    http: {},
    uiSettings: createUiSettingsMock(),
    ux: isServerless ? undefined : {},
  } as unknown as ReturnType<typeof useKibanaServices>);
  // EUI's theme (for `EmptyCellValue`) and intl (for `FormattedRelative`), kept across rerenders.
  return render(<ApplicationsListPage />, {
    wrapper: ({ children }) => (
      <I18nProvider>
        <EuiProvider>
          <MockAppHeaderProvider>{children}</MockAppHeaderProvider>
        </EuiProvider>
      </I18nProvider>
    ),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  // The visible columns are kept in local storage.
  window.localStorage.clear();
  mockTimeRange(timeRange);
  mockEnvironment();
  mockSourceFilter();
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);
});

describe('ApplicationsListPage', () => {
  it('links each application to its Overview with the time range and its source', async () => {
    respondWith([
      app({ serviceName: 'app-a', source: 'classic', pageLoads: 20 }),
      app({ serviceName: 'app-b', source: 'otel', pageLoads: 10 }),
    ]);
    renderPage();

    const links = await screen.findAllByTestId('digitalExperienceApplicationLink');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/app/digital_experience/app-a?rangeFrom=now-15m&rangeTo=now&source=classic',
      '/app/digital_experience/app-b?rangeFrom=now-15m&rangeTo=now&source=otel',
    ]);
    expect(mockFetch).toHaveBeenCalledWith('GET /internal/digital_experience/applications', {
      signal: expect.any(AbortSignal),
      params: { query: { start: expect.any(String), end: expect.any(String) } },
    });
  });

  it('shows a source badge, the metrics and the vitals colored by rating', async () => {
    respondWith([
      app({ serviceName: 'good-app', source: 'otel', lcp: 2400, inp: 150, cls: 0.05 }),
      app({ serviceName: 'poor-app', source: 'classic', lcp: 4500, inp: 600, cls: 0.3 }),
    ]);
    renderPage();

    await screen.findAllByTestId('digitalExperienceApplicationLink');
    expect(
      screen
        .getAllByTestId('digitalExperienceApplicationSource')
        .map(({ textContent }) => textContent)
    ).toEqual(['EDOT Browser', 'Classic RUM']);

    const ratingOf = (name: string) =>
      screen
        .getAllByTestId(`digitalExperienceVital-${name}`)
        .map((element) => element.getAttribute('data-rating'));
    expect(ratingOf('lcp')).toEqual(['good', 'poor']);
    expect(ratingOf('inp')).toEqual(['good', 'poor']);
    expect(ratingOf('cls')).toEqual(['good', 'poor']);
    expect(screen.getByText('2.40 s')).toBeInTheDocument();
    expect(
      screen.getAllByTestId('digitalExperienceFailedHttp').map(({ textContent }) => textContent)
    ).toEqual(['12.5%', '12.5%']);
  });

  it('shows the sample count of each vital', async () => {
    respondWith([app()]);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceVital-lcp')).toHaveAttribute(
      'data-sample-count',
      String(SAMPLES)
    );
  });

  it('shows a dash for vitals and failed HTTP without data', async () => {
    respondWith([
      app({
        lcp: null,
        inp: null,
        cls: null,
        fcp: null,
        ttfb: null,
        httpRequests: { count: 0, failedCount: 0 },
      }),
    ]);
    renderPage();

    await screen.findByTestId('digitalExperienceApplicationLink');
    expect(screen.queryByTestId('digitalExperienceVital-lcp')).not.toBeInTheDocument();
    // LCP, INP, CLS and failed HTTP; FCP and TTFB are hidden by default.
    expect(
      within(screen.getByTestId('digitalExperienceApplicationsTable')).getAllByText('—')
    ).toHaveLength(4);
  });

  it('shows the loading state, not the empty prompt, while the request is pending', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText('Loading applications…')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceApplicationsEmpty')).not.toBeInTheDocument();
  });

  it('shows the empty prompt linking to the EDOT Browser docs when there are no applications', async () => {
    respondWith([]);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceApplicationsEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceApplicationsDocsLink')).toHaveAttribute(
      'href',
      EDOT_BROWSER_DOCS_URL
    );
  });

  it('shows the error with a retry, not the empty prompt, when the request fails', async () => {
    mockFetch.mockRejectedValue(new Error('boom'));
    renderPage();

    expect(await screen.findByTestId('digitalExperienceApplicationsError')).toHaveTextContent(
      'boom'
    );
    expect(screen.queryByTestId('digitalExperienceApplicationsEmpty')).not.toBeInTheDocument();

    respondWith([app()]);
    fireEvent.click(screen.getByTestId('digitalExperienceApplicationsRetry'));

    expect(await screen.findByTestId('digitalExperienceApplicationLink')).toBeInTheDocument();
  });

  it('drops the previous results and reports an invalid range without fetching', async () => {
    respondWith([app()]);
    const { rerender } = renderPage();
    await screen.findByTestId('digitalExperienceApplicationLink');

    mockTimeRange({ rangeFrom: 'not-a-date', rangeTo: 'now' });
    rerender(<ApplicationsListPage />);

    expect(await screen.findByTestId('digitalExperienceApplicationsError')).toHaveTextContent(
      'Invalid Dates'
    );
    expect(screen.queryByTestId('digitalExperienceApplicationLink')).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fetches again when the time range picker refreshes', async () => {
    respondWith([]);
    renderPage();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const { onRefresh } = jest.mocked(TimeRangePicker).mock.calls[0][0];
    act(() => onRefresh());

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it('aborts the pending request on unmount', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderPage();
    const [[, { signal }]] = mockFetch.mock.calls;

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it('asks for the selected environment', async () => {
    mockEnvironment('production');
    respondWith([]);
    renderPage();

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('GET /internal/digital_experience/applications', {
        signal: expect.any(AbortSignal),
        params: {
          query: { start: expect.any(String), end: expect.any(String), environment: 'production' },
        },
      })
    );
  });

  it('gives the picker the environments and the selection, and selects through the URL', async () => {
    mockEnvironment('staging');
    respondWith([app()], ['ENVIRONMENT_NOT_DEFINED', 'production', 'staging']);
    renderPage();
    await screen.findByTestId('digitalExperienceApplicationLink');

    const [[props]] = jest.mocked(EnvironmentFilter).mock.calls.slice(-1);
    expect(props).toMatchObject({
      environments: ['ENVIRONMENT_NOT_DEFINED', 'production', 'staging'],
      selected: 'staging',
      isLoading: false,
    });

    act(() => props.onChange(undefined));
    expect(setEnvironment).toHaveBeenCalledWith(undefined);
  });

  it('hides FCP, TTFB and JS errors until they are selected in the column selector', async () => {
    respondWith([app()]);
    renderPage();
    await screen.findByTestId('digitalExperienceApplicationLink');

    expect(screen.queryByTestId('digitalExperienceVital-fcp')).not.toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceColumnSelector')).toHaveTextContent('6/9');
  });

  it('always shows the page loads, which the table is sorted by', async () => {
    window.localStorage.setItem(
      'xpack.digitalExperience.applications.hiddenColumns',
      JSON.stringify([
        'errorRate',
        'lcp',
        'inp',
        'cls',
        'fcp',
        'ttfb',
        'jsErrors',
        'failedHttp',
        'lastSeen',
      ])
    );
    respondWith([app()]);
    renderPage();
    await screen.findByTestId('digitalExperienceApplicationLink');

    expect(screen.getByRole('columnheader', { name: /Page loads/ })).toBeInTheDocument();
  });

  it('keeps the summary on every application while the search narrows the table', async () => {
    respondWith([app({ serviceName: 'shop' }), app({ serviceName: 'docs', source: 'otel' })]);
    renderPage();
    await screen.findAllByTestId('digitalExperienceApplicationLink');

    fireEvent.change(screen.getByTestId('digitalExperienceApplicationsSearch'), {
      target: { value: 'sho' },
    });

    expect(screen.getAllByTestId('digitalExperienceApplicationLink')).toHaveLength(1);
    expect(screen.getByTestId('digitalExperienceSummary-applications')).toHaveTextContent('2');
  });

  it('ignores a source in the URL where the source filter is not shown', async () => {
    mockSourceFilter('classic');
    respondWith([app({ serviceName: 'shop', source: 'otel' })]);
    renderPage({ isServerless: true });

    expect(await screen.findByTestId('digitalExperienceApplicationLink')).toHaveTextContent('shop');
  });

  it('offers to show all environments when the selected one has no applications', async () => {
    mockEnvironment('staging');
    respondWith([], ['production', 'staging']);
    renderPage();

    fireEvent.click(await screen.findByTestId('digitalExperienceShowAllEnvironments'));

    expect(setEnvironment).toHaveBeenCalledWith(undefined);
    expect(screen.queryByTestId('digitalExperienceApplicationsEmpty')).not.toBeInTheDocument();
  });

  it('warns when a source could not be loaded', async () => {
    respondWith([app({ source: 'otel' })], [], ['classic']);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceUnavailableSources')).toHaveTextContent(
      'Classic RUM'
    );
  });

  it('shows FCP, TTFB, the error rate and the last seen time', async () => {
    respondWith([app({ fcp: 3500, ttfb: 700, pageLoads: 4 })]);
    renderPage();
    await screen.findByTestId('digitalExperienceApplicationLink');
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelector'));
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelectorOption-fcp'));
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelectorOption-ttfb'));

    expect(await screen.findByTestId('digitalExperienceVital-fcp')).toHaveAttribute(
      'data-rating',
      'poor'
    );
    expect(screen.getByTestId('digitalExperienceVital-ttfb')).toHaveAttribute(
      'data-rating',
      'good'
    );
    expect(
      within(screen.getByTestId('digitalExperienceApplicationsTable')).getByText('0.50')
    ).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceLastSeen')).toBeInTheDocument();
  });

  it('shows one EDOT Browser row with a hint for a name with both sources', async () => {
    respondWith([
      app({ serviceName: 'shop', source: 'otel' }),
      app({ serviceName: 'shop', source: 'classic' }),
    ]);
    renderPage();

    const links = await screen.findAllByTestId('digitalExperienceApplicationLink');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toContain('source=otel');
    fireEvent.click(screen.getByTestId('digitalExperienceClassicDataHint'));
    expect(setSourceFilter).toHaveBeenCalledWith('classic');
  });

  it('shows the rows of the selected source', async () => {
    mockSourceFilter('classic');
    respondWith([
      app({ serviceName: 'shop', source: 'otel' }),
      app({ serviceName: 'shop', source: 'classic' }),
    ]);
    renderPage();

    const [link] = await screen.findAllByTestId('digitalExperienceApplicationLink');
    expect(link.getAttribute('href')).toContain('source=classic');
    expect(screen.queryByTestId('digitalExperienceClassicDataHint')).not.toBeInTheDocument();
  });

  it('gives the source filter the selection, and selects through the URL', async () => {
    mockSourceFilter('classic');
    respondWith([app({ source: 'classic' })]);
    renderPage();
    await screen.findByTestId('digitalExperienceApplicationLink');

    const [[props]] = jest.mocked(SourceFilter).mock.calls.slice(-1);
    expect(props).toMatchObject({ selected: 'classic' });

    act(() => props.onChange('otel'));
    expect(setSourceFilter).toHaveBeenCalledWith('otel');
  });

  it('has no source filter on serverless, which has no Classic RUM data', async () => {
    respondWith([app({ source: 'otel' })]);
    renderPage({ isServerless: true });
    await screen.findByTestId('digitalExperienceApplicationLink');

    expect(SourceFilter).not.toHaveBeenCalled();
  });

  it('searches the names, and says when nothing matches', async () => {
    respondWith([app({ serviceName: 'shop' }), app({ serviceName: 'docs', source: 'otel' })]);
    renderPage();
    await screen.findAllByTestId('digitalExperienceApplicationLink');

    fireEvent.change(screen.getByTestId('digitalExperienceApplicationsSearch'), {
      target: { value: 'sho' },
    });
    expect(
      screen
        .getAllByTestId('digitalExperienceApplicationLink')
        .map(({ textContent }) => textContent)
    ).toEqual(['shop']);

    fireEvent.change(screen.getByTestId('digitalExperienceApplicationsSearch'), {
      target: { value: 'nothing' },
    });
    expect(screen.getByText('No applications match the search or the source.')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceApplicationsEmpty')).not.toBeInTheDocument();
  });
});
