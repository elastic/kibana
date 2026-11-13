/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { BehaviorSubject } from 'rxjs';
import { EuiProvider } from '@elastic/eui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { RouterProvider } from '@kbn/typed-react-router-config';
import {
  emptyWebVitals,
  type SessionDetailResponse,
  type SessionRequest,
  type SessionTimelineEvent,
} from '../../../common/sessions';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useTimeRange } from '../../hooks/use_time_range';
import { useDigitalExperienceParams } from '../../hooks/use_digital_experience_params';
import { useDigitalExperienceRouter } from '../../hooks/use_digital_experience_router';
import { digitalExperienceRouter } from '../../routes';
import { createUiSettingsMock } from '../../test_utils/ui_settings_mock';
import { SessionDetailPage } from './session_detail_page';
import { clusterFeatures } from './utils/sessions_map';

jest.mock('../../breadcrumbs/use_route_breadcrumb');
jest.mock('../../hooks/use_kibana_services');
jest.mock('../../hooks/use_time_range');
jest.mock('../../hooks/use_digital_experience_router');
// jsdom lays nothing out: the sessions map gets a size to fit its view to.
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useResizeObserver: () => ({ width: 400, height: 800 }),
}));

const mockFetch = jest.fn();
const mockDetail = jest.fn();
const mockList = jest.fn();
const mockLocations = jest.fn();
const LOCATIONS_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/session_locations';
const DETAIL_ENDPOINT =
  'GET /internal/digital_experience/applications/{serviceName}/sessions/{sessionId}';
jest.mock('@kbn/server-route-repository-client', () => ({
  createRepositoryClient: jest.fn(() => ({ fetch: (...args: unknown[]) => mockFetch(...args) })),
}));

const START = '2026-10-20T10:00:00.000Z';
const at = (offsetMs: number) => new Date(Date.parse(START) + offsetMs).toISOString();
const TIME_QUERY = 'rangeFrom=now-15m&rangeTo=now';

const event = (
  kind: SessionTimelineEvent['kind'],
  offsetMs: number,
  name: string,
  detail: string | null = null,
  stacktrace: string | null = null
): SessionTimelineEvent => ({
  kind,
  name,
  timestamp: at(offsetMs),
  offsetMs,
  durationMs: null,
  page: null,
  detail,
  stacktrace,
  traceId: null,
  spanId: null,
});

const request = (
  url: string,
  offsetMs: number,
  visitIndex: number,
  overrides: Partial<SessionRequest> = {}
): SessionRequest => ({
  url,
  initiatorType: 'script',
  method: null,
  statusCode: null,
  failed: false,
  startTime: at(offsetMs),
  durationMs: 120,
  phases: { queued: 2, dns: 10, connect: 30, tls: 20, waiting: 60, download: 18 },
  timingWithheld: false,
  cached: false,
  transferSize: 2048,
  decodedBodySize: 8192,
  renderBlocking: false,
  protocol: 'h2',
  traceId: null,
  spanId: null,
  visitIndex,
  ...overrides,
});

const detail = (overrides: Partial<SessionDetailResponse> = {}): SessionDetailResponse => ({
  session: {
    sessionId: 'abcdef123456',
    serviceName: 'shop',
    startTime: START,
    endTime: at(60_000),
    durationMs: 60_000,
    eventCount: 12,
    pageViewCount: 2,
    pageLoadCount: 1,
    clickCount: 3,
    jsErrorCount: 1,
    httpRequestCount: 8,
    failedRequestCount: 2,
    bounced: false,
    entryPage: '/',
    exitPage: '/cart',
    journey: ['/', '/cart'],
    environment: 'production',
    user: 'jane@example.com',
    userAgent: { browser: 'Firefox', browserVersion: '131', os: 'Linux', device: null },
    geo: {
      countryIso: 'NL',
      region: 'North Holland',
      city: 'Amsterdam',
      location: { lat: 52.3676, lon: 4.9041 },
    },
    webVitals: { ...emptyWebVitals(), lcp: 1800, cls: 0.3 },
  },
  timeline: [
    event('page_view', 0, 'documentLoad', 'https://shop.example.com/'),
    event('click', 5_000, 'click', 'button#add'),
    event('span', 6_000, 'GET /api/cart'),
    event('page_view', 30_000, 'navigation', 'https://shop.example.com/cart'),
    event(
      'error',
      45_000,
      'TypeError',
      'cart is undefined',
      'TypeError: cart is undefined\n    at render (cart.js:12:3)'
    ),
    event('web_vital', 50_000, 'INP', '120'),
  ],
  timelineTruncated: false,
  pageVisits: [
    {
      page: '/',
      url: 'https://shop.example.com/',
      startTime: START,
      endTime: at(30_000),
      durationMs: 30_000,
      clickCount: 1,
      errorCount: 0,
      webVitals: { ...emptyWebVitals(), lcp: 1800 },
      load: {
        navigationStart: START,
        responseStartMs: 150,
        domContentLoadedMs: 700,
        loadMs: 1_200,
      },
    },
    {
      page: '/cart',
      url: 'https://shop.example.com/cart',
      startTime: at(30_000),
      endTime: at(60_000),
      durationMs: 30_000,
      clickCount: 0,
      errorCount: 1,
      webVitals: { ...emptyWebVitals(), cls: 0.3 },
      load: null,
    },
  ],
  requests: [
    request('https://shop.example.com/', 2, 0, { initiatorType: 'navigation', durationMs: 300 }),
    request('https://shop.example.com/app.js', 320, 0, { renderBlocking: true }),
    request('https://cdn.example.net/font.woff2', 400, 0, {
      initiatorType: 'css',
      phases: null,
      timingWithheld: true,
      transferSize: null,
      decodedBodySize: null,
    }),
    request('https://shop.example.com/api/cart', 5_010, 0, {
      initiatorType: 'fetch',
      method: 'POST',
      statusCode: 201,
      traceId: 'trace-1',
      spanId: 'span-1',
    }),
    request('https://shop.example.com/api/recommendations', 40_000, 1, {
      initiatorType: 'fetch',
      method: 'GET',
      statusCode: 503,
      failed: true,
    }),
  ],
  requestsTruncated: false,
  ...overrides,
});

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { response: { status } });

