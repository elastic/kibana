/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OtelEventFields } from './event_fields';
import { DOCUMENT_GAP_MS, buildRequests } from './session_requests';

const ORIGIN_MS = Date.parse('2026-10-20T10:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();
/** A time relative to the first page load's time origin. */
const at = (offsetMs: number) => iso(ORIGIN_MS + offsetMs);

const resourceTiming = ({
  emittedAt,
  url,
  initiatorType = 'script',
  fetchStart,
  responseEnd,
  restricted = false,
  transferSize = 2048,
  decodedBodySize = 8192,
  spanId,
}: {
  emittedAt: number;
  url: string;
  initiatorType?: string;
  fetchStart: number;
  responseEnd: number;
  restricted?: boolean;
  transferSize?: number;
  decodedBodySize?: number;
  spanId?: string;
}): OtelEventFields => ({
  '@timestamp': [iso(emittedAt)],
  event_name: ['browser.resource_timing'],
  'attributes.url.full': [url],
  'attributes.browser.resource_timing.initiator_type': [initiatorType],
  'attributes.browser.resource_timing.fetch_start': [fetchStart],
  'attributes.browser.resource_timing.domain_lookup_start': [restricted ? 0 : fetchStart + 1],
  'attributes.browser.resource_timing.domain_lookup_end': [restricted ? 0 : fetchStart + 11],
  'attributes.browser.resource_timing.connect_start': [restricted ? 0 : fetchStart + 11],
  'attributes.browser.resource_timing.connect_end': [restricted ? 0 : fetchStart + 41],
  'attributes.browser.resource_timing.secure_connection_start': [restricted ? 0 : fetchStart + 21],
  'attributes.browser.resource_timing.request_start': [restricted ? 0 : fetchStart + 41],
  'attributes.browser.resource_timing.response_start': [restricted ? 0 : responseEnd - 20],
  'attributes.browser.resource_timing.response_end': [responseEnd],
  'attributes.browser.resource_timing.transfer_size': [restricted ? 0 : transferSize],
  'attributes.browser.resource_timing.decoded_body_size': [restricted ? 0 : decodedBodySize],
  ...(spanId ? { span_id: [spanId], trace_id: ['trace-' + spanId] } : {}),
});

const navigationTiming = ({
  originMs,
  emittedAfterLoadMs = 300,
  url = 'https://shop.example.com/',
}: {
  originMs: number;
  emittedAfterLoadMs?: number;
  url?: string;
}): OtelEventFields => ({
  '@timestamp': [iso(originMs + 1_500 + emittedAfterLoadMs)],
  event_name: ['browser.navigation_timing'],
  'attributes.url.full': [url],
  'attributes.browser.resource_timing.fetch_start': [5],
  'attributes.browser.resource_timing.request_start': [60],
  'attributes.browser.resource_timing.response_start': [200],
  'attributes.browser.resource_timing.response_end': [300],
  'attributes.browser.resource_timing.transfer_size': [12_000],
  'attributes.browser.navigation_timing.dom_content_loaded_event_end': [900],
  'attributes.browser.navigation_timing.load_event_end': [1_500],
});

const fetchSpan = ({
  startMs,
  durationMs,
  spanId,
  statusCode,
  error = false,
  url = 'https://shop.example.com/api/cart',
}: {
  startMs: number;
  durationMs: number;
  spanId: string;
  statusCode?: number;
  error?: boolean;
  url?: string;
}): OtelEventFields => ({
  '@timestamp': [iso(startMs)],
  name: ['GET'],
  kind: ['Client'],
  duration: [durationMs * 1e6],
  'status.code': [error ? 'Error' : 'Unset'],
  'scope.name': ['@opentelemetry/instrumentation-fetch'],
  span_id: [spanId],
  trace_id: ['trace-' + spanId],
  'attributes.url.full': [url],
  'attributes.http.request.method': ['GET'],
  ...(statusCode !== undefined ? { 'attributes.http.response.status_code': [statusCode] } : {}),
});

const visits = (...offsets: number[]) => offsets.map((offset) => ({ startTime: at(offset) }));

describe('buildRequests', () => {
  it('places the requests of a page load from the time origin its events bound', () => {
    const { requests, loads } = buildRequests(
      [
        navigationTiming({ originMs: ORIGIN_MS }),
        // Reported in one batch, a while after both ended.
        resourceTiming({
          emittedAt: ORIGIN_MS + 1_600,
          url: 'https://shop.example.com/app.js',
          fetchStart: 320,
          responseEnd: 600,
        }),
        resourceTiming({
          emittedAt: ORIGIN_MS + 1_600,
          url: 'https://shop.example.com/hero.png',
          initiatorType: 'img',
          fetchStart: 400,
          responseEnd: 800,
        }),
      ],
      visits(100)
    );

    // The navigation timing, reported 300 ms after the load, bounds the origin closest.
    expect(loads.get(0)).toEqual({
      navigationStart: at(300),
      responseStartMs: 200,
      domContentLoadedMs: 900,
      loadMs: 1_500,
    });
    expect(
      requests.map(({ url, initiatorType, startTime, durationMs, visitIndex }) => ({
        url,
        initiatorType,
        startTime,
        durationMs,
        visitIndex,
      }))
    ).toEqual([
      {
        url: 'https://shop.example.com/',
        initiatorType: 'navigation',
        startTime: at(305),
        durationMs: 295,
        visitIndex: 0,
      },
      {
        url: 'https://shop.example.com/app.js',
        initiatorType: 'script',
        startTime: at(620),
        durationMs: 280,
        visitIndex: 0,
      },
      {
        url: 'https://shop.example.com/hero.png',
        initiatorType: 'img',
        startTime: at(700),
        durationMs: 400,
        visitIndex: 0,
      },
    ]);
    expect(requests[1].phases).toEqual({
      queued: 1,
      dns: 10,
      connect: 30,
      tls: 20,
      waiting: 219,
      download: 20,
    });
  });

  it('pins the time origin with a fetch span, which starts with its request', () => {
    const { requests, loads } = buildRequests(
      [
        navigationTiming({ originMs: ORIGIN_MS }),
        resourceTiming({
          emittedAt: ORIGIN_MS + 4_200,
          url: 'https://shop.example.com/api/cart',
          initiatorType: 'fetch',
          fetchStart: 3_000,
          responseEnd: 3_400,
          spanId: 's1',
        }),
        fetchSpan({ startMs: ORIGIN_MS + 3_000, durationMs: 400, spanId: 's1', statusCode: 200 }),
      ],
      visits(100)
    );

    expect(loads.get(0)?.navigationStart).toBe(at(0));
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(
      expect.objectContaining({
        initiatorType: 'fetch',
        method: 'GET',
        statusCode: 200,
        failed: false,
        startTime: at(3_000),
        traceId: 'trace-s1',
        spanId: 's1',
      })
    );
  });

  it('tells page loads apart, and gives each request the last visit of its page load before it', () => {
    const secondOrigin = ORIGIN_MS + 20_000;
    const { requests, loads } = buildRequests(
      [
        navigationTiming({ originMs: ORIGIN_MS }),
        // After an in-app navigation to the cart at 5s.
        resourceTiming({
          emittedAt: ORIGIN_MS + 6_500,
          url: 'https://shop.example.com/cart.js',
          fetchStart: 6_000,
          responseEnd: 6_200,
        }),
        navigationTiming({ originMs: secondOrigin, url: 'https://shop.example.com/checkout' }),
        resourceTiming({
          emittedAt: secondOrigin + 1_400,
          url: 'https://shop.example.com/checkout.js',
          fetchStart: 100,
          responseEnd: 400,
        }),
      ],
      // The checkout page view is reported a little after its page load starts.
      visits(100, 5_000, 20_150)
    );

    expect(DOCUMENT_GAP_MS).toBeLessThan(20_000);
    expect(requests.map(({ url, visitIndex }) => [url, visitIndex])).toEqual([
      ['https://shop.example.com/', 0],
      ['https://shop.example.com/cart.js', 1],
      ['https://shop.example.com/checkout', 2],
      ['https://shop.example.com/checkout.js', 2],
    ]);
    expect([...loads.keys()]).toEqual([0, 2]);
  });

  it('keeps a reload of the same page, which starts no visit, in the visit it reloaded', () => {
    const reloadOrigin = ORIGIN_MS + 40_000;
    const { requests, loads } = buildRequests(
      [
        navigationTiming({ originMs: ORIGIN_MS }),
        navigationTiming({ originMs: ORIGIN_MS + 20_000, url: 'https://shop.example.com/cart' }),
        navigationTiming({ originMs: reloadOrigin, url: 'https://shop.example.com/cart' }),
        resourceTiming({
          emittedAt: reloadOrigin + 1_400,
          url: 'https://shop.example.com/cart.js',
          fetchStart: 100,
          responseEnd: 400,
        }),
      ],
      visits(100, 20_150)
    );

    expect(requests.map(({ url, visitIndex }) => [url, visitIndex])).toEqual([
      ['https://shop.example.com/', 0],
      ['https://shop.example.com/cart', 1],
      ['https://shop.example.com/cart', 1],
      ['https://shop.example.com/cart.js', 1],
    ]);
    // The visit keeps the load that started it.
    expect(loads.get(1)?.navigationStart).toBe(at(20_300));
  });

  it('keeps the start and end of a cross-origin resource whose phases the browser withholds', () => {
    const { requests } = buildRequests(
      [
        resourceTiming({
          emittedAt: ORIGIN_MS + 1_000,
          url: 'https://cdn.other.com/font.woff2',
          initiatorType: 'css',
          fetchStart: 500,
          responseEnd: 900,
          restricted: true,
        }),
      ],
      visits(0)
    );

    expect(requests[0]).toEqual(
      expect.objectContaining({
        startTime: at(600),
        durationMs: 400,
        phases: null,
        timingWithheld: true,
        cached: false,
        transferSize: null,
        decodedBodySize: null,
      })
    );
  });

  it('flags a resource served from the cache', () => {
    const { requests } = buildRequests(
      [
        resourceTiming({
          emittedAt: ORIGIN_MS + 1_000,
          url: 'https://shop.example.com/app.css',
          initiatorType: 'link',
          fetchStart: 300,
          responseEnd: 302,
          transferSize: 0,
        }),
      ],
      visits(0)
    );

    expect(requests[0]).toEqual(expect.objectContaining({ cached: true, transferSize: 0 }));
  });

  it('keeps a failed request that has no timing event, from its span', () => {
    const { requests } = buildRequests(
      [
        fetchSpan({
          startMs: ORIGIN_MS + 7_000,
          durationMs: 30,
          spanId: 's2',
          error: true,
          url: 'https://shop.example.com/api/pay',
        }),
      ],
      visits(0, 5_000)
    );

    expect(requests).toEqual([
      expect.objectContaining({
        url: 'https://shop.example.com/api/pay',
        initiatorType: 'fetch',
        method: 'GET',
        statusCode: null,
        failed: true,
        startTime: at(7_000),
        durationMs: 30,
        phases: null,
        timingWithheld: false,
        visitIndex: 1,
      }),
    ]);
  });

  it('skips events that are neither timings nor HTTP spans, or lack a time or a URL', () => {
    const { requests } = buildRequests(
      [
        { '@timestamp': [at(0)], event_name: ['browser.web_vital'] },
        { event_name: ['browser.resource_timing'], 'attributes.url.full': ['https://x/'] },
        { '@timestamp': [at(0)], event_name: ['browser.resource_timing'] },
      ],
      visits(0)
    );

    expect(requests).toEqual([]);
  });
});
