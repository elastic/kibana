/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { RouterProvider } from '@kbn/typed-react-router-config';
import {
  emptyWebVitals,
  type SessionDetailResponse,
  type SessionTimelineEvent,
} from '../../../common/sessions';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useTimeRange } from '../../hooks/use_time_range';
import { useDigitalExperienceRouter } from '../../hooks/use_digital_experience_router';
import { digitalExperienceRouter } from '../../routes';
import { createUiSettingsMock } from '../../test_utils/ui_settings_mock';
import { SessionDetailPage } from './session_detail_page';

jest.mock('../../breadcrumbs/use_route_breadcrumb');
jest.mock('../../hooks/use_kibana_services');
jest.mock('../../hooks/use_time_range');
jest.mock('../../hooks/use_digital_experience_router');

const mockFetch = jest.fn();
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
  detail: string | null = null
): SessionTimelineEvent => ({
  kind,
  name,
  timestamp: at(offsetMs),
  offsetMs,
  durationMs: null,
  page: null,
  detail,
  traceId: null,
  spanId: null,
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
    clickCount: 3,
    errorCount: 1,
    bounced: false,
    entryPage: '/',
    exitPage: '/cart',
    journey: ['/', '/cart'],
    user: 'jane@example.com',
    userAgent: { browser: 'Firefox', browserVersion: '131', os: 'Linux', device: null },
    geo: { countryIso: 'NL', region: 'North Holland', city: 'Amsterdam' },
    webVitals: { ...emptyWebVitals(), lcp: 1800, cls: 0.3 },
  },
  timeline: [
    event('page_view', 0, 'documentLoad', 'https://shop.example.com/'),
    event('click', 5_000, 'click', 'button#add'),
    event('span', 6_000, 'GET /api/cart'),
    event('page_view', 30_000, 'navigation', 'https://shop.example.com/cart'),
    event('error', 45_000, 'TypeError', 'cart is undefined'),
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
    },
  ],
  ...overrides,
});

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { response: { status } });

const renderPage = () => {
  jest.mocked(useKibanaServices).mockReturnValue({
    application: {
      getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
    },
    http: {},
    uiSettings: createUiSettingsMock(),
  } as unknown as ReturnType<typeof useKibanaServices>);
  const history = createMemoryHistory({
    initialEntries: [`/shop/sessions/abcdef123456?${TIME_QUERY}&source=otel&hasErrors=true&page=2`],
  });
  render(
    <RouterProvider
      history={history}
      router={digitalExperienceRouter as unknown as ComponentProps<typeof RouterProvider>['router']}
    >
      <SessionDetailPage serviceName="shop" sessionId="abcdef123456" />
    </RouterProvider>,
    {
      wrapper: ({ children }) => (
        <I18nProvider>
          <EuiProvider>{children}</EuiProvider>
        </I18nProvider>
      ),
    }
  );
};

const SESSIONS_HREF = `/app/digital_experience/shop/sessions?hasErrors=true&page=2&${TIME_QUERY}&source=otel`;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: 'now-15m', rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });
  jest.mocked(useDigitalExperienceRouter).mockReturnValue(digitalExperienceRouter);
});

describe('SessionDetailPage', () => {
  it('leads back to the sessions list it was opened from', async () => {
    mockFetch.mockResolvedValue(detail());
    renderPage();

    await screen.findByTestId('digitalExperienceSessionSummary');
    expect(useRouteBreadcrumb).toHaveBeenLastCalledWith([
      { text: 'shop', href: `/app/digital_experience/shop?${TIME_QUERY}&source=otel` },
      { text: 'Sessions', href: SESSIONS_HREF },
      { text: 'abcdef12' },
    ]);
    expect(screen.getByTestId('digitalExperienceSessionBack')).toHaveAttribute(
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

  it('summarizes the session', async () => {
    mockFetch.mockResolvedValue(detail());
    renderPage();

    expect(await screen.findByTestId('digitalExperienceSessionId')).toHaveTextContent(
      'abcdef123456'
    );
    expect(screen.getByTestId('digitalExperienceSessionStat-duration')).toHaveTextContent(
      '1 min 0 s'
    );
    expect(screen.getByTestId('digitalExperienceSessionStat-errors')).toHaveTextContent('1');
    const metadata = screen.getByTestId('digitalExperienceSessionMetadata');
    expect(metadata).toHaveTextContent('jane@example.com');
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

  it('draws a waterfall segment per page visit with error markers', async () => {
    mockFetch.mockResolvedValue(detail());
    renderPage();

    const waterfall = await screen.findByTestId('digitalExperienceSessionWaterfall');
    const segments = within(waterfall).getAllByTestId('digitalExperienceSessionWaterfallSegment');
    expect(segments.map(({ style }) => [style.left, style.width])).toEqual([
      ['0%', '50%'],
      ['50%', '50%'],
    ]);
    expect(segments[1]).toHaveAccessibleName('/cart: 30 s, 0 clicks, 1 error');
    expect(within(waterfall).getByTestId('digitalExperienceSessionWaterfallError')).toHaveStyle({
      left: '75%',
    });
  });

  it('says when the timeline is cut short', async () => {
    mockFetch.mockResolvedValue(detail({ timelineTruncated: true }));
    renderPage();

    expect(
      await screen.findByTestId('digitalExperienceSessionTimelineTruncated')
    ).toBeInTheDocument();
  });

  it('explains a session without page views', async () => {
    mockFetch.mockResolvedValue(detail({ pageVisits: [], timeline: [] }));
    renderPage();

    expect(await screen.findByTestId('digitalExperienceSessionNoPageVisits')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceSessionWaterfall')).not.toBeInTheDocument();
  });

  it('leads back to the list when the session does not exist', async () => {
    mockFetch.mockRejectedValue(httpError(404, 'Session [abcdef123456] not found'));
    renderPage();

    expect(await screen.findByTestId('digitalExperienceSessionNotFoundBack')).toHaveAttribute(
      'href',
      SESSIONS_HREF
    );
  });

  it('retries a failed load', async () => {
    mockFetch.mockRejectedValueOnce(httpError(500, 'Could not load the sessions.'));
    renderPage();

    expect(await screen.findByTestId('digitalExperienceSessionError')).toHaveTextContent(
      'Could not load the sessions.'
    );
    mockFetch.mockResolvedValue(detail());
    fireEvent.click(screen.getByTestId('digitalExperienceSessionRetry'));

    expect(await screen.findByTestId('digitalExperienceSessionSummary')).toBeInTheDocument();
  });
});