const mockAddSuccess = jest.fn();
const mockChrome = {
  getChromeStyle: jest.fn(() => 'classic'),
  sideNav: { getIsCollapsed: jest.fn(() => false), setIsCollapsed: jest.fn() },
};
const mockGetRedirectUrl = jest.fn(() => '/app/discover#/?esql');

/** Opens the header's Sessions list menu, which may sit in the menu's overflow. */
const openSessionsListMenu = async () => {
  if (!screen.queryByTestId('digitalExperienceSessionsListToggle')) {
    await openAppMenuOverflow();
  }
  fireEvent.click(screen.getByTestId('digitalExperienceSessionsListToggle'));
  await screen.findByTestId('digitalExperienceSessionsListPlacement-left');
};

/** The page as its route renders it, with the session from the URL. */
function SessionRoute() {
  const {
    path: { sessionId },
  } = useDigitalExperienceParams('/{serviceName}/sessions/{sessionId}');
  return <SessionDetailPage serviceName="shop" sessionId={sessionId} />;
}

const renderPage = ({ maps }: { maps?: unknown } = {}) => {
  jest.mocked(useKibanaServices).mockReturnValue({
    maps,
    notifications: { toasts: { addSuccess: mockAddSuccess } },
    chrome: mockChrome,
    share: {
      url: {
        locators: {
          get: (id: string) =>
            id === 'DISCOVER_APP_LOCATOR' ? { getRedirectUrl: mockGetRedirectUrl } : undefined,
        },
      },
    },
    application: {
      capabilities: { apm: { show: true }, discover_v2: { show: true } },
      getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
    },
    http: {},
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
  const history = createMemoryHistory({
    initialEntries: [
      `/shop/sessions/abcdef123456?${TIME_QUERY}&source=otel&withJsErrors=true&page=2`,
    ],
  });
  render(
    <RouterProvider
      history={history}
      router={digitalExperienceRouter as unknown as ComponentProps<typeof RouterProvider>['router']}
    >
      <SessionRoute />
    </RouterProvider>,
    {
      wrapper: ({ children }) => (
        <I18nProvider>
          <EuiProvider>
            <MockAppHeaderProvider>{children}</MockAppHeaderProvider>
          </EuiProvider>
        </I18nProvider>
      ),
    }
  );
  return history;
};

const SESSIONS_HREF = `/app/digital_experience/shop/sessions?page=2&${TIME_QUERY}&source=otel&withJsErrors=true`;

const listedSession = (sessionId: string, user: string | null, jsErrorCount = 0) => ({
  ...detail().session,
  sessionId,
  user,
  jsErrorCount,
});

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  // The session, and the sessions list beside it.
  mockFetch.mockImplementation((endpoint: string, options: unknown) =>
    endpoint === DETAIL_ENDPOINT
      ? mockDetail(endpoint, options)
      : endpoint === LOCATIONS_ENDPOINT
      ? mockLocations(endpoint, options)
      : mockList(endpoint, options)
  );
  mockList.mockResolvedValue({
    sessions: [
      listedSession('first111', 'sam@example.com', 2),
      listedSession('abcdef123456', 'jane@example.com', 1),
    ],
    total: 2,
    page: 0,
    perPage: 25,
  });
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: 'now-15m', rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);
});

