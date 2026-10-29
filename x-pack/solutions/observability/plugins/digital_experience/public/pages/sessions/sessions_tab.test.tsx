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
  state: 'started',
  installedVersion: 1,
  currentVersion: 1,
  needsUpdate: false,
  reason: null,
  lagSeconds: 30,
  configured: { frequency: '1m', partitions: 1 },
  installedPartitions: 1,
  enabledBy: null,
  enabledAt: null,
  authorization: null,
  transforms: [],
  ...overrides,
});

const session = (overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  sessionId: 'session-1',
  serviceName: 'shop',
  startTime: '2026-10-20T10:00:00.000Z',
  endTime: '2026-10-20T10:03:20.000Z',
  durationMs: 200_000,
  eventCount: 40,
  pageViewCount: 3,
  clickCount: 7,
  errorCount: 2,
  bounced: false,
  entryPage: '/',
  exitPage: '/cart',
  journey: ['/', '/products', '/cart'],
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
  failedSummaries: 0,
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
    sessionsWithErrors: 4,
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

const listRequests = () =>
  mockFetch.mock.calls
    .filter(([endpoint]) => endpoint === LIST_ENDPOINT)
    .map(([, options]) => options);

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

beforeEach(() => {
  jest.clearAllMocks();
  // The hidden columns are kept in local storage.
  window.localStorage.clear();
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: 'now-15m', rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);
});

describe('SessionsTab', () => {
  describe('when sessions are not set up', () => {
    it('lets a user with the Manage sessions privilege set them up, then lists the sessions', async () => {
      respondWith({ sessionsStatus: status({ installed: false, health: 'missing' }) });
      renderTab();

      fireEvent.click(await screen.findByTestId('digitalExperienceSessionsEnable'));

      expect(
        await screen.findByTestId('digitalExperienceSessionRow-session-1')
      ).toBeInTheDocument();
      expect(mockFetch).toHaveBeenCalledWith(ENABLE_ENDPOINT, {});
      expect(screen.queryByTestId('digitalExperienceSessionsNotEnabled')).not.toBeInTheDocument();
    });

    it('shows why setting them up failed', async () => {
      respondWith({ sessionsStatus: status({ installed: false, health: 'missing' }) });
      mockFetch.mockImplementation(async (endpoint: string) => {
        if (endpoint === ENABLE_ENDPOINT) {
          throw new Error('Missing the manage_transform cluster privilege');
        }
        return status({ installed: false, health: 'missing' });
      });
      renderTab();

      fireEvent.click(await screen.findByTestId('digitalExperienceSessionsEnable'));

      expect(await screen.findByTestId('digitalExperienceSessionsEnableError')).toHaveTextContent(
        'Missing the manage_transform cluster privilege'
      );
    });

    it('tells other users to ask an administrator, without a button', async () => {
      respondWith({ sessionsStatus: status({ installed: false, health: 'missing' }) });
      renderTab({ manageSessions: false });

      expect(await screen.findByTestId('digitalExperienceSessionsNotEnabled')).toHaveTextContent(
        'Ask an administrator with the Manage sessions privilege'
      );
      expect(screen.queryByTestId('digitalExperienceSessionsEnable')).not.toBeInTheDocument();
      expect(listRequests()).toHaveLength(0);
    });
  });

  it('flags sessions that need an update above the list', async () => {
    respondWith({ sessionsStatus: status({ needsUpdate: true, health: 'outdated' }) });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsNeedUpdate')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceSessionsUpdate')).toBeInTheDocument();
    expect(await screen.findByTestId('digitalExperienceSessionRow-session-1')).toBeInTheDocument();
  });

  it('shows a failing transform with its reason', async () => {
    respondWith({
      sessionsStatus: status({ health: 'degraded', reason: 'Transform failed: out of memory' }),
    });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsDegraded')).toHaveTextContent(
      'Transform failed: out of memory'
    );
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
    expect(within(row).getByTestId('digitalExperienceSessionErrors')).toHaveTextContent('2');
    expect(within(row).getByTestId('digitalExperienceSessionJourney')).toHaveTextContent(
      '/+1/cart'
    );

    expect(screen.getByTestId('digitalExperienceSessionsKpi-total')).toHaveTextContent('10');
    expect(screen.getByTestId('digitalExperienceSessionsKpi-withErrors')).toHaveTextContent(
      '40% of sessions'
    );
    expect(screen.getByTestId('digitalExperienceSessionsKpi-medianDuration')).toHaveTextContent(
      '1 min 30 s'
    );
    expect(screen.getByTestId('digitalExperienceSessionsKpi-bounceRate')).toHaveTextContent('20%');
  });

  it('requests the search, filters, sort and page from the URL', async () => {
    respondWith();
    renderTab({
      search:
        '&search=jane&os=macOS&hasErrors=true&duration=1mTo5m&sortField=error_count&sortDirection=asc&page=2&perPage=50',
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
          hasErrors: 'true',
          minDurationMs: 60_000,
          maxDurationMs: 300_000,
          sortField: 'error_count',
          sortDirection: 'asc',
          page: 2,
          perPage: 50,
        },
      },
    });
  });

  it('keeps the filters in the URL and goes back to the first page when they change', async () => {
    respondWith();
    const history = renderTab({ search: '&page=3' });

    fireEvent.click(await screen.findByTestId('digitalExperienceSessionsErrorsFilter'));
    expect(searchParams(history)).toEqual(
      expect.objectContaining({ hasErrors: 'true', source: 'otel', rangeFrom: 'now-15m' })
    );
    expect(searchParams(history).page).toBeUndefined();
    expect(screen.getByTestId('digitalExperienceSessionsErrorsFilter')).toHaveTextContent('4');

    fireEvent.click(screen.getByTestId('digitalExperienceSessionsFacet-browser'));
    fireEvent.click(await screen.findByText('Chrome (8)'));
    expect(searchParams(history)).toEqual(
      expect.objectContaining({ hasErrors: 'true', browser: 'Chrome' })
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
      'Pages',
      'Clicks',
      'Errors',
    ]);
    expect(screen.getByTestId('digitalExperienceColumnSelector')).toHaveTextContent('5/16');

    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelector'));
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelectorOption-location'));
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelectorOption-lcp'));
    fireEvent.click(screen.getByTestId('digitalExperienceColumnSelectorOption-clicks'));

    expect(headers()).toEqual([
      'Start time',
      'User',
      'Journey',
      'Duration',
      'Pages',
      'Errors',
      'Location',
      'LCP',
    ]);
    const row = screen.getByTestId('digitalExperienceSessionRow-session-1');
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

  it('explains how sessions get there when the range has none', async () => {
    respondWith({ list: listResponse({ sessions: [], total: 0 }) });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsEmpty')).toHaveTextContent(
      'session.id'
    );
  });

  it('offers to clear the filters when none match', async () => {
    respondWith({ list: listResponse({ sessions: [], total: 0 }) });
    const history = renderTab({ search: '&os=Linux' });

    fireEvent.click(await screen.findByTestId('digitalExperienceSessionsNoMatchesClear'));

    expect(searchParams(history).os).toBeUndefined();
  });

  it('flags sessions that could not be summarized', async () => {
    respondWith({ list: listResponse({ failedSummaries: 3 }) });
    renderTab();

    expect(await screen.findByTestId('digitalExperienceSessionsFailedSummaries')).toHaveTextContent(
      '3 sessions in this time range could not be summarized'
    );
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
