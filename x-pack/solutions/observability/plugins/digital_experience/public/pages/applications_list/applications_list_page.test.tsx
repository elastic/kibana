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
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { ApplicationsListPage } from './applications_list_page';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { EDOT_BROWSER_DOCS_URL } from '../../utils/doc_links';
import { useTimeRange } from '../../hooks/use_time_range';
import { useDigitalExperienceRouter } from '../../hooks/use_digital_experience_router';
import { digitalExperienceRouter } from '../../routes';
import type {
  ApplicationSummary,
  ApplicationType,
  MobileAvailability,
  MobileApplicationSummary,
  MobilePlatform,
  WebApplicationSummary,
} from '../../../common/types/applications';
import { TimeRangePicker } from '../../components/time_range_picker';
import { EnvironmentFilter } from '../../components/environment_filter';
import { SourceFilter } from './web/source_filter';
import { useEnvironment } from '../../hooks/use_environment';
import { useSourceFilter } from '../../hooks/use_source_filter';
import { usePlatformFilter } from '../../hooks/use_platform_filter';
import { useApplicationType } from '../../hooks/use_application_type';
import { createUiSettingsMock } from '../../test_utils/ui_settings_mock';

jest.mock('../../hooks/use_kibana_services');
jest.mock('../../hooks/use_time_range');
jest.mock('../../hooks/use_environment');
jest.mock('../../hooks/use_source_filter');
jest.mock('../../hooks/use_platform_filter');
jest.mock('../../hooks/use_application_type');
jest.mock('../../hooks/use_digital_experience_router');
jest.mock('../../components/time_range_picker', () => ({ TimeRangePicker: jest.fn(() => null) }));
jest.mock('../../components/environment_filter', () => ({
  EnvironmentFilter: jest.fn(() => null),
}));
jest.mock('./web/source_filter', () => ({ SourceFilter: jest.fn(() => null) }));
jest.mock('./mobile/platform_filter', () => ({ PlatformFilter: jest.fn(() => null) }));

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

const mockPlatformFilter = (platformFilter?: MobilePlatform) =>
  jest.mocked(usePlatformFilter).mockReturnValue({ platformFilter, setPlatformFilter: jest.fn() });

const setApplicationType = jest.fn();

