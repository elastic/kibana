/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SESSIONS_INDEX_PATTERN } from '../../../common/sessions';
import { TELEMETRY_SDK_LANGUAGE } from '@kbn/apm-types';
import { BROWSER_SDK_LANGUAGE } from '../../../common/otel_data';
import { SOURCE_SERVICE_NAME_FIELD, SOURCE_SESSION_ID_FIELD } from '../../lib/otel/source_fields';
import {
  SESSION_TIMELINE_SIZE,
  buildPageVisits,
  buildTimeline,
  getSession,
  type OtelEventFields,
} from './get_session';
import type { StoredSessionDocument } from './list_sessions';
import { SESSION_REQUESTS_SIZE } from './session_requests';

const START = '2026-10-20T10:00:00.000Z';
const startMs = Date.parse(START);
const at = (offsetMs: number) => new Date(startMs + offsetMs).toISOString();
const DAY_MS = 24 * 60 * 60 * 1000;
const JOURNEY_EVENT_NAMES = [
  'documentLoad',
  'browser.navigation',
  'click',
  'browser.user_action.click',
  'exception',
  'browser.web_vital',
];

/** Raw events as the `fields` option returns them: arrays of values by dotted name. */
const events: OtelEventFields[] = [
  {
    '@timestamp': [at(0)],
    name: ['documentLoad'],
    duration: [850_000_000],
    trace_id: ['t1'],
    span_id: ['s1'],
    'attributes.url.full': ['https://shop.example.com/?ref=ad'],
  },
  {
    '@timestamp': [at(1_000)],
    event_name: ['browser.web_vital'],
    'attributes.browser.web_vital.name': ['lcp'],
    'attributes.browser.web_vital.value': [1200],
  },
  {
    '@timestamp': [at(2_000)],
    event_name: ['browser.user_action.click'],
    'attributes.browser.css_selector': ['button.add'],
    'attributes.url.full': ['https://shop.example.com/'],
  },
  {
    '@timestamp': [at(5_000)],
    event_name: ['browser.navigation'],
    'attributes.url.full': ['https://shop.example.com/#/cart'],
  },
  {
    '@timestamp': [at(6_000)],
    event_name: ['exception'],
    'attributes.exception.type': ['TypeError'],
    'attributes.exception.message': ['x is undefined'],
    'attributes.url.full': ['https://shop.example.com/#/cart'],
  },
  { name: ['missing timestamp'] },
];

const summaryResponse = (
  source?: StoredSessionDocument
): SearchResponse<StoredSessionDocument> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: {
    hits: source ? [{ _index: 'digital-experience-sessions-browser-1', _source: source }] : [],
  },
});

const sessionSource = (times: { start_time?: string; end_time?: string }) => ({
  session: { id: 'abc' },
  service: { name: 'web' },
  ...times,
});

const eventsResponse = (
  fields: Array<OtelEventFields | undefined>,
  total = fields.length
): SearchResponse => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: {
    total: { value: total, relation: 'eq' },
    hits: fields.map((eventFields) => ({
      _index: 'logs-browser.otel-default',
      fields: eventFields,
    })),
  },
});

describe('buildTimeline', () => {
  it('classifies events and computes offsets from the session start', () => {
    const timeline = buildTimeline(events, startMs);

    expect(
      timeline.map(({ kind, name, offsetMs, page }) => ({ kind, name, offsetMs, page }))
    ).toEqual([
      { kind: 'page_view', name: 'documentLoad', offsetMs: 0, page: '/' },
      { kind: 'web_vital', name: 'LCP', offsetMs: 1_000, page: null },
      { kind: 'click', name: 'browser.user_action.click', offsetMs: 2_000, page: '/' },
      { kind: 'page_view', name: 'browser.navigation', offsetMs: 5_000, page: '/cart' },
      { kind: 'error', name: 'TypeError', offsetMs: 6_000, page: '/cart' },
    ]);
    expect(timeline[0]).toEqual(expect.objectContaining({ traceId: 't1', spanId: 's1' }));
    expect(timeline[1].detail).toBe('1200');
    expect(timeline[2].detail).toBe('button.add');
    expect(timeline[4].detail).toBe('x is undefined');
  });

  it('reads an attribute from the resource when the event has none', () => {
    const [event] = buildTimeline(
      [
        {
          '@timestamp': [at(0)],
          event_name: ['browser.navigation'],
          'resource.attributes.url.full': ['https://shop.example.com/checkout'],
        },
      ],
      startMs
    );

    expect(event).toEqual(
      expect.objectContaining({
        kind: 'page_view',
        page: '/checkout',
        detail: 'https://shop.example.com/checkout',
      })
    );
  });

  it('counts only exceptions as errors, and leaves out what the journey does not list', () => {
    const timeline = buildTimeline(
      [
        {
          '@timestamp': [at(0)],
          name: ['HTTP GET'],
          duration: [2_000_000],
          'attributes.event.outcome': ['failure'],
          'attributes.error.type': ['500'],
        },
        { '@timestamp': [at(1)], name: ['HTTP GET'], duration: [1_000_000] },
        { '@timestamp': [at(2)], event_name: ['app.log'] },
      ],
      startMs
    );

    // A failed request is not a JS error: the summary counts it as a failed request. Nor is it, or
    // a log, an event of the journey.
    expect(timeline).toEqual([]);
  });
});

