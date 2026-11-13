/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SessionRequest, SessionTimelineEvent } from '../../../../common/sessions';
import {
  ACTIVITY_KINDS,
  IDLE_GAP_MS,
  axisPercent,
  layoutAxis,
  REPEATED_REQUESTS_MIN,
  buildVisitActivity,
  formatElapsed,
  requestFamilyOf,
  type ActivityFilters,
} from './visit_activity';

const START_MS = Date.parse('2026-10-20T10:00:00.000Z');
const at = (offsetMs: number) => new Date(START_MS + offsetMs).toISOString();

const request = (
  url: string,
  offsetMs: number,
  overrides: Partial<SessionRequest> = {}
): SessionRequest => ({
  url,
  initiatorType: 'script',
  method: null,
  statusCode: null,
  failed: false,
  startTime: at(offsetMs),
  durationMs: 100,
  phases: null,
  timingWithheld: false,
  cached: false,
  transferSize: null,
  decodedBodySize: null,
  renderBlocking: false,
  protocol: null,
  traceId: null,
  spanId: null,
  visitIndex: 0,
  ...overrides,
});

const event = (
  kind: SessionTimelineEvent['kind'],
  offsetMs: number,
  detail: string | null = null
): SessionTimelineEvent => ({
  kind,
  name: kind,
  timestamp: at(offsetMs),
  offsetMs,
  durationMs: null,
  page: null,
  detail,
  stacktrace: null,
  traceId: null,
  spanId: null,
});

const ALL: ActivityFilters = { kinds: new Set(ACTIVITY_KINDS), search: '' };
const SOFT_VISIT = { startTime: at(0), load: null };

describe('buildVisitActivity', () => {
  it('puts requests and events in time order, a click before the requests it fires', () => {
    const activity = buildVisitActivity(
      SOFT_VISIT,
      [event('page_view', 0), event('click', 500, 'button.buy')],
      [request('/app.js', 50), request('/api/buy', 500, { initiatorType: 'fetch' })],
      ALL
    );

    expect(
      activity.rows.map((row) =>
        row.type === 'event' ? row.event.kind : row.type === 'request' ? row.request.url : row.type
      )
    ).toEqual(['page_view', '/app.js', 'click', '/api/buy']);
    expect(activity.originMs).toBe(START_MS);
    expect(activity.segments).toEqual([
      { startMs: 0, endMs: 600, startPercent: 0, endPercent: 100, compressed: false },
    ]);
  });

  it('counts a page load from its navigation start, with its milestones', () => {
    const activity = buildVisitActivity(
      {
        startTime: at(200),
        load: {
          navigationStart: at(0),
          responseStartMs: 150,
          domContentLoadedMs: 900,
          loadMs: 1_500,
        },
      },
      [],
      [request('/', 5, { initiatorType: 'navigation', durationMs: 300 })],
      ALL
    );

    expect(activity.originMs).toBe(START_MS);
    expect(activity.segments.at(-1)?.endMs).toBe(1_500);
    expect(activity.milestones.map(({ id, offsetMs }) => [id, offsetMs])).toEqual([
      ['first_byte', 150],
      ['dom_content_loaded', 900],
      ['load', 1_500],
    ]);
  });

  it(`folds ${REPEATED_REQUESTS_MIN} or more of the same request in a row, whatever their query`, () => {
    const polls = Array.from({ length: REPEATED_REQUESTS_MIN }, (_, index) =>
      request(`/api/poll?n=${index}`, 1_000 * index, { initiatorType: 'fetch', method: 'GET' })
    );
    const activity = buildVisitActivity(
      SOFT_VISIT,
      [event('click', 10_000)],
      [...polls, request('/api/poll?n=9', 11_000, { initiatorType: 'fetch', method: 'GET' })],
      ALL
    );

    expect(activity.rows.map(({ type }) => type)).toEqual([
      'repeated_requests',
      'event',
      // A click breaks the run, so the poll after it stays on its own.
      'request',
    ]);
    const [folded] = activity.rows;
    expect(folded.type === 'repeated_requests' && folded.requests).toHaveLength(
      REPEATED_REQUESTS_MIN
    );
    expect([folded.startMs - START_MS, folded.endMs - START_MS]).toEqual([0, 3_100]);
  });

  it('keeps fewer repeats as separate rows', () => {
    const activity = buildVisitActivity(
      SOFT_VISIT,
      [],
      Array.from({ length: REPEATED_REQUESTS_MIN - 1 }, (_, index) =>
        request('/api/poll', 100 * index)
      ),
      ALL
    );

    expect(activity.rows.every(({ type }) => type === 'request')).toBe(true);
  });

  it('filters by kind and by text, keeping page views only without a search', () => {
    const events = [event('page_view', 0), event('click', 100, 'a.help'), event('error', 200)];
    const requests = [request('/help.js', 50)];

    const onlyClicks = buildVisitActivity(SOFT_VISIT, events, requests, {
      kinds: new Set(['click']),
      search: '',
    });
    expect(onlyClicks.rows.map(({ type }) => type)).toEqual(['event', 'event']);

    const searched = buildVisitActivity(SOFT_VISIT, events, requests, { ...ALL, search: ' HELP ' });
    expect(
      searched.rows.map((row) =>
        row.type === 'request' ? row.request.url : row.type === 'event' ? row.event.detail : null
      )
    ).toEqual(['/help.js', 'a.help']);
  });

  it('has an empty but drawable axis without rows', () => {
    const activity = buildVisitActivity(SOFT_VISIT, [], [], ALL);
    expect(activity).toEqual({
      originMs: START_MS,
      segments: [{ startMs: 0, endMs: 1, startPercent: 0, endPercent: 100, compressed: false }],
      rows: [],
      milestones: [],
    });
  });
});

