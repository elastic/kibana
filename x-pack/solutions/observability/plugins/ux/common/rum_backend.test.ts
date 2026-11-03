/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  originFromUrl,
  rangeAroundTimestamp,
  resolveTimeRange,
  statusFromHttpLabel,
  summarizeBackendCallsFromActions,
} from './rum_backend';

describe('originFromUrl', () => {
  it('keeps scheme, host, and port', () => {
    expect(originFromUrl('https://api.shop.test:8443/v1/cart?x=1')).toBe(
      'https://api.shop.test:8443'
    );
  });

  it('returns a path when the value has no scheme', () => {
    expect(originFromUrl('/api/checkout')).toBe('/api/checkout');
  });

  it('returns null for empty input', () => {
    expect(originFromUrl(null)).toBeNull();
    expect(originFromUrl('  ')).toBeNull();
  });
});

describe('statusFromHttpLabel', () => {
  it('reads the status from method + code labels', () => {
    expect(statusFromHttpLabel('GET 500')).toBe(500);
    expect(statusFromHttpLabel('POST 200')).toBe(200);
  });

  it('returns null when the label has no status', () => {
    expect(statusFromHttpLabel('GQL GetCart')).toBeNull();
    expect(statusFromHttpLabel('GET')).toBeNull();
  });
});

describe('rangeAroundTimestamp', () => {
  it('pads five minutes around a valid ISO time', () => {
    const range = rangeAroundTimestamp('2026-08-16T12:00:00.000Z', 'now-24h', 'now', 60 * 1000);
    expect(range.rangeFrom).toBe('2026-08-16T11:59:00.000Z');
    expect(range.rangeTo).toBe('2026-08-16T12:01:00.000Z');
  });

  it('falls back when the timestamp is missing or invalid', () => {
    expect(rangeAroundTimestamp(undefined, 'now-24h', 'now')).toEqual({
      rangeFrom: 'now-24h',
      rangeTo: 'now',
    });
    expect(rangeAroundTimestamp('not-a-date', 'now-24h', 'now')).toEqual({
      rangeFrom: 'now-24h',
      rangeTo: 'now',
    });
  });
});

describe('resolveTimeRange', () => {
  it('turns datemath into ISO timestamps', () => {
    const range = resolveTimeRange('now-1h', 'now');
    expect(Date.parse(range.rangeFrom)).toBeLessThan(Date.parse(range.rangeTo));
    expect(range.rangeFrom).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(range.rangeTo).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('leaves already-ISO bounds unchanged besides parsing', () => {
    const range = resolveTimeRange('2026-08-16T12:00:00.000Z', '2026-08-16T13:00:00.000Z');
    expect(range).toEqual({
      rangeFrom: '2026-08-16T12:00:00.000Z',
      rangeTo: '2026-08-16T13:00:00.000Z',
    });
  });
});

describe('summarizeBackendCallsFromActions', () => {
  it('groups HTTP actions by origin and counts failures', () => {
    const calls = summarizeBackendCallsFromActions([
      {
        kind: 'http',
        label: 'GET 200',
        detail: 'https://api.shop.test/cart',
        traceId: 'aaa',
      },
      {
        kind: 'http',
        label: 'POST 500',
        detail: 'https://api.shop.test/checkout',
        traceId: 'bbb',
      },
      { kind: 'click', label: 'Add', detail: null, traceId: null },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      origin: 'https://api.shop.test',
      count: 2,
      failCount: 1,
      sampleTraceId: 'aaa',
    });
  });
});