describe('buildPageVisits', () => {
  it('builds the per-page journey with counts and web vitals', () => {
    const visits = buildPageVisits(events, startMs, at(10_000));

    expect(visits).toEqual([
      {
        page: '/',
        url: 'https://shop.example.com/?ref=ad',
        startTime: at(0),
        endTime: at(5_000),
        durationMs: 5_000,
        clickCount: 1,
        errorCount: 0,
        webVitals: { lcp: 1200, inp: null, cls: null, fcp: null, ttfb: null },
        load: null,
      },
      {
        page: '/cart',
        url: 'https://shop.example.com/#/cart',
        startTime: at(5_000),
        endTime: at(10_000),
        durationMs: 5_000,
        clickCount: 0,
        errorCount: 1,
        webVitals: { lcp: null, inp: null, cls: null, fcp: null, ttfb: null },
        load: null,
      },
    ]);
  });

  it('keeps a web vital on the page it names, though it arrives after the next page view', () => {
    const visits = buildPageVisits(
      [
        {
          '@timestamp': [at(0)],
          event_name: ['browser.navigation'],
          'attributes.url.full': ['https://shop.example.com/products'],
        },
        {
          '@timestamp': [at(5_000)],
          event_name: ['browser.navigation'],
          'attributes.url.full': ['https://shop.example.com/cart'],
        },
        // EDOT Browser settles LCP when the page is left, so it lands after the next page view.
        {
          '@timestamp': [at(5_100)],
          event_name: ['browser.web_vital'],
          'attributes.browser.web_vital.name': ['lcp'],
          'attributes.browser.web_vital.value': [1900],
          'attributes.url.full': ['https://shop.example.com/products'],
        },
      ],
      startMs,
      at(10_000)
    );

    expect(visits.map(({ page, webVitals }) => [page, webVitals.lcp])).toEqual([
      ['/products', 1900],
      ['/cart', null],
    ]);
  });

  it('ends the last visit at the newest request when that is newer than the summary and the events', () => {
    const visits = buildPageVisits(events, startMs, at(10_000), at(12_500));

    expect(visits.at(-1)).toEqual(
      expect.objectContaining({ endTime: at(12_500), durationMs: 7_500 })
    );
  });

  it('keeps the summary end when requests are older than it', () => {
    const visits = buildPageVisits(events, startMs, at(10_000), at(8_000));

    expect(visits.at(-1)?.endTime).toBe(at(10_000));
  });

  it('opens a visit for a page view with no URL, rather than leaving its events on the page before', () => {
    const visits = buildPageVisits(
      [
        {
          '@timestamp': [at(0)],
          event_name: ['browser.navigation'],
          'attributes.url.full': ['https://shop.example.com/'],
        },
        { '@timestamp': [at(2_000)], event_name: ['browser.navigation'] },
        {
          '@timestamp': [at(3_000)],
          event_name: ['browser.user_action.click'],
          'attributes.browser.css_selector': ['button.buy'],
        },
      ],
      startMs,
      at(5_000)
    );

    expect(visits.map(({ page, clickCount }) => [page, clickCount])).toEqual([
      ['/', 0],
      [null, 1],
    ]);
  });
});

