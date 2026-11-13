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
import type { MemoryHistory } from 'history';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { RouterProvider } from '@kbn/typed-react-router-config';
import {
  emptyWebVitals,
  type SessionListResponse,
  type SessionsStatus,
  type SessionSummary,
} from '../../../common/sessions';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useTimeRange } from '../../hooks/use_time_range';
import { useDigitalExperienceRouter } from '../../hooks/use_digital_experience_router';
import { digitalExperienceRouter } from '../../routes';
import { createUiSettingsMock } from '../../test_utils/ui_settings_mock';
import { SessionsTab } from './sessions_tab';

jest.mock('../../hooks/use_kibana_services');
jest.mock('../../hooks/use_time_range');
jest.mock('../../hooks/use_digital_experience_router');
jest.mock('../../components/time_range_picker', () => ({ TimeRangePicker: () => null }));

const mockFetch = jest.fn();
jest.mock('@kbn/server-route-repository-client', () => ({
  createRepositoryClient: jest.fn(() => ({ fetch: (...args: unknown[]) => mockFetch(...args) })),
}));

const STATUS_ENDPOINT = 'GET /internal/digital_experience/sessions/status';
const ENABLE_ENDPOINT = 'POST /internal/digital_experience/sessions/enable';
const LIST_ENDPOINT = 'GET /internal/digital_experience/applications/{serviceName}/sessions';

const status = (overrides: Partial<SessionsStatus> = {}): SessionsStatus => ({
  installed: true,
  health: 'healthy',
  installedVersion: 1,
  currentVersion: 1,
  rebuilding: false,
  apiKeyInvalid: false,
  reason: null,
  lagSeconds: 30,
  summarizedUntil: '2026-10-20T10:05:00.000Z',
  lastRunAt: '2026-10-20T10:06:00.000Z',
  lastSuccessAt: '2026-10-20T10:06:00.000Z',
  lastError: null,
  enabledBy: 'elastic',
  retentionDays: 30,
  ...overrides,
});

const notSetUp = (): SessionsStatus =>
  status({
    installed: false,
    health: 'missing',
    installedVersion: null,
    lagSeconds: null,
    summarizedUntil: null,
    lastRunAt: null,
    lastSuccessAt: null,
    enabledBy: null,
  });

const session = (overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  sessionId: 'session-1',
  serviceName: 'shop',
  startTime: '2026-10-20T10:00:00.000Z',
  endTime: '2026-10-20T10:03:20.000Z',
  durationMs: 200_000,
  eventCount: 40,
  pageViewCount: 3,
  pageLoadCount: 1,
  clickCount: 7,
  jsErrorCount: 2,
  httpRequestCount: 12,
  failedRequestCount: 1,
  bounced: false,
  entryPage: '/',
  exitPage: '/cart',
  journey: ['/', '/products', '/cart'],
  environment: 'production',
  user: 'jane@example.com',
  userAgent: { browser: 'Chrome', browserVersion: '130', os: 'macOS', device: null },
  geo: { countryIso: 'NL', region: null, city: 'Amsterdam' },
  webVitals: emptyWebVitals(),
  ...overrides,
});

const listResponse = (overrides: Partial<SessionListResponse> = {}): SessionListResponse => ({
  sessions: [session()],
  total: 1,
  page: 0,
  perPage: 25,
  retentionDays: 30,
  facets: {
    browsers: [{ key: 'Chrome', count: 8 }],
    os: [{ key: 'macOS', count: 5 }],
    countries: [{ key: 'NL', count: 3 }],
    entryPages: [{ key: '/', count: 9 }],
  },
  kpis: {
    totalSessions: 10,
    medianDurationMs: 90_000,
    avgPageViews: 2.5,
    bounceRate: 0.2,
    sessionsWithJsErrors: 4,
    sessionsWithFailedRequests: 2,
    webVitals: emptyWebVitals(),
  },
  ...overrides,
});

const respondWith = ({
  sessionsStatus = status(),
  list = listResponse(),
}: { sessionsStatus?: SessionsStatus; list?: SessionListResponse | Error } = {}) =>
  mockFetch.mockImplementation(async (endpoint: string) => {
    if (endpoint === STATUS_ENDPOINT) {
      return sessionsStatus;
    }
    if (endpoint === ENABLE_ENDPOINT) {
      return status();
    }
    if (list instanceof Error) {
      throw list;
    }
    return list;
  });