const mockApplicationType = (applicationType?: ApplicationType) =>
  jest.mocked(useApplicationType).mockReturnValue({ applicationType, setApplicationType });

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
  sessions = null as number | null,
}: Partial<{
  serviceName: string;
  source: WebApplicationSummary['source'];
  pageLoads: number;
  sessions: number | null;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  httpRequests: { count: number; failedCount: number };
}> = {}): WebApplicationSummary => ({
  serviceName,
  source,
  applicationType: 'web',
  environments: [],
  pageLoads: { count: pageLoads },
  sessions: sessions === null ? null : { count: sessions },
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
  unavailableSources: Array<ApplicationSummary['source']> = [],
  sessionsOverTime: Array<{ timestamp: number; count: number }> | null = null,
  partiallyAvailableSources: Array<ApplicationSummary['source']> = [],
  mobileAvailability: MobileAvailability = 'complete'
) =>
  mockFetch.mockResolvedValue({
    applications,
    environments,
    unavailableSources,
    pageLoadsOverTime: {
      otel: [],
      classic: [],
      histogram: { interval: { value: 30, unit: 's' }, start: 0, end: 15 * 60 * 1000 },
    },
    sessionsOverTime,
    partiallyAvailableSources,
    mobileAvailability,
  });

// `isServerless` leaves out the ux plugin, as serverless does.
const renderPage = ({
  isServerless = false,
  timeZoneSetting = 'UTC',
}: { isServerless?: boolean; timeZoneSetting?: string } = {}) => {
  jest.mocked(useKibanaServices).mockReturnValue({
    application: {
      getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
    },
    http: {},
    uiSettings: createUiSettingsMock({ 'dateFormat:tz': timeZoneSetting }),
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
  mockPlatformFilter();
  mockApplicationType();
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);
});

const mobileApp = (
  serviceName = 'shop-mobile',
  platforms: MobilePlatform[] = ['android', 'ios']
): MobileApplicationSummary => ({
  serviceName,
  source: 'otel',
  applicationType: 'mobile',
  platforms,
  environments: [],
  latestRelease: '1.2.3',
  sessions: { count: 7 },
  users: { count: 3 },
  crashFreeSessions: { value: null, previous: null, delta: null },
  errorRate: 0.25,
  lastSeen: '2021-01-18T12:25:00.000Z',
});

const webApp = () => app({ serviceName: 'web-app', source: 'otel', pageLoads: 5 });

describe('ApplicationsListPage mobile applications', () => {
  it('shows them alone, without tabs, when there are no web applications', async () => {
    respondWith([mobileApp()]);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileApplicationsTable')).toBeVisible();
    expect(screen.queryByTestId('digitalExperienceApplicationTypeTabs')).toBeNull();
    expect(screen.queryByTestId('digitalExperienceApplicationsTable')).toBeNull();
  });

  it('lists one row per application with a badge per platform, linked to the mobile page', async () => {
    respondWith([mobileApp()]);
    renderPage();

    await screen.findByTestId('digitalExperienceMobileApplicationsTable');
    expect(screen.getAllByTestId('digitalExperienceMobileApplicationLink')).toHaveLength(1);
    expect(
      screen
        .getAllByTestId('digitalExperiencePlatformBadge')
        .map((badge) => badge.getAttribute('data-platform'))
    ).toEqual(['android', 'ios']);
    expect(screen.getByTestId('digitalExperienceMobileLatestRelease')).toHaveTextContent('1.2.3');
    expect(screen.getByTestId('digitalExperienceMobileSessions')).toHaveTextContent('7');
    expect(screen.getByTestId('digitalExperienceMobileCrashFree')).toHaveTextContent(
      'Not enough data'
    );
    expect(screen.getByTestId('digitalExperienceMobileApplicationLink')).toHaveAttribute(
      'href',
      '/app/digital_experience/shop-mobile?applicationType=mobile&rangeFrom=now-15m&rangeTo=now&source=otel'
    );
  });

  it('explains the error rate, a ratio per session, in its column header', async () => {
    respondWith([mobileApp()]);
    renderPage();

    await screen.findByTestId('digitalExperienceMobileApplicationsTable');
    const header = screen.getByRole('columnheader', { name: /Error rate/ });
    // A sortable column shows its tooltip on the sort button.
    fireEvent.mouseOver(within(header).getByTestId('tableHeaderSortButton'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Exceptions per session in the time range.'
    );
  });

  it('explains that users are installations, not signed-in people, in its column header', async () => {
    respondWith([mobileApp()]);
    renderPage();

    await screen.findByTestId('digitalExperienceMobileApplicationsTable');
    const header = screen.getByRole('columnheader', { name: /Users/ });
    fireEvent.mouseOver(within(header).getByTestId('tableHeaderSortButton'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Distinct app installations (app.installation.id) in the time range. A reinstall counts as a new one'
    );
  });

  it.each([
    [1 / 3, '0.33'],
    [2, '2.00'],
    [0, '0.00'],
  ])(
    'shows an error rate of %s with two decimals, as the web table, as %s',
    async (errorRate, shown) => {
      respondWith([{ ...mobileApp(), errorRate }]);
      renderPage();

      expect(await screen.findByTestId('digitalExperienceMobileErrorRate')).toHaveTextContent(
        new RegExp(`^${shown}$`)
      );
    }
  );

  it('shows no error rate without sessions', async () => {
    respondWith([{ ...mobileApp(), errorRate: null }]);
    renderPage();

    await screen.findByTestId('digitalExperienceMobileApplicationsTable');
    expect(screen.queryByTestId('digitalExperienceMobileErrorRate')).toBeNull();
  });

  it('shows the web tab first when there are both, with the count of each', async () => {
    respondWith([webApp(), mobileApp(), mobileApp('news-mobile')]);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceApplicationsTable')).toBeVisible();
    expect(screen.queryByTestId('digitalExperienceMobileApplicationsTable')).toBeNull();
    expect(screen.getByTestId('digitalExperienceApplicationTypeTab-web')).toHaveTextContent('Web1');
    const mobileTab = screen.getByTestId('digitalExperienceApplicationTypeTab-mobile');
    expect(mobileTab).toHaveTextContent('Mobile2');

    fireEvent.click(mobileTab);
    expect(setApplicationType).toHaveBeenCalledWith('mobile');
  });

  it('shows the mobile tab without the web summary, source filter or column selector', async () => {
    mockApplicationType('mobile');
    respondWith([webApp(), mobileApp()]);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileApplicationsTable')).toBeVisible();
    expect(screen.queryByTestId('digitalExperienceApplicationsTable')).toBeNull();
    expect(screen.queryByText('web-app')).toBeNull();
    expect(jest.mocked(SourceFilter)).not.toHaveBeenCalled();
  });

  it('narrows the rows to those that run on the selected platform', async () => {
    mockApplicationType('mobile');
    mockPlatformFilter('ios');
    respondWith([webApp(), mobileApp(), mobileApp('trailmap-android', ['android'])]);
    renderPage();

    await screen.findByTestId('digitalExperienceMobileApplicationsTable');
    expect(screen.getAllByTestId('digitalExperienceMobileApplicationLink')).toHaveLength(1);
    expect(screen.queryByText('trailmap-android')).toBeNull();
  });

  it('keeps the mobile applications alone, without an empty Web tab, back from a mobile application', async () => {
    // The way back from a mobile application keeps its type in the URL.
    mockApplicationType('mobile');
    respondWith([mobileApp()]);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileApplicationsTable')).toBeVisible();
    expect(screen.queryByTestId('digitalExperienceApplicationTypeTabs')).toBeNull();
    expect(screen.queryByTestId('digitalExperienceApplicationTypeTab-web')).toBeNull();
  });

  it('links to the mobile setup docs, not EDOT Browser, with a tab back, on the mobile tab without data', async () => {
    mockApplicationType('mobile');
    respondWith([webApp()]);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileApplicationsEmpty')).toBeVisible();
    expect(screen.getByTestId('digitalExperienceMobileAndroidDocsLink')).toBeVisible();
    expect(screen.queryByTestId('digitalExperienceApplicationsDocsLink')).toBeNull();
    expect(screen.getByTestId('digitalExperienceApplicationTypeTab-web')).toHaveTextContent('Web1');
    expect(
      screen.getByTestId('digitalExperienceApplicationTypeTab-mobile').getAttribute('aria-selected')
    ).toBe('true');
  });

  it('shows the type in the URL while the applications load, so going back never flashes the other', () => {
    mockApplicationType('mobile');
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByTestId('digitalExperienceMobileApplicationsTable')).toBeVisible();
    expect(screen.queryByTestId('digitalExperienceApplicationsTable')).toBeNull();
  });

  it('ignores the web source filter of a URL on the Mobile tab: the Web count and the mobile links', async () => {
    // E.g. a shared link, or the way back from an application, with both tabs' filters.
    mockApplicationType('mobile');
    mockSourceFilter('classic');
    respondWith([app({ serviceName: 'app-a', source: 'classic' }), webApp(), mobileApp()]);
    renderPage();

    await screen.findByTestId('digitalExperienceMobileApplicationsTable');
    expect(screen.getByTestId('digitalExperienceApplicationTypeTab-web')).toHaveTextContent('Web2');
    expect(screen.getByTestId('digitalExperienceMobileApplicationLink')).not.toHaveAttribute(
      'href',
      expect.stringContaining('sourceFilter')
    );
  });

  it('ignores the mobile platform filter of a URL on the Web tab: the Mobile count and the web links', async () => {
    mockApplicationType('web');
    mockPlatformFilter('ios');
    respondWith([webApp(), mobileApp(), mobileApp('trailmap-android', ['android'])]);
    renderPage();

    await screen.findByTestId('digitalExperienceApplicationsTable');
    expect(screen.getByTestId('digitalExperienceApplicationTypeTab-mobile')).toHaveTextContent(
      'Mobile2'
    );
    expect(screen.getByTestId('digitalExperienceApplicationLink')).not.toHaveAttribute(
      'href',
      expect.stringContaining('platformFilter')
    );
  });

  it('keeps the type in the URL when there are tabs', async () => {
    mockApplicationType('mobile');
    respondWith([webApp(), mobileApp()]);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceApplicationTypeTabs')).toBeVisible();
    expect(
      screen.getByTestId('digitalExperienceApplicationTypeTab-mobile').getAttribute('aria-selected')
    ).toBe('true');
    expect(screen.getByTestId('digitalExperienceMobileApplicationsTable')).toBeVisible();
  });

  it('shows the Mobile tab, on the web one, when no readable mobile data matched with partial access', async () => {
    respondWith([webApp()], [], [], null, [], 'partial');
    renderPage();

    expect(await screen.findByTestId('digitalExperienceApplicationsTable')).toBeVisible();
    expect(screen.getByTestId('digitalExperienceApplicationTypeTab-mobile')).toHaveTextContent(
      'Mobile0'
    );
  });

  it('keeps the tabs, and offers a retry, when only the mobile search failed', async () => {
    respondWith([webApp()], [], [], null, [], 'unavailable');
    const { unmount } = renderPage();
    expect(await screen.findByTestId('digitalExperienceApplicationTypeTabs')).toBeVisible();
    unmount();

    mockApplicationType('mobile');
    renderPage();
    expect(await screen.findByTestId('digitalExperienceMobileApplicationsError')).toBeVisible();
    expect(screen.getByTestId('digitalExperienceMobileApplicationsRetry')).toBeVisible();
    expect(screen.getByTestId('digitalExperienceUnavailableMobile')).toBeVisible();
    expect(screen.queryByTestId('digitalExperienceMobileApplicationsEmpty')).toBeNull();
  });

  it('keeps the Mobile tab reachable when the mobile search failed and there are no web rows', async () => {
    respondWith([], [], [], null, [], 'unavailable');
    renderPage();

    expect(await screen.findByTestId('digitalExperienceApplicationTypeTabs')).toBeVisible();
    expect(screen.getByTestId('digitalExperienceApplicationTypeTab-mobile')).toBeVisible();
  });

  it('warns that the mobile rows may be incomplete with partial access to the mobile indices', async () => {
    respondWith([mobileApp()], [], [], null, [], 'partial');
    mockApplicationType('mobile');
    renderPage();

    expect(await screen.findByTestId('digitalExperiencePartiallyAvailableMobile')).toBeVisible();
    expect(screen.queryByTestId('digitalExperienceMobileApplicationsUnreadableData')).toBeNull();
  });

  it('asks to check the access, not to instrument the apps, when no readable mobile data matched', async () => {
    respondWith([webApp()], [], [], null, [], 'partial');
    mockApplicationType('mobile');
    renderPage();

    expect(
      await screen.findByTestId('digitalExperienceMobileApplicationsUnreadableData')
    ).toHaveTextContent('No mobile applications in the indices you can read');
    expect(screen.queryByTestId('digitalExperienceMobileApplicationsEmpty')).toBeNull();
    expect(screen.queryByTestId('digitalExperiencePartiallyAvailableMobile')).toBeNull();
  });

  it('names both the environment and the access, and shows all environments, when no readable mobile data matched one', async () => {
    mockEnvironment('production');
    respondWith([], ['production'], [], null, [], 'partial');
    mockApplicationType('mobile');
    renderPage();

    expect(
      await screen.findByTestId('digitalExperienceMobileApplicationsUnreadableData')
    ).toHaveTextContent('Nothing matched the filters in the indices you can read');
    expect(screen.queryByTestId('digitalExperienceApplicationsEmptyInEnvironment')).toBeNull();

    fireEvent.click(screen.getByTestId('digitalExperienceShowAllEnvironments'));
    expect(setEnvironment).toHaveBeenCalledWith(undefined);
  });

  it('keeps the tabs on the web tab, and offers a retry, when every web search failed', async () => {
    respondWith([mobileApp()], [], ['otel', 'classic']);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceApplicationTypeTabs')).toBeVisible();
    expect(screen.getByTestId('digitalExperienceUnavailableSources')).toBeVisible();
    expect(screen.getByTestId('digitalExperienceWebApplicationsError')).toBeVisible();
    expect(screen.getByTestId('digitalExperienceWebApplicationsRetry')).toBeVisible();
    expect(screen.queryByTestId('digitalExperienceApplicationsEmpty')).toBeNull();
  });
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
      params: { query: { start: expect.any(String), end: expect.any(String), timeZone: 'UTC' } },
    });
  });

  it.each([
    ['an explicit time zone', 'America/New_York', 'America/New_York'],
    ['the browser time zone', 'Browser', moment.tz.guess()],
  ])('asks for buckets in %s', async (_, setting, expected) => {
    respondWith([]);
    renderPage({ timeZoneSetting: setting });

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('GET /internal/digital_experience/applications', {
        signal: expect.any(AbortSignal),
        params: {
          query: { start: expect.any(String), end: expect.any(String), timeZone: expected },
        },
      })
    );
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
          query: {
            start: expect.any(String),
            end: expect.any(String),
            environment: 'production',
            timeZone: 'UTC',
          },
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

  it('totals the sessions of the EDOT Browser applications in the summary', async () => {
    respondWith([
      app({ serviceName: 'shop', source: 'otel', sessions: 1200 }),
      app({ serviceName: 'docs', source: 'otel', sessions: 34 }),
      // Classic RUM has no sessions, and does not stop the others from adding up.
      app({ serviceName: 'legacy', source: 'classic' }),
    ]);
    renderPage();
    await screen.findAllByTestId('digitalExperienceApplicationLink');

    expect(screen.getByTestId('digitalExperienceSummary-sessions')).toHaveTextContent('1,234');
  });

  it('offers the sessions in the chart when the applications were read from the sessions index', async () => {
    respondWith(
      [app({ serviceName: 'shop', source: 'otel', sessions: 3 })],
      [],
      [],
      [{ timestamp: 0, count: 3 }]
    );
    renderPage();
    await screen.findAllByTestId('digitalExperienceApplicationLink');

    expect(screen.getByTestId('digitalExperienceChartMetric-sessions')).toBeEnabled();
  });

  it('disables the sessions in the chart when they were not counted', async () => {
    respondWith([app({ serviceName: 'shop', source: 'otel', sessions: null })]);
    renderPage();
    await screen.findAllByTestId('digitalExperienceApplicationLink');

    expect(screen.getByTestId('digitalExperienceChartMetric-sessions')).toBeDisabled();
  });

  it('disables the sessions in the chart for Classic RUM, which has none', async () => {
    mockSourceFilter('classic');
    respondWith(
      [app({ serviceName: 'legacy', source: 'classic' })],
      [],
      [],
      [{ timestamp: 0, count: 3 }]
    );
    renderPage();
    await screen.findAllByTestId('digitalExperienceApplicationLink');

    expect(screen.getByTestId('digitalExperienceChartMetric-sessions')).toBeDisabled();
  });

  it('shows no sessions total when the applications were read from the raw events', async () => {
    respondWith([app({ serviceName: 'shop', source: 'otel', sessions: null })]);
    renderPage();
    await screen.findAllByTestId('digitalExperienceApplicationLink');

    expect(screen.getByTestId('digitalExperienceSummary-sessions')).toHaveTextContent('—');
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

  it('warns when the user can read only some of the indices of a source', async () => {
    respondWith([app({ source: 'otel' })], [], [], null, ['classic']);
    renderPage();

    expect(
      await screen.findByTestId('digitalExperiencePartiallyAvailableSources')
    ).toHaveTextContent('Classic RUM');
    expect(screen.queryByTestId('digitalExperienceUnavailableSources')).not.toBeInTheDocument();
  });

  it('does not warn about partial access when every source is fully readable', async () => {
    respondWith([app({ source: 'otel' })]);
    renderPage();
    await screen.findByTestId('digitalExperienceApplicationLink');

    expect(
      screen.queryByTestId('digitalExperiencePartiallyAvailableSources')
    ).not.toBeInTheDocument();
  });

  it('shows the unavailable and the partially available warnings together', async () => {
    respondWith([app({ source: 'otel' })], [], ['classic'], null, ['otel']);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceUnavailableSources')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperiencePartiallyAvailableSources')).toBeInTheDocument();
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

  it('names the platform, not the source, when no mobile application matches', async () => {
    respondWith([mobileApp()]);
    renderPage();
    await screen.findByTestId('digitalExperienceMobileApplicationsTable');

    fireEvent.change(screen.getByTestId('digitalExperienceApplicationsSearch'), {
      target: { value: 'nothing' },
    });
    expect(
      screen.getByText('No mobile applications match the search or the platform.')
    ).toBeInTheDocument();
  });
});