describe('layoutAxis', () => {
  it('shortens an idle stretch, so that a page load and a later click both get width', () => {
    const segments = layoutAxis([
      [0, 1_000],
      [20_000, 20_000],
    ]);

    expect(segments.map(({ startMs, endMs, compressed }) => [startMs, endMs, compressed])).toEqual([
      [0, 1_000, false],
      [1_000, 20_000, true],
      [20_000, 20_001, false],
    ]);
    // The idle 19s take 4% of the width, the page load nearly all the rest.
    expect(segments[1].endPercent - segments[1].startPercent).toBe(4);
    expect(axisPercent(segments, 500)).toBeCloseTo(47.95, 1);
    expect(axisPercent(segments, 10_500)).toBeCloseTo(97.9, 1);
    expect(axisPercent(segments, 20_000)).toBeCloseTo(99.9, 1);
    expect(axisPercent(segments, 99_000)).toBe(100);
  });

  it(`keeps activity less than ${IDLE_GAP_MS} ms apart on one linear stretch`, () => {
    expect(
      layoutAxis([
        [200, 400],
        [1_300, 1_500],
      ])
    ).toEqual([{ startMs: 0, endMs: 1_500, startPercent: 0, endPercent: 100, compressed: false }]);
  });
});

describe('requestFamilyOf', () => {
  it.each([
    ['navigation', '/', 'document'],
    ['link', '/app.css', 'stylesheet'],
    ['css', '/fonts/inter.woff2?v=3', 'font'],
    ['img', '/hero.png', 'image'],
    ['xmlhttprequest', '/api', 'api'],
    ['something-new', '/x', 'other'],
  ])('maps %s %s to %s', (initiatorType, url, family) => {
    expect(requestFamilyOf(request(url, 0, { initiatorType }))).toBe(family);
  });
});

describe('formatElapsed', () => {
  it.each([
    [0, '0 ms'],
    [850.4, '850 ms'],
    [1_234, '1.23 s'],
    [12_345, '12.3 s'],
    [125_000, '2:05'],
  ])('formats %d ms as %s', (milliseconds, expected) => {
    expect(formatElapsed(milliseconds)).toBe(expected);
  });
});