describe('SessionDetailPage', () => {
  it('leads back to the sessions list it was opened from', async () => {
    mockDetail.mockResolvedValue(detail());
    renderPage();

    await screen.findByTestId('digitalExperienceSessionSummary');
    expect(useRouteBreadcrumb).toHaveBeenLastCalledWith([
      { text: 'shop', href: `/app/digital_experience/shop?${TIME_QUERY}&source=otel` },
      { text: 'Sessions', href: SESSIONS_HREF },
      { text: 'abcdef12' },
    ]);
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      SESSIONS_HREF
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'GET /internal/digital_experience/applications/{serviceName}/sessions/{sessionId}',
      {
        signal: expect.any(AbortSignal),
        params: { path: { serviceName: 'shop', sessionId: 'abcdef123456' } },
      }
    );
  });

  it('copies the session ID from the header', async () => {
    mockDetail.mockResolvedValue(detail());
    document.execCommand = jest.fn().mockReturnValue(true);
    renderPage();

    // The header swaps its items once the session loads, so copy from the loaded header.
    await screen.findByTestId('digitalExperienceSessionUser');
    fireEvent.click(screen.getByTestId('digitalExperienceSessionIdCopy'));
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(mockAddSuccess).toHaveBeenCalledWith('Session ID copied');
  });

  it('summarizes the session', async () => {
    mockDetail.mockResolvedValue(detail());
    renderPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Session');
    // Who and when are in the header once the session loads, its ID in the summary.
    expect(await screen.findByTestId('digitalExperienceSessionUser')).toHaveTextContent(
      'jane@example.com'
    );
    expect(screen.getByTestId('digitalExperienceSessionStarted')).toHaveTextContent('1 min 0 s');
    expect(screen.getByTestId('digitalExperienceSessionStat-duration')).toHaveTextContent(
      '1 min 0 s'
    );
    const stat = (id: string) => within(screen.getByTestId(`digitalExperienceSessionStat-${id}`));
    // Page views count in-app navigations too, page loads only full loads.
    expect(stat('pages').getByText('Page views')).toBeInTheDocument();
    expect(stat('pages').getByText('2')).toBeInTheDocument();
    expect(stat('pageLoads').getByText('Page loads')).toBeInTheDocument();
    expect(stat('pageLoads').getByText('1')).toBeInTheDocument();
    expect(stat('jsErrors').getByText('JS errors')).toBeInTheDocument();
    expect(stat('jsErrors').getByText('1')).toBeInTheDocument();
    expect(stat('failedRequests').getByText('Failed requests of 8')).toBeInTheDocument();
    expect(stat('failedRequests').getByText('2')).toBeInTheDocument();
    const metadata = screen.getByTestId('digitalExperienceSessionMetadata');
    expect(metadata).toHaveTextContent('Session IDabcdef123456');
    expect(metadata).toHaveTextContent('Firefox 131 · Linux');
    expect(metadata).toHaveTextContent('Amsterdam, North Holland, NL');
    expect(metadata).toHaveTextContent('/ → /cart');
    const vitals = screen.getByTestId('digitalExperienceSessionVitals');
    expect(within(vitals).getByTestId('digitalExperienceWebVital-lcp')).toHaveTextContent(
      'LCP 1.80 s'
    );
    expect(within(vitals).getByTestId('digitalExperienceWebVital-cls')).toHaveTextContent(
      'CLS 0.300'
    );
  });

  it('shows the outcome of the session in the header, and opens its raw events in Discover', async () => {
    mockDetail.mockResolvedValue(detail());
    renderPage();

    expect(await screen.findByTestId('digitalExperienceSessionBadge-jsErrors')).toHaveTextContent(
      '1 JS error'
    );
    expect(screen.getByTestId('digitalExperienceSessionBadge-failedRequests')).toHaveTextContent(
      '2 failed requests'
    );
    expect(screen.getByTestId('digitalExperienceSessionBadge-environment')).toHaveTextContent(
      'production'
    );
    expect(screen.queryByTestId('digitalExperienceSessionBadge-bounced')).not.toBeInTheDocument();

    expect(mockGetRedirectUrl).toHaveBeenLastCalledWith({
      query: {
        esql: [
          'FROM traces-*.otel-*, logs-*.otel-*',
          '| WHERE session.id == "abcdef123456" AND service.name == "shop"',
          '| SORT @timestamp ASC',
        ].join('\n'),
      },
      timeRange: { from: '2026-10-20T09:59:00.000Z', to: '2026-10-20T10:06:00.000Z' },
    });
    await openAppMenuOverflow();
    expect(screen.getByTestId('digitalExperienceSessionOpenInDiscover')).toHaveAttribute(
      'href',
      '/app/discover#/?esql'
    );
  });

  it('draws a waterfall segment per page visit with error markers', async () => {
    mockDetail.mockResolvedValue(detail());
    renderPage();

    const waterfall = await screen.findByTestId('digitalExperienceSessionWaterfall');
    const segments = within(waterfall).getAllByTestId('digitalExperienceSessionWaterfallSegment');
    // Positioned through their tooltip anchors, so the tooltips point at them.
    expect(
      segments.map(({ parentElement }) => [parentElement?.style.left, parentElement?.style.width])
    ).toEqual([
      ['0%', '50%'],
      ['50%', '50%'],
    ]);
    expect(segments[1]).toHaveAccessibleName('/cart: 30 s, 0 clicks, 1 error');
    const marker = within(waterfall).getByTestId('digitalExperienceSessionWaterfallError');
    // Focusable, with the error in its name, as its tooltip shows it.
    expect(marker).toHaveAttribute('tabindex', '0');
    expect(marker).toHaveAccessibleName('0:45 TypeError: cart is undefined');
    // At the error's offset, shifted back by the same share of its width so it stays in the bar.
    expect(marker.parentElement).toHaveStyle({ left: '75%', transform: 'translateX(-75%)' });
  });

  it('lists what happened on each page, without spans and logs', async () => {
    mockDetail.mockResolvedValue(detail());
    const scrollIntoView = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    renderPage();

    const visits = await screen.findAllByTestId('digitalExperiencePageVisit');
    expect(visits).toHaveLength(2);
    expect(visits[0]).toHaveTextContent('/');
    expect(within(visits[0]).getByTestId('digitalExperienceVisitLoad')).toHaveTextContent(
      'Loaded in 1.20 s'
    );
    expect(within(visits[0]).getByTestId('digitalExperienceVisitRequests')).toHaveTextContent(
      '4 requests · 6 KB'
    );
    expect(visits[1]).toHaveTextContent('In-app navigation');
    expect(visits[1]).toHaveTextContent('1 failed');
    // Page views and clicks read by kind, not by their raw event names.
    const click = within(visits[0]).getByTestId('digitalExperienceSessionEvent-click');
    expect(click).toHaveTextContent('Click');
    expect(click).toHaveTextContent('button#add');
    expect(
      within(visits[0]).getByTestId('digitalExperienceSessionEvent-page_view')
    ).toHaveTextContent('Page view');
    expect(visits[0]).not.toHaveTextContent('documentLoad');
    expect(visits[0]).not.toHaveTextContent('GET /api/cart');
    const error = within(visits[1]).getByTestId('digitalExperienceSessionEvent-error');
    // From the start of the page, precise to a hundredth of a second below 10s.
    expect(error).toHaveTextContent('15.0 s');
    expect(error).toHaveTextContent('TypeError');
    expect(error).toHaveTextContent('cart is undefined');
    expect(visits[1]).toHaveTextContent('1 error');
    expect(within(visits[1]).getByTestId('digitalExperienceWebVital-cls')).toBeInTheDocument();
    // A web vital event is a rated badge, like the visit's own vitals.
    expect(
      within(within(visits[1]).getByTestId('digitalExperienceSessionEvent-web_vital')).getByTestId(
        'digitalExperienceWebVital-inp'
      )
    ).toHaveAttribute('data-rating', 'good');
    // No scroll box of its own: the page scrolls as a whole.
    expect(within(visits[1]).getByRole('region', { name: 'Events on /cart' })).not.toHaveAttribute(
      'tabindex'
    );

    // The sessions list scrolls its current session into view too.
    scrollIntoView.mockClear();
    fireEvent.click(screen.getAllByTestId('digitalExperienceSessionWaterfallSegment')[1]);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('draws the requests of each page as a waterfall, with the click that fired one before it', async () => {
    mockDetail.mockResolvedValue(detail());
    renderPage();

    const [home, cart] = await screen.findAllByTestId('digitalExperiencePageVisit');
    const rows = within(home).getAllByTestId(/^digitalExperience(ActivityRequest|SessionEvent-)/);
    expect(rows.map((row) => row.getAttribute('data-test-subj'))).toEqual([
      'digitalExperienceSessionEvent-page_view',
      'digitalExperienceActivityRequest',
      'digitalExperienceActivityRequest',
      'digitalExperienceActivityRequest',
      'digitalExperienceSessionEvent-click',
      'digitalExperienceActivityRequest',
    ]);
    // Paths on the page's own origin, the host for other origins.
    expect(rows[2]).toHaveTextContent('JS/app.js');
    expect(rows[2]).toHaveTextContent('blocking');
    expect(rows[3]).toHaveTextContent('cdn.example.net/font.woff2');
    expect(rows[5]).toHaveTextContent('POST /api/cart');
    expect(within(home).getByTestId('digitalExperienceMilestone-load')).toHaveTextContent(
      'Load 1.20 s'
    );
    expect(within(cart).getByTestId('digitalExperienceActivityRequest')).toHaveTextContent(
      '503 · 120 ms'
    );

    fireEvent.click(within(rows[5]).getByRole('button'));
    const details = within(home).getByTestId('digitalExperienceRequestDetails');
    expect(details).toHaveTextContent('Waiting for the server 60 ms');
    expect(within(details).getByTestId('digitalExperienceRequestTraceLink')).toHaveAttribute(
      'href',
      '/app/apm/link-to/trace/trace-1'
    );

    fireEvent.click(within(rows[3]).getByRole('button'));
    expect(within(home).getByTestId('digitalExperienceRequestDetails')).toHaveTextContent(
      'Timing-Allow-Origin'
    );
  });

  it('shows the stack trace of an error on demand', async () => {
    mockDetail.mockResolvedValue(detail());
    renderPage();

    const error = await screen.findByTestId('digitalExperienceSessionEvent-error');
    fireEvent.click(within(error).getByRole('button'));
    expect(within(error).getByTestId('digitalExperienceErrorStacktrace')).toHaveTextContent(
      'at render (cart.js:12:3)'
    );
  });

  it('filters the journey by kind and by text', async () => {
    mockDetail.mockResolvedValue(detail());
    renderPage();

    await screen.findAllByTestId('digitalExperiencePageVisit');
    expect(screen.getByTestId('digitalExperienceActivityFilter-request')).toHaveTextContent('5');
    fireEvent.click(screen.getByTestId('digitalExperienceActivityFilter-request'));
    expect(screen.queryAllByTestId('digitalExperienceActivityRequest')).toHaveLength(0);
    expect(screen.getByTestId('digitalExperienceSessionEvent-click')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('digitalExperienceActivityFilter-request'));
    fireEvent.change(screen.getByTestId('digitalExperienceActivitySearch'), {
      target: { value: 'api/cart' },
    });
    expect(screen.getAllByTestId('digitalExperienceActivityRequest')).toHaveLength(1);
    expect(screen.queryByTestId('digitalExperienceSessionEvent-click')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('digitalExperienceActivityEmpty')).toHaveLength(1);
  });

  it('shows the first rows of a busy page, and all of them on demand', async () => {
    const polls = Array.from({ length: 20 }, (_, index) =>
      request(`https://shop.example.com/img/${index}.png`, 31_000 + index * 100, 1, {
        initiatorType: 'img',
      })
    );
    mockDetail.mockResolvedValue(detail({ requests: polls }));
    renderPage();

    const [, cart] = await screen.findAllByTestId('digitalExperiencePageVisit');
    expect(within(cart).getAllByTestId('digitalExperienceActivityRequest')).toHaveLength(14);
    const showAll = within(cart).getByTestId('digitalExperienceActivityShowAll');
    expect(showAll).toHaveTextContent('Show all 23 rows (8 more)');

    fireEvent.click(showAll);
    expect(within(cart).getAllByTestId('digitalExperienceActivityRequest')).toHaveLength(20);
    expect(showAll).toHaveTextContent('Show the first 15 rows');
  });

  it('lists the sessions beside it, with the same list query, the current one marked', async () => {
    mockDetail.mockResolvedValue(detail());
    renderPage();

    const rail = await screen.findByTestId('digitalExperienceSessionsRail');
    const current = await within(rail).findByTestId(
      'digitalExperienceSessionsRailItem-abcdef123456'
    );
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toHaveTextContent('jane@example.com');
    // Links keep the list's query, so the next session's Back leads to the same list.
    expect(within(rail).getByTestId('digitalExperienceSessionsRailItem-first111')).toHaveAttribute(
      'href',
      `/app/digital_experience/shop/sessions/first111?page=2&${TIME_QUERY}&source=otel&withJsErrors=true`
    );
    expect(mockList).toHaveBeenCalledWith(
      'GET /internal/digital_experience/applications/{serviceName}/sessions',
      expect.objectContaining({
        params: expect.objectContaining({
          query: expect.objectContaining({ withJsErrors: 'true', page: 2 }),
        }),
      })
    );
    expect(within(rail).getByTestId('digitalExperienceSessionsRailEditFilters')).toHaveAttribute(
      'href',
      SESSIONS_HREF
    );
  });

  it('titles a session in the list by its user, else by the pages it went through', async () => {
    mockList.mockResolvedValue({
      sessions: [
        listedSession('abcdef123456', 'jane@example.com', 1),
        { ...listedSession('feed0000beef', null), journey: ['/', '/cart', '/checkout', '/pay'] },
      ],
      total: 2,
      page: 0,
      perPage: 25,
    });
    mockDetail.mockResolvedValue(detail());
    renderPage();

    const known = await screen.findByTestId('digitalExperienceSessionsRailItem-abcdef123456');
    expect(within(known).getByTestId('digitalExperienceSessionsRailItemTitle')).toHaveTextContent(
      'jane@example.com'
    );
    expect(within(known).getByTestId('digitalExperienceSessionsRailItemId')).toHaveTextContent(
      'abcdef12'
    );

    const anonymous = screen.getByTestId('digitalExperienceSessionsRailItem-feed0000beef');
    expect(
      within(anonymous).getByTestId('digitalExperienceSessionsRailItemTitle')
    ).toHaveTextContent('/ → /cart → /checkout +1');
    expect(anonymous).toHaveTextContent('Anonymous');
    expect(within(anonymous).getByTestId('digitalExperienceSessionsRailItemId')).toHaveTextContent(
      'feed0000'
    );
  });

  it('searches the sessions list as the user types, once they pause', async () => {
    mockDetail.mockResolvedValue(detail());
    renderPage();
    await screen.findByTestId('digitalExperienceSessionsRailItem-abcdef123456');
    expect(mockList).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByTestId('digitalExperienceSessionsRailSearch'), {
      target: { value: 'jane' },
    });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(mockList).toHaveBeenLastCalledWith(
      'GET /internal/digital_experience/applications/{serviceName}/sessions',
      expect.objectContaining({
        params: expect.objectContaining({
          // A new search starts on the first page.
          query: expect.objectContaining({ query: 'jane', page: 0 }),
        }),
      })
    );
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('hides the sessions list, and shows it again from the header', async () => {
    mockDetail.mockResolvedValue(detail());
    renderPage();

    fireEvent.click(await screen.findByTestId('digitalExperienceSessionsRailHide'));
    expect(screen.queryByTestId('digitalExperienceSessionsRail')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('digitalExperience.sessionDetail.rail')).toBe('"hidden"');

    await openSessionsListMenu();
    fireEvent.click(screen.getByTestId('digitalExperienceSessionsListPlacement-left'));
    expect(await screen.findByTestId('digitalExperienceSessionsRail')).toBeInTheDocument();
  });

  it('shows the sessions list on the right when asked, and remembers it', async () => {
    mockDetail.mockResolvedValue(detail());
    renderPage();

    await screen.findByTestId('digitalExperienceSessionsRail');
    expect(screen.getByTestId('digitalExperienceSessionSplitView')).toHaveAttribute(
      'data-rail-side',
      'left'
    );

    await openSessionsListMenu();
    fireEvent.click(screen.getByTestId('digitalExperienceSessionsListPlacement-right'));

    expect(screen.getByTestId('digitalExperienceSessionSplitView')).toHaveAttribute(
      'data-rail-side',
      'right'
    );
    // After the session, in the layout.
    expect(
      screen
        .getByTestId('digitalExperienceSessionPage')
        .compareDocumentPosition(await screen.findByTestId('digitalExperienceSessionsRail'))
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(window.localStorage.getItem('digitalExperience.sessionDetail.rail')).toBe('"right"');
  });

  it('shows the list on the left for a choice stored before it could move', async () => {
    window.localStorage.setItem('digitalExperience.sessionDetail.rail', '"open"');
    mockDetail.mockResolvedValue(detail());
    renderPage();

    await screen.findByTestId('digitalExperienceSessionsRail');
    expect(screen.getByTestId('digitalExperienceSessionSplitView')).toHaveAttribute(
      'data-rail-side',
      'left'
    );
  });

  it('collapses the project side navigation while the list shows, and restores it', async () => {
    mockChrome.getChromeStyle.mockReturnValue('project');
    mockDetail.mockResolvedValue(detail());
    renderPage();

    await screen.findByTestId('digitalExperienceSessionsRail');
    expect(mockChrome.sideNav.setIsCollapsed).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByTestId('digitalExperienceSessionsRailHide'));
    expect(mockChrome.sideNav.setIsCollapsed).toHaveBeenLastCalledWith(false);
    mockChrome.getChromeStyle.mockReturnValue('classic');
  });

  it('moves to another session without loading the list again, keeping the previous one until it loads', async () => {
    let resolveNext: (value: SessionDetailResponse) => void = () => {};
    mockDetail
      .mockResolvedValueOnce(detail())
      .mockReturnValueOnce(new Promise((resolve) => (resolveNext = resolve)));
    const history = renderPage();
    await screen.findByTestId('digitalExperienceSessionsRailItem-abcdef123456');

    act(() => {
      history.push(`/shop/sessions/first111?${TIME_QUERY}&source=otel&withJsErrors=true&page=2`);
    });

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockDetail).toHaveBeenCalledTimes(2);
    // The previous session stays, with a progress bar, instead of a blank loading page.
    expect(screen.getByTestId('digitalExperienceSessionSummary')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceSessionLoadingNext')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceSessionLoading')).not.toBeInTheDocument();

    await act(async () => {
      resolveNext(
        detail({ session: { ...detail().session, sessionId: 'first111', user: 'sam@example.com' } })
      );
    });
    expect(await screen.findByTestId('digitalExperienceSessionUser')).toHaveTextContent(
      'sam@example.com'
    );
    expect(screen.queryByTestId('digitalExperienceSessionLoadingNext')).not.toBeInTheDocument();
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('says when the requests are cut short', async () => {
    mockDetail.mockResolvedValue(detail({ requestsTruncated: true }));
    renderPage();

    expect(
      await screen.findByTestId('digitalExperienceSessionRequestsTruncated')
    ).toBeInTheDocument();
  });

  it('says when the timeline is cut short', async () => {
    mockDetail.mockResolvedValue(detail({ timelineTruncated: true }));
    renderPage();

    expect(
      await screen.findByTestId('digitalExperienceSessionTimelineTruncated')
    ).toBeInTheDocument();
  });

  it('explains a session without page views', async () => {
    mockDetail.mockResolvedValue(detail({ pageVisits: [], timeline: [] }));
    renderPage();

    expect(await screen.findByTestId('digitalExperienceSessionNoPageVisits')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceSessionWaterfall')).not.toBeInTheDocument();
  });

  it('leads back to the list when the session does not exist', async () => {
    mockDetail.mockRejectedValue(httpError(404, 'Session [abcdef123456] not found'));
    renderPage();

    expect(await screen.findByTestId('digitalExperienceSessionNotFoundBack')).toHaveAttribute(
      'href',
      SESSIONS_HREF
    );
  });

  it('retries a failed load', async () => {
    mockDetail.mockRejectedValueOnce(httpError(500, 'Could not load the sessions.'));
    renderPage();

    expect(await screen.findByTestId('digitalExperienceSessionError')).toHaveTextContent(
      'Could not load the sessions.'
    );
    mockDetail.mockResolvedValue(detail());
    fireEvent.click(screen.getByTestId('digitalExperienceSessionRetry'));

    expect(await screen.findByTestId('digitalExperienceSessionSummary')).toBeInTheDocument();
  });

  describe('sessions map', () => {
    const AMSTERDAM_TILE = { west: 0, south: 48.9225, east: 11.25, north: 55.7765 };
    const cluster = {
      key: '5/16/10',
      location: { lat: 52.3676, lon: 4.9041 },
      count: 12,
      bounds: AMSTERDAM_TILE,
      city: 'Amsterdam',
      countryIso: 'NL',
      cityCount: 1,
    };
    let mapProps: Record<string, unknown> = {};
    const mapCenter$ = new BehaviorSubject<{
      mapCenter?: { lat: number; lon: number; zoom: number };
    }>({});
    const maps = {
      Map: (props: Record<string, unknown>) => {
        mapProps = props;
        return <div data-test-subj="mockMap" />;
      },
      createLayerDescriptors: {
        createBasemapLayerDescriptor: jest.fn(async () => ({
          id: 'basemap',
          type: 'EMS_VECTOR_TILE',
        })),
      },
    };
    const layerIdsOf = (props: Record<string, unknown>) =>
      (props.layerList as Array<{ id: string }>).map(({ id }) => id);

    const showMap = async (history = renderPage({ maps })) => {
      fireEvent.click(await screen.findByTestId('digitalExperienceSessionsRailView-map'));
      await screen.findByTestId('mockMap');
      return history;
    };

    beforeEach(() => {
      mapProps = {};
      mapCenter$.next({});
      mockDetail.mockResolvedValue(detail());
      // A new response for each load, as the API gives.
      mockLocations.mockImplementation(async () => ({
        clusters: [cluster],
        total: 14,
        located: 12,
        bounds: { west: 4.9, south: 52.37, east: 4.9, north: 52.37 },
        center: { lat: 52.37, lon: 4.9 },
      }));
    });

    it('only shows the list without the Maps plugin', async () => {
      renderPage();
      await screen.findByTestId('digitalExperienceSessionsRailItem-abcdef123456');
      expect(screen.queryByTestId('digitalExperienceSessionsRailView')).not.toBeInTheDocument();
    });

    it("clusters the list's sessions on a map, fit to them, with the open session ringed", async () => {
      await showMap();

      expect(mockLocations).toHaveBeenCalledWith(LOCATIONS_ENDPOINT, {
        signal: expect.any(AbortSignal),
        params: {
          path: { serviceName: 'shop' },
          // The list's filters, without its sort and page.
          query: {
            start: expect.any(String),
            end: expect.any(String),
            withJsErrors: 'true',
            zoom: 0,
          },
        },
      });
      expect(layerIdsOf(mapProps)).toEqual([
        'basemap',
        expect.stringMatching(/^digitalExperienceSessionClusters_/),
        'digitalExperienceSelectedSession',
      ]);
      expect(mapProps.mapCenter).toEqual({
        lat: expect.closeTo(52.37, 2),
        lon: expect.closeTo(4.9, 2),
        zoom: 9,
      });
      expect(screen.getByTestId('digitalExperienceSessionsMapCounts')).toHaveTextContent(
        '12 of 14 sessions have a location'
      );
      // The map loads its own clusters, not the list.
      expect(screen.queryByTestId('digitalExperienceSessionsRailTotal')).not.toBeInTheDocument();
    });

    it('lists the latest sessions of a clicked cluster, and shows all of them in the list', async () => {
      const history = await showMap();
      const renderTooltip = (
        mapProps.getTooltipRenderer as () => (params: unknown) => JSX.Element
      )();
      const closeTooltip = jest.fn();
      const tooltip = render(
        <I18nProvider>
          <EuiProvider>
            {renderTooltip({
              features: [
                // The bubble carries its cluster; what the page loaded since doesn't matter.
                {
                  layerId: (mapProps.layerList as Array<{ id: string }>)[1].id,
                  mbProperties: clusterFeatures([cluster]).features[0].properties,
                  actions: [],
                },
              ],
              isLocked: true,
              closeTooltip,
            })}
          </EuiProvider>
        </I18nProvider>
      );

      expect(tooltip.getByTestId('digitalExperienceSessionsMapClusterTitle')).toHaveTextContent(
        'Amsterdam, NL'
      );
      expect(
        await tooltip.findByTestId('digitalExperienceSessionsMapSession-first111')
      ).toHaveAttribute(
        'href',
        `/app/digital_experience/shop/sessions/first111?page=2&${TIME_QUERY}&source=otel&withJsErrors=true`
      );
      expect(mockList).toHaveBeenLastCalledWith(
        'GET /internal/digital_experience/applications/{serviceName}/sessions',
        expect.objectContaining({
          params: expect.objectContaining({
            query: expect.objectContaining({
              withJsErrors: 'true',
              bounds: '0,48.9225,11.25,55.7765',
              perPage: 5,
            }),
          }),
        })
      );

      fireEvent.click(tooltip.getByTestId('digitalExperienceSessionsMapClusterShowAll'));
      expect(closeTooltip).toHaveBeenCalled();
      expect(new URLSearchParams(history.location.search).get('bounds')).toBe(
        '0,48.9225,11.25,55.7765'
      );
      expect(new URLSearchParams(history.location.search).get('page')).toBeNull();
      expect(await screen.findByTestId('digitalExperienceSessionsRailMapArea')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('digitalExperienceSessionsRailClearMapArea'));
      expect(new URLSearchParams(history.location.search).get('bounds')).toBeNull();
    });

    it('narrows the list to the map view as the map moves, once asked to', async () => {
      jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
      try {
        const history = await showMap();
        act(() => {
          (mapProps.onApiAvailable as (api: unknown) => void)({ latestState$: mapCenter$ });
          mapCenter$.next({ mapCenter: { lat: 52.37, lon: 4.9, zoom: 4 } });
        });
        act(() => {
          jest.advanceTimersByTime(500);
        });
        // Moving the map alone doesn't filter the list.
        expect(new URLSearchParams(history.location.search).get('bounds')).toBeNull();
        await waitFor(() =>
          expect(mockLocations).toHaveBeenLastCalledWith(
            LOCATIONS_ENDPOINT,
            expect.objectContaining({
              params: expect.objectContaining({
                query: expect.objectContaining({ zoom: 4, viewport: expect.any(String) }),
              }),
            })
          )
        );

        fireEvent.click(screen.getByTestId('digitalExperienceSessionsMapSearchAsMoved'));
        act(() => {
          jest.advanceTimersByTime(500);
        });
        const bounds = new URLSearchParams(history.location.search).get('bounds');
        expect(bounds).toMatch(/^-?[0-9.]+,-?[0-9.]+,-?[0-9.]+,-?[0-9.]+$/);

        act(() => {
          mapCenter$.next({ mapCenter: { lat: 48.85, lon: 2.35, zoom: 4 } });
        });
        act(() => {
          jest.advanceTimersByTime(500);
        });
        expect(new URLSearchParams(history.location.search).get('bounds')).not.toBe(bounds);

        fireEvent.click(screen.getByTestId('digitalExperienceSessionsMapSearchAsMoved'));
        expect(new URLSearchParams(history.location.search).get('bounds')).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    it('draws the clusters anew only when they change, instead of reloading what the map shows', async () => {
      jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
      try {
        await showMap();
        const clustersLayerIdOf = () => (mapProps.layerList as Array<{ id: string }>)[1].id;
        const firstLayerId = clustersLayerIdOf();
        const loadCount = () => mockLocations.mock.calls.length;
        const loadsAfterFirstView = loadCount();
        const move = (mapCenter: { lat: number; lon: number; zoom: number }) => {
          act(() => {
            mapCenter$.next({ mapCenter });
          });
          act(() => {
            jest.advanceTimersByTime(500);
          });
        };
        act(() => {
          (mapProps.onApiAvailable as (api: unknown) => void)({ latestState$: mapCenter$ });
        });

        // The map settles with a hair of jitter, which is the same view: nothing to load again.
        move({ lat: 52.37, lon: 4.9, zoom: 4 });
        await waitFor(() => expect(loadCount()).toBe(loadsAfterFirstView + 1));
        const loadsAfterMove = loadCount();
        move({ lat: 52.3700001, lon: 4.9000001, zoom: 4 });
        move({ lat: 52.37, lon: 4.9, zoom: 4 });
        expect(loadCount()).toBe(loadsAfterMove);
        // Unchanged clusters keep their layer, so the Maps plugin doesn't redraw them.
        expect(clustersLayerIdOf()).toBe(firstLayerId);

        // Clusters that did change get a layer of their own, which the Maps plugin draws anew.
        mockLocations.mockImplementation(async () => ({
          clusters: [{ ...cluster, key: '5/16/11', count: 3 }],
          total: 14,
          located: 12,
          bounds: { west: 4.9, south: 52.37, east: 4.9, north: 52.37 },
          center: { lat: 52.37, lon: 4.9 },
        }));
        move({ lat: 40.71, lon: -74.01, zoom: 4 });
        await waitFor(() => expect(clustersLayerIdOf()).not.toBe(firstLayerId));
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
