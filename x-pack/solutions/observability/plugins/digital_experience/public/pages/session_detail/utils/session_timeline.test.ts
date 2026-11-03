/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  emptyWebVitals,
  type SessionPageVisit,
  type SessionTimelineEvent,
} from '../../../../common/sessions';
import { formatOffset, groupEventsByVisit, layoutWaterfall } from './session_timeline';

const START = '2026-10-20T10:00:00.000Z';
const at = (offsetMs: number) => new Date(Date.parse(START) + offsetMs).toISOString();

const visit = (page: string, startMs: number, durationMs: number): SessionPageVisit => ({
  page,
  url: `https://shop.example.com${page}`,
  startTime: at(startMs),
  endTime: at(startMs + durationMs),
  durationMs,
  clickCount: 0,
  errorCount: 0,
  webVitals: emptyWebVitals(),
});

const event = (
  kind: SessionTimelineEvent['kind'],
  offsetMs: number,
  name: string = kind
): SessionTimelineEvent => ({
  kind,
  name,
  timestamp: at(offsetMs),
  offsetMs,
  durationMs: null,
  page: null,
  detail: null,
  traceId: null,
  spanId: null,
});

describe('groupEventsByVisit', () => {
  const visits = [visit('/', 0, 10_000), visit('/cart', 10_000, 5_000)];

  it('puts each event in the visit it happened in, keeping spans and logs out', () => {
    const groups = groupEventsByVisit(visits, [
      event('page_view', 0),
      event('click', 4_000),
      event('span', 5_000),
      event('page_view', 10_000),
      event('log', 11_000),
      event('error', 12_000),
      event('web_vital', 14_000),
    ]);

    expect(
      groups.map(({ visit: { page }, events }) => [page, events.map(({ kind }) => kind)])
    ).toEqual([
      ['/', ['page_view', 'click']],
      ['/cart', ['page_view', 'error', 'web_vital']],
    ]);
  });

  it('puts events before the first visit in it', () => {
    const [first] = groupEventsByVisit(visits, [event('click', -2_000)]);
    expect(first.events.map(({ kind }) => kind)).toEqual(['click']);
  });

  it('returns no groups without page visits', () => {
    expect(groupEventsByVisit([], [event('click', 0)])).toEqual([]);
  });
});

describe('layoutWaterfall', () => {
  it('places each visit proportionally on the session, with a marker per error', () => {
    const layout = layoutWaterfall(
      { startTime: START, durationMs: 20_000 },
      [visit('/', 0, 5_000), visit('/cart', 10_000, 10_000)],
      [event('click', 1_000), event('error', 15_000, 'TypeError')]
    );

    expect(layout.totalMs).toBe(20_000);
    expect(layout.segments).toEqual([
      { index: 0, page: '/', offsetPercent: 0, widthPercent: 25 },
      { index: 1, page: '/cart', offsetPercent: 50, widthPercent: 50 },
    ]);
    expect(layout.errorMarkers).toEqual([
      { offsetPercent: 75, event: expect.objectContaining({ name: 'TypeError' }) },
    ]);
  });

  it('spans events newer than the summary, so nothing falls off the bar', () => {
    const layout = layoutWaterfall(
      { startTime: START, durationMs: 10_000 },
      [visit('/', 0, 15_000)],
      [event('error', 20_000)]
    );

    expect(layout.totalMs).toBe(20_000);
    expect(layout.segments[0].widthPercent).toBe(75);
    expect(layout.errorMarkers[0].offsetPercent).toBe(100);
  });

  it('keeps a zero-length session drawable', () => {
    const layout = layoutWaterfall({ startTime: START, durationMs: 0 }, [visit('/', 0, 0)], []);
    expect(layout.totalMs).toBe(1);
    expect(layout.segments[0]).toMatchObject({ offsetPercent: 0, widthPercent: 0 });
  });
});

describe('formatOffset', () => {
  it.each([
    [0, '0:00'],
    [5_400, '0:05'],
    [125_000, '2:05'],
    [3_725_000, '62:05'],
  ])('formats %d ms as %s', (offsetMs, expected) => {
    expect(formatOffset(offsetMs)).toBe(expected);
  });
});