describe('getSession', () => {
  let client: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    client = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('returns null when the session is not in the sessions index', async () => {
    client.search.mockResolvedValueOnce(summaryResponse());

    expect(await getSession(client, { serviceName: 'web', sessionId: 'abc' })).toBeNull();
    expect(client.search).toHaveBeenCalledTimes(1);
    expect(client.search).toHaveBeenCalledWith({
      index: SESSIONS_INDEX_PATTERN,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 1,
      sort: [{ end_time: 'desc' }],
      query: {
        bool: { filter: [{ term: { 'service.name': 'web' } }, { term: { 'session.id': 'abc' } }] },
      },
    });
  });

  it('loads the summary and only the fields the timeline uses of the raw events', async () => {
    client.search
      .mockResolvedValueOnce(
        summaryResponse(sessionSource({ start_time: START, end_time: at(10_000) }))
      )
      .mockResolvedValueOnce(eventsResponse(events.slice(0, 5)))
      .mockResolvedValueOnce(eventsResponse([]));

    const detail = await getSession(client, { serviceName: 'web', sessionId: 'abc' });

    expect(detail?.session.sessionId).toBe('abc');
    expect(detail?.timeline).toHaveLength(5);
    expect(detail?.timelineTruncated).toBe(false);
    expect(detail?.pageVisits.map(({ page }) => page)).toEqual(['/', '/cart']);

    const [eventsRequest] = client.search.mock.calls[1];
    expect(eventsRequest).toEqual(
      expect.objectContaining({
        index: ['traces-*.otel-*', 'logs-*.otel-*'],
        size: SESSION_TIMELINE_SIZE,
        track_total_hits: SESSION_TIMELINE_SIZE + 1,
        sort: [{ '@timestamp': 'asc' }],
        _source: false,
        query: {
          bool: {
            filter: [
              { term: { [SOURCE_SESSION_ID_FIELD]: 'abc' } },
              { term: { [SOURCE_SERVICE_NAME_FIELD]: 'web' } },
              // No other SDK's events, so a backend sharing the service name stays out, while
              // events that name no SDK are kept.
              {
                bool: {
                  should: [
                    { term: { [TELEMETRY_SDK_LANGUAGE]: BROWSER_SDK_LANGUAGE } },
                    { bool: { must_not: { exists: { field: TELEMETRY_SDK_LANGUAGE } } } },
                  ],
                  minimum_should_match: 1,
                },
              },
              // From just before the summary starts to the longest a session lasts, so events
              // newer than the summary still show.
              {
                range: {
                  '@timestamp': {
                    gte: startMs - 60_000,
                    lte: startMs + DAY_MS,
                    format: 'epoch_millis',
                  },
                },
              },
              // Only what the journey shows, so that requests can't push it out.
              {
                bool: {
                  should: [
                    { terms: { event_name: JOURNEY_EVENT_NAMES } },
                    { terms: { name: JOURNEY_EVENT_NAMES } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      })
    );
    expect(eventsRequest?.fields).toEqual(
      expect.arrayContaining([
        '@timestamp',
        'name',
        'event_name',
        'trace_id',
        'span_id',
        'attributes.url.full',
        'resource.attributes.url.full',
        'attributes.browser.web_vital.value',
        'attributes.exception.message',
        'resource.attributes.exception.message',
      ])
    );
  });

  it('loads the requests with a query of their own, and the page load on the visit it started', async () => {
    client.search
      .mockResolvedValueOnce(
        summaryResponse(sessionSource({ start_time: START, end_time: at(10_000) }))
      )
      .mockResolvedValueOnce(eventsResponse(events.slice(0, 5)))
      .mockResolvedValueOnce(
        eventsResponse(
          [
            {
              '@timestamp': [at(1_800)],
              event_name: ['browser.navigation_timing'],
              'attributes.url.full': ['https://shop.example.com/?ref=ad'],
              'attributes.browser.resource_timing.fetch_start': [2],
              'attributes.browser.resource_timing.response_end': [300],
              'attributes.browser.navigation_timing.load_event_end': [1_800],
            },
          ],
          SESSION_REQUESTS_SIZE + 1
        )
      );

    const detail = await getSession(client, { serviceName: 'web', sessionId: 'abc' });

    expect(detail?.requests).toEqual([
      expect.objectContaining({ initiatorType: 'navigation', startTime: at(2), visitIndex: 0 }),
    ]);
    expect(detail?.requestsTruncated).toBe(true);
    expect(detail?.pageVisits.map(({ load }) => load?.loadMs ?? null)).toEqual([1_800, null]);

    const [requestsRequest] = client.search.mock.calls[2];
    expect(requestsRequest).toEqual(
      expect.objectContaining({ size: SESSION_REQUESTS_SIZE, sort: [{ '@timestamp': 'asc' }] })
    );
    expect(requestsRequest?.fields).toEqual(
      expect.arrayContaining(['attributes.browser.resource_timing.fetch_start', 'span_id'])
    );
  });

  it('flags a timeline cut off at its size', async () => {
    client.search
      .mockResolvedValueOnce(
        summaryResponse(sessionSource({ start_time: START, end_time: at(10_000) }))
      )
      .mockResolvedValueOnce(eventsResponse(events.slice(0, 5), SESSION_TIMELINE_SIZE + 1))
      .mockResolvedValueOnce(eventsResponse([]));

    const detail = await getSession(client, { serviceName: 'web', sessionId: 'abc' });

    expect(detail?.timelineTruncated).toBe(true);
  });

  describe('with a timeline cut off at its size', () => {
    const lateRequest: OtelEventFields = {
      '@timestamp': [at(20_000)],
      event_name: ['browser.resource_timing'],
      'attributes.url.full': ['https://shop.example.com/api/late'],
      'attributes.browser.resource_timing.initiator_type': ['fetch'],
      'attributes.browser.resource_timing.fetch_start': [100],
      'attributes.browser.resource_timing.response_end': [300],
    };
    const urlsOf = (detail: Awaited<ReturnType<typeof getSession>>) =>
      detail?.requests.map(({ url }) => url) ?? [];

    const run = async (timelineTotal: number) => {
      client.search
        .mockResolvedValueOnce(
          summaryResponse(sessionSource({ start_time: START, end_time: at(10_000) }))
        )
        .mockResolvedValueOnce(eventsResponse(events.slice(0, 5), timelineTotal))
        .mockResolvedValueOnce(eventsResponse([lateRequest]));
      return getSession(client, { serviceName: 'web', sessionId: 'abc' });
    };

    it('leaves out the requests after its last event, which no visit it holds made', async () => {
      expect(urlsOf(await run(SESSION_TIMELINE_SIZE + 1))).toEqual([]);
    });

    it('keeps them when the timeline is complete', async () => {
      expect(urlsOf(await run(5))).toEqual(['https://shop.example.com/api/late']);
    });
  });

  it('skips hits without fields', async () => {
    client.search
      .mockResolvedValueOnce(
        summaryResponse(sessionSource({ start_time: START, end_time: at(10_000) }))
      )
      .mockResolvedValueOnce(eventsResponse([events[0], undefined]))
      .mockResolvedValueOnce(eventsResponse([]));

    const detail = await getSession(client, { serviceName: 'web', sessionId: 'abc' });

    expect(detail?.timeline).toHaveLength(1);
  });

  it('keeps the last page visit open until the newest raw event', async () => {
    client.search
      .mockResolvedValueOnce(
        summaryResponse(sessionSource({ start_time: START, end_time: at(3_000) }))
      )
      .mockResolvedValueOnce(eventsResponse(events.slice(0, 5)))
      .mockResolvedValueOnce(eventsResponse([]));

    const detail = await getSession(client, { serviceName: 'web', sessionId: 'abc' });

    // The summary ends at 3s, but the task has not summarized the events at 5s and 6s yet.
    expect(detail?.pageVisits.at(-1)).toEqual(
      expect.objectContaining({ page: '/cart', endTime: at(6_000), durationMs: 1_000 })
    );
  });

  it('opens a visit per page view, so reloading a page does not merge it into the last one', async () => {
    const load = (offsetMs: number) => ({
      '@timestamp': [at(offsetMs)],
      name: ['documentLoad'],
      'attributes.url.full': ['https://shop.example.com/'],
    });
    const lcp = (offsetMs: number, value: number) => ({
      '@timestamp': [at(offsetMs)],
      event_name: ['browser.web_vital'],
      'attributes.browser.web_vital.name': ['lcp'],
      'attributes.browser.web_vital.value': [value],
    });
    client.search
      .mockResolvedValueOnce(
        summaryResponse(sessionSource({ start_time: START, end_time: at(21_000) }))
      )
      .mockResolvedValueOnce(
        eventsResponse([load(0), lcp(1_000, 1200), load(20_000), lcp(21_000, 2400)])
      )
      .mockResolvedValueOnce(eventsResponse([]));

    const detail = await getSession(client, { serviceName: 'web', sessionId: 'abc' });

    // Two loads of the same URL are two visits, each keeping the vitals it measured.
    expect(detail?.pageVisits.map(({ page, durationMs }) => ({ page, durationMs }))).toEqual([
      { page: '/', durationMs: 20_000 },
      { page: '/', durationMs: 1_000 },
    ]);
    expect(detail?.pageVisits.map(({ webVitals }) => webVitals.lcp)).toEqual([1200, 2400]);
  });

  it('does not throw when the summary has no start or end time', async () => {
    client.search
      .mockResolvedValueOnce(summaryResponse(sessionSource({})))
      .mockResolvedValueOnce(eventsResponse(events.slice(0, 5)))
      .mockResolvedValueOnce(eventsResponse([]));

    const detail = await getSession(client, { serviceName: 'web', sessionId: 'abc' });

    expect(detail?.timeline.map(({ offsetMs }) => offsetMs)).toEqual([
      0, 1_000, 2_000, 5_000, 6_000,
    ]);
    expect(detail?.pageVisits.at(-1)?.endTime).toBe(at(6_000));
    const eventsQuery = client.search.mock.calls[1][0]?.query?.bool?.filter;
    expect(JSON.stringify(eventsQuery)).not.toContain('range');
  });
});