/** As Kibana's HTTP client fails: the status text as the message, the route's in the body. */
const forbidden = (message: string) =>
  Object.assign(new Error('Forbidden'), { body: { statusCode: 403, message } });

const fetchesOf = (endpoint: string) =>
  mockFetch.mock.calls.filter(([calledEndpoint]) => calledEndpoint === endpoint);

const listRequests = () => fetchesOf(LIST_ENDPOINT).map(([, options]) => options);

const TIME_QUERY = 'rangeFrom=now-15m&rangeTo=now';

const renderTab = ({
  search = '',
  manageSessions = true,
}: { search?: string; manageSessions?: boolean } = {}): MemoryHistory => {
  jest.mocked(useKibanaServices).mockReturnValue({
    application: {
      capabilities: { digital_experience: { show: true, manageSessions } },
      getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
    },
    http: {},
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
  const history = createMemoryHistory({
    initialEntries: [`/shop/sessions?${TIME_QUERY}&source=otel${search}`],
  });
  render(
    <RouterProvider
      history={history}
      router={digitalExperienceRouter as unknown as ComponentProps<typeof RouterProvider>['router']}
    >
      <SessionsTab serviceName="shop" source="otel" />
    </RouterProvider>,
    {
      wrapper: ({ children }) => (
        <I18nProvider>
          <EuiProvider>{children}</EuiProvider>
        </I18nProvider>
      ),
    }
  );
  return history;
};

const searchParams = (history: MemoryHistory) =>
  Object.fromEntries(new URLSearchParams(history.location.search));

const mockTimeRange = (rangeFrom: string) =>
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom, rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });

const STATUS_CALLOUTS = [
  'digitalExperienceSessionsApiKeyInvalid',
  'digitalExperienceSessionsDegraded',
  'digitalExperienceSessionsLagging',
  'digitalExperienceSessionsEnableError',
];

beforeEach(() => {
  jest.clearAllMocks();
  // The hidden columns are kept in local storage.
  window.localStorage.clear();
  mockTimeRange('now-15m');
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);
});

describe('SessionsTab', () => {
  describe('when sessions are not set up', () => {
    it('lets a user who can set sessions up do so, then lists the sessions', async () => {
      respondWith({ sessionsStatus: notSetUp() });
      renderTab();

      expect(await screen.findByTestId('digitalExperienceSessionsNotEnabled')).toHaveTextContent(
        'A background task builds them from your EDOT Browser data every minute'
      );
      fireEvent.click(screen.getByTestId('digitalExperienceSessionsEnable'));

      expect(
        await screen.findByTestId('digitalExperienceSessionRow-session-1')
      ).toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledWith(ENABLE_ENDPOINT, {});
      expect(screen.queryByTestId('digitalExperienceSessionsNotEnabled')).not.toBeInTheDocument();
    });

    it('shows why setting them up failed', async () => {
      mockFetch.mockImplementation(async (endpoint: string) => {
        if (endpoint === ENABLE_ENDPOINT) {
          throw forbidden('Missing privileges: index:traces-*:read');
        }
        return notSetUp();
      });
      renderTab();

      fireEvent.click(await screen.findByTestId('digitalExperienceSessionsEnable'));

      expect(await screen.findByTestId('digitalExperienceSessionsEnableError')).toHaveTextContent(
        'Missing privileges: index:traces-*:read'
      );
    });

    it('tells other users to ask an administrator, without a button', async () => {
      respondWith({ sessionsStatus: notSetUp() });
      renderTab({ manageSessions: false });

      expect(await screen.findByTestId('digitalExperienceSessionsNotEnabled')).toHaveTextContent(
        'Ask an administrator with the Set up session summaries privilege'
      );
      expect(screen.queryByTestId('digitalExperienceSessionsEnable')).not.toBeInTheDocument();
      expect(listRequests()).toHaveLength(0);
    });
  });

  describe('when the API key of sessions no longer works', () => {
    it('shows the warning with a button instead of granting a new key by itself', async () => {
      respondWith({ sessionsStatus: status({ apiKeyInvalid: true }) });
      renderTab();

      expect(
        await screen.findByTestId('digitalExperienceSessionsApiKeyInvalid')
      ).toBeInTheDocument();
      expect(screen.getByTestId('digitalExperienceSessionsUpdate')).toHaveTextContent(
        'Set up sessions again'
      );
      // The task reads what the user who set sessions up can read, so nobody changes that by
      // visiting the tab.
      expect(fetchesOf(ENABLE_ENDPOINT)).toHaveLength(0);
      expect(
        await screen.findByTestId('digitalExperienceSessionRow-session-1')
      ).toBeInTheDocument();
    });

    it('grants a new key when a manager sets sessions up again, and shows a failure', async () => {
      respondWith({ sessionsStatus: status({ apiKeyInvalid: true }) });
      const respond = mockFetch.getMockImplementation();
      let enableFails = true;
      mockFetch.mockImplementation(async (endpoint: string, ...rest: unknown[]) => {
        if (endpoint === ENABLE_ENDPOINT && enableFails) {
          throw forbidden('Missing privileges: cluster:read_security');
        }
        return respond?.(endpoint, ...rest);
      });
      renderTab();

      fireEvent.click(await screen.findByTestId('digitalExperienceSessionsUpdate'));

      expect(await screen.findByTestId('digitalExperienceSessionsEnableError')).toHaveTextContent(
        'Missing privileges: cluster:read_security'
      );
      expect(screen.getByTestId('digitalExperienceSessionsApiKeyInvalid')).toHaveTextContent(
        'The API key sessions are built with was invalidated or has expired'
      );

      enableFails = false;
      fireEvent.click(screen.getByTestId('digitalExperienceSessionsUpdate'));

      await waitFor(() =>
        expect(
          screen.queryByTestId('digitalExperienceSessionsApiKeyInvalid')
        ).not.toBeInTheDocument()
      );
      expect(fetchesOf(ENABLE_ENDPOINT)).toHaveLength(2);
      expect(screen.queryByTestId('digitalExperienceSessionsEnableError')).not.toBeInTheDocument();
    });

    it('tells other users who to ask, and never grants a key for them', async () => {
      respondWith({ sessionsStatus: status({ apiKeyInvalid: true }) });
      renderTab({ manageSessions: false });

      expect(await screen.findByTestId('digitalExperienceSessionsApiKeyInvalid')).toHaveTextContent(
        'Ask an administrator with the Set up session summaries privilege'
      );
      expect(screen.queryByTestId('digitalExperienceSessionsUpdate')).not.toBeInTheDocument();
      expect(
        await screen.findByTestId('digitalExperienceSessionRow-session-1')
      ).toBeInTheDocument();
      expect(fetchesOf(ENABLE_ENDPOINT)).toHaveLength(0);
    });

    it('warns about the key rather than the failing runs it causes', async () => {
      respondWith({
        sessionsStatus: status({
          apiKeyInvalid: true,
          health: 'degraded',
          reason: 'The API key was invalidated',
        }),
      });
      renderTab({ manageSessions: false });

      expect(
        await screen.findByTestId('digitalExperienceSessionsApiKeyInvalid')
      ).toBeInTheDocument();
      expect(
        await screen.findByTestId('digitalExperienceSessionRow-session-1')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('digitalExperienceSessionsDegraded')).not.toBeInTheDocument();
    });
  });

  it('shows a failing run of the summaries task with its reason', async () => {
    respondWith({
      sessionsStatus: status({
        health: 'degraded',
        reason: 'Summarizing sessions failed: search_phase_execution_exception',
        lastError: {
          message: 'search_phase_execution_exception',
          at: '2026-10-20T10:06:00.000Z',
        },
      }),
    });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsDegraded')).toHaveTextContent(
      'Summarizing sessions failed: search_phase_execution_exception'
    );
    expect(await screen.findByTestId('digitalExperienceSessionRow-session-1')).toBeInTheDocument();
  });

  it('points to the server logs for a failing run without a reason', async () => {
    respondWith({ sessionsStatus: status({ health: 'degraded', reason: null }) });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsDegraded')).toHaveTextContent(
      'Check the Kibana server logs'
    );
    expect(await screen.findByTestId('digitalExperienceSessionRow-session-1')).toBeInTheDocument();
  });

  it('warns when sessions are behind, with how far, above the list', async () => {
    respondWith({ sessionsStatus: status({ health: 'lagging', lagSeconds: 600 }) });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsLagging')).toHaveTextContent(
      'Sessions from the last 10 minutes may be missing or incomplete.'
    );
    expect(await screen.findByTestId('digitalExperienceSessionRow-session-1')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceSessionsDegraded')).not.toBeInTheDocument();
  });

  it('says up to when events are in healthy sessions, with nothing to flag', async () => {
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    respondWith();
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsFreshness')).toHaveTextContent(
      'Includes events up to Oct 20, 2026 @ 10:05:00.000'
    );
    await screen.findByTestId('digitalExperienceSessionRow-session-1');
    for (const callout of [...STATUS_CALLOUTS, 'digitalExperienceSessionsRetention']) {
      expect(screen.queryByTestId(callout)).not.toBeInTheDocument();
    }
    // Nothing is rebuilding, so the status isn't checked again.
    expect(setIntervalSpy.mock.calls.some(([, delay]) => delay === 30_000)).toBe(false);
    expect(fetchesOf(STATUS_ENDPOINT)).toHaveLength(1);
    setIntervalSpy.mockRestore();
  });

  it('does not say how fresh sessions are before the task has summarized any', async () => {
    respondWith({ sessionsStatus: status({ summarizedUntil: null, lagSeconds: null }) });
    renderTab();

    await screen.findByTestId('digitalExperienceSessionRow-session-1');
    expect(screen.queryByTestId('digitalExperienceSessionsFreshness')).not.toBeInTheDocument();
  });

  it('checks the status again while sessions rebuild, without hiding the list', async () => {
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    respondWith({ sessionsStatus: status({ rebuilding: true }) });
    renderTab();
    expect(await screen.findByTestId('digitalExperienceSessionRow-session-1')).toBeInTheDocument();
    // Older sessions are still missing while they rebuild.
    expect(screen.queryByTestId('digitalExperienceSessionsFreshness')).not.toBeInTheDocument();
    const [poll] = setIntervalSpy.mock.calls.find(([, delay]) => delay === 30_000) ?? [];
    expect(poll).toBeDefined();

    respondWith({ sessionsStatus: status({ rebuilding: false }) });
    await act(async () => (poll as () => void)());

    await waitFor(() => expect(fetchesOf(STATUS_ENDPOINT)).toHaveLength(2));
    expect(screen.getByTestId('digitalExperienceSessionRow-session-1')).toBeInTheDocument();
    expect(await screen.findByTestId('digitalExperienceSessionsFreshness')).toBeInTheDocument();
    setIntervalSpy.mockRestore();
  });

  it('lists the sessions again once a rebuild finishes', async () => {
    const setIntervalSpy = jest.spyOn(window, 'setInterval');
    respondWith({ sessionsStatus: status({ rebuilding: true }) });
    renderTab();
    expect(await screen.findByTestId('digitalExperienceSessionRow-session-1')).toBeInTheDocument();
    const fetchedBefore = listRequests().length;
    const [poll] = setIntervalSpy.mock.calls.find(([, delay]) => delay === 30_000) ?? [];
    expect(poll).toBeDefined();

    respondWith({ sessionsStatus: status() });
    await act(async () => (poll as () => void)());

    await waitFor(() => expect(listRequests()).toHaveLength(fetchedBefore + 1));
    setIntervalSpy.mockRestore();
  });

  it('retries a failed status check', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Gateway timeout'));
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsStatusError')).toHaveTextContent(
      'Gateway timeout'
    );
    respondWith();
    fireEvent.click(screen.getByTestId('digitalExperienceSessionsStatusRetry'));

    expect(await screen.findByTestId('digitalExperienceSessionRow-session-1')).toBeInTheDocument();
  });

  it('lists the sessions with their KPIs, linking each to its details with the list state', async () => {
    respondWith({ list: listResponse({ total: 60 }) });
    renderTab({ search: '&browser=Chrome&page=1' });

    const row = await screen.findByTestId('digitalExperienceSessionRow-session-1');
    expect(within(row).getByTestId('digitalExperienceSessionLink')).toHaveAttribute(
      'href',
      `/app/digital_experience/shop/sessions/session-1?browser=Chrome&page=1&${TIME_QUERY}&source=otel`
    );
    expect(row).toHaveTextContent('jane@example.com');
    expect(row).toHaveTextContent('Chrome 130 · macOS');
    expect(row).toHaveTextContent('3 min 20 s');
    expect(within(row).getByTestId('digitalExperienceSessionJsErrors')).toHaveTextContent('2');
    expect(within(row).getByTestId('digitalExperienceSessionJourney')).toHaveTextContent(
      '/+1/cart'
    );

    expect(screen.getByTestId('digitalExperienceSessionsKpi-total')).toHaveTextContent('10');
    expect(screen.getByTestId('digitalExperienceSessionsKpi-withJsErrors')).toHaveTextContent(
      '40% of sessions'
    );
    expect(screen.getByTestId('digitalExperienceSessionsKpi-withFailedRequests')).toHaveTextContent(
      '20% of sessions'
    );
    expect(screen.getByTestId('digitalExperienceSessionsKpi-medianDuration')).toHaveTextContent(
      '1 min 30 s'
    );
    expect(screen.getByTestId('digitalExperienceSessionsKpi-avgPageViews')).toHaveTextContent(
      'Page views per session'
    );
    expect(screen.getByTestId('digitalExperienceSessionsKpi-bounceRate')).toHaveTextContent('20%');
  });

  it('shows counts without problems as plain numbers', async () => {
    respondWith({
      list: listResponse({ sessions: [session({ jsErrorCount: 0, failedRequestCount: 0 })] }),
    });
    renderTab();

    const row = await screen.findByTestId('digitalExperienceSessionRow-session-1');
    expect(within(row).queryByTestId('digitalExperienceSessionJsErrors')).not.toBeInTheDocument();
  });

  it('requests the search, filters, sort and page from the URL', async () => {
    respondWith();
    renderTab({
      search:
        '&search=jane&os=macOS&withJsErrors=true&withFailedRequests=true&duration=1mTo5m&sortField=js_error_count&sortDirection=asc&page=2&perPage=50',
    });

    await screen.findByTestId('digitalExperienceSessionRow-session-1');
    expect(listRequests()[0]).toEqual({
      signal: expect.any(AbortSignal),
      params: {
        path: { serviceName: 'shop' },
        query: {
          start: expect.any(String),
          end: expect.any(String),
          query: 'jane',
          os: 'macOS',
          withJsErrors: 'true',
          withFailedRequests: 'true',
          minDurationMs: 60_000,
          maxDurationMs: 300_000,
          sortField: 'js_error_count',
          sortDirection: 'asc',
          page: 2,
          perPage: 50,
        },
      },
    });
  });

  it('lists the sessions of the environment picked for the application', async () => {
    respondWith();
    const history = renderTab({ search: '&environment=staging' });

    await screen.findByTestId('digitalExperienceSessionRow-session-1');
    expect(listRequests()[0].params.query).toEqual(
      expect.objectContaining({ environment: 'staging' })
    );

    act(() => {
      history.push(`/shop/sessions?${TIME_QUERY}&source=otel&environment=production`);
    });

    await waitFor(() =>
      expect(listRequests()[listRequests().length - 1].params.query).toEqual(
        expect.objectContaining({ environment: 'production' })
      )
    );
  });

  it('keeps the filters in the URL and goes back to the first page when they change', async () => {
    respondWith();
    const history = renderTab({ search: '&page=3' });

    fireEvent.click(await screen.findByTestId('digitalExperienceSessionsJsErrorsFilter'));
    expect(searchParams(history)).toEqual(
      expect.objectContaining({ withJsErrors: 'true', source: 'otel', rangeFrom: 'now-15m' })
    );
    expect(searchParams(history).page).toBeUndefined();
    expect(screen.getByTestId('digitalExperienceSessionsJsErrorsFilter')).toHaveTextContent(
      'JS errors4'
    );

    fireEvent.click(screen.getByTestId('digitalExperienceSessionsFailedRequestsFilter'));
    expect(searchParams(history)).toEqual(
      expect.objectContaining({ withJsErrors: 'true', withFailedRequests: 'true' })
    );
    expect(screen.getByTestId('digitalExperienceSessionsFailedRequestsFilter')).toHaveTextContent(
      'Failed requests2'
    );

    // A second click turns a filter off, leaving the other one.
    fireEvent.click(screen.getByTestId('digitalExperienceSessionsJsErrorsFilter'));
    expect(searchParams(history).withJsErrors).toBeUndefined();
    expect(searchParams(history).withFailedRequests).toBe('true');

    fireEvent.click(screen.getByTestId('digitalExperienceSessionsFacet-browser'));
    fireEvent.click(await screen.findByText('Chrome (8)'));
    expect(searchParams(history)).toEqual(
      expect.objectContaining({ withFailedRequests: 'true', browser: 'Chrome' })
    );

    fireEvent.click(screen.getByTestId('digitalExperienceSessionsClearFilters'));
    expect(searchParams(history)).toEqual({ rangeFrom: 'now-15m', rangeTo: 'now', source: 'otel' });
  });

  it('searches once typing pauses', async () => {
    respondWith();
    const history = renderTab();

    // An input event, as typing sends; a change event (on blur) searches at once.
    fireEvent.input(await screen.findByTestId('digitalExperienceSessionsSearch'), {
      target: { value: ' jane ' },
    });
    expect(searchParams(history).search).toBeUndefined();

    await waitFor(() => expect(searchParams(history).search).toBe('jane'));
  });

  it('sorts and pages through the URL', async () => {
    respondWith({ list: listResponse({ total: 60 }) });
    const history = renderTab();

    await screen.findByTestId('digitalExperienceSessionRow-session-1');
    const table = screen.getByTestId('digitalExperienceSessionsTable');
    fireEvent.click(within(table).getByRole('button', { name: /^Duration/ }));
    expect(searchParams(history)).toEqual(
      expect.objectContaining({ sortField: 'duration_ms', sortDirection: 'asc' })
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('pagination-button-1'));
    });
    expect(searchParams(history)).toEqual(
      expect.objectContaining({ sortField: 'duration_ms', page: '1' })
    );

    // The first page is the default, so it leaves the URL.
    await act(async () => {
      fireEvent.click(screen.getByTestId('pagination-button-0'));
    });
    expect(searchParams(history).page).toBeUndefined();

    await act(async () => {
      fireEvent.click(within(table).getByRole('button', { name: /^JS errors/ }));
    });
    expect(searchParams(history)).toEqual(expect.objectContaining({ sortField: 'js_error_count' }));
  });

  it('shows the summary columns by default, and the others on request', async () => {
    respondWith({
      list: listResponse({
        sessions: [session({ webVitals: { ...emptyWebVitals(), lcp: 4800 }, bounced: true })],
      }),
    });
    renderTab();

    const table = await screen.findByTestId('digitalExperienceSessionsTable');
    const headers = () =>
      within(table)
        .getAllByRole('columnheader')
        .map(({ textContent }) => textContent);
    expect(headers()).toEqual([
      'Start time',
      'User',
      'Journey',
      'Duration',
      'Page views',
      'Clicks',
      'JS errors',
    ]);
    expect(screen.getByTestId('digitalExperienceColumnSelector')).toHaveTextContent('5/18');

    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelector'));
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelectorOption-failedRequests'));
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelectorOption-environment'));
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelectorOption-location'));
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelectorOption-lcp'));
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelectorOption-clicks'));

    expect(headers()).toEqual([
      'Start time',
      'User',
      'Journey',
      'Duration',
      'Page views',
      'JS errors',
      'Failed requests',
      'Environment',
      'Location',
      'LCP',
    ]);
    const row = screen.getByTestId('digitalExperienceSessionRow-session-1');
    expect(within(row).getByTestId('digitalExperienceSessionFailedRequests')).toHaveTextContent(
      '1'
    );
    expect(row).toHaveTextContent('production');
    expect(row).toHaveTextContent('Amsterdam, NL');
    expect(within(row).getByTestId('digitalExperienceWebVital-lcp')).toHaveAttribute(
      'data-rating',
      'poor'
    );
    expect(
      JSON.parse(
        window.localStorage.getItem('xpack.digitalExperience.sessions.hiddenColumns') ?? '[]'
      )
    ).not.toContain('location');
  });

  it('goes back to the first page when the time range changes', async () => {
    respondWith({ list: listResponse({ total: 60 }) });
    const history = renderTab({ search: '&page=2' });
    await screen.findByTestId('digitalExperienceSessionRow-session-1');

    mockTimeRange('now-24h');
    act(() => {
      history.push(`/shop/sessions?rangeFrom=now-24h&rangeTo=now&source=otel&page=2`);
    });

    await waitFor(() => expect(searchParams(history).page).toBeUndefined());
    expect(searchParams(history).rangeFrom).toBe('now-24h');
  });

  it('goes back to the first page when the environment changes', async () => {
    respondWith({ list: listResponse({ total: 60 }) });
    const history = renderTab({ search: '&page=2' });
    await screen.findByTestId('digitalExperienceSessionRow-session-1');

    act(() => {
      history.push(`/shop/sessions?${TIME_QUERY}&source=otel&environment=staging&page=2`);
    });

    await waitFor(() => expect(searchParams(history).page).toBeUndefined());
    expect(searchParams(history).environment).toBe('staging');
  });

  it('keeps the page that Back restores with an earlier time range', async () => {
    respondWith({ list: listResponse({ total: 60 }) });
    const history = renderTab({ search: '&page=2' });
    await screen.findByTestId('digitalExperienceSessionRow-session-1');

    // A new range resets the page, then Back returns to the old range on page 2.
    mockTimeRange('now-24h');
    act(() => {
      history.push(`/shop/sessions?rangeFrom=now-24h&rangeTo=now&source=otel&page=2`);
    });
    await waitFor(() => expect(searchParams(history).page).toBeUndefined());

    mockTimeRange('now-15m');
    act(() => {
      history.goBack();
    });

    await waitFor(() => expect(searchParams(history).rangeFrom).toBe('now-15m'));
    expect(searchParams(history).page).toBe('2');
  });

  it('says sessions are not kept that far back when the range starts before then', async () => {
    mockTimeRange('now-10d');
    // The list's retention wins over the status's.
    respondWith({
      sessionsStatus: status({ retentionDays: 30 }),
      list: listResponse({ retentionDays: 7 }),
    });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsRetention')).toHaveTextContent(
      'Sessions are kept for 7 days, so there are none before then in this time range.'
    );
  });

  it('says sessions are not kept that far back even when the list fails', async () => {
    mockTimeRange('now-60d');
    respondWith({ list: new Error('Gateway timeout') });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsError')).toBeInTheDocument();
    // The status's retention, as the list didn't answer.
    expect(screen.getByTestId('digitalExperienceSessionsRetention')).toHaveTextContent(
      'Sessions are kept for 30 days'
    );
  });

  it('shows the exit page of a visit that returns to an earlier page', async () => {
    respondWith({
      list: listResponse({
        sessions: [session({ journey: ['/', '/products'], entryPage: '/', exitPage: '/' })],
      }),
    });
    renderTab();

    const journey = await screen.findByTestId('digitalExperienceSessionJourney');
    expect(journey).toHaveTextContent('/+1/');
    expect(journey).not.toHaveTextContent('/products');
    expect(journey).toHaveAccessibleName(
      'Pages, in order of first visit: / → /products. Exit page: /.'
    );
  });

  it('explains how sessions get there when the range has none', async () => {
    respondWith({ list: listResponse({ sessions: [], total: 0 }) });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsEmpty')).toHaveTextContent(
      'session.id'
    );
  });

  it('says sessions are being built instead of showing none', async () => {
    respondWith({
      sessionsStatus: status({ rebuilding: true }),
      list: listResponse({ sessions: [], total: 0 }),
    });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsRebuilding')).toHaveTextContent(
      'Sessions are being built from up to 30 days of data'
    );
    expect(screen.queryByTestId('digitalExperienceSessionsEmpty')).not.toBeInTheDocument();
  });

  it('offers to clear the filters when none match', async () => {
    respondWith({ list: listResponse({ sessions: [], total: 0 }) });
    const history = renderTab({ search: '&os=Linux&withFailedRequests=true' });

    fireEvent.click(await screen.findByTestId('digitalExperienceSessionsNoMatchesClear'));

    expect(searchParams(history).os).toBeUndefined();
    expect(searchParams(history).withFailedRequests).toBeUndefined();
  });

  it('shows a failed list with a retry', async () => {
    respondWith({ list: new Error('Reading sessions requires the read index privilege') });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsError')).toHaveTextContent(
      'Reading sessions requires the read index privilege'
    );
    respondWith();
    fireEvent.click(screen.getByTestId('digitalExperienceSessionsRetry'));

    expect(await screen.findByTestId('digitalExperienceSessionRow-session-1')).toBeInTheDocument();
  });
});
