/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  emptyRumAnalyticsStatus,
  eventSequenceToken,
  normalizeSequenceToken,
  isValidEsTimeValue,
  parseEsTimeValueSeconds,
  parseIncludeRaw,
  rumAnalyticsHealth,
  rumSessionsLagWarnSeconds,
  shouldQuerySessionIndex,
} from './rum_sessions';

describe('normalizeSequenceToken', () => {
  it('strips slashes and hashes and collapses spaces', () => {
    expect(normalizeSequenceToken(' /Catalog Page ')).toBe('catalog_page');
    expect(normalizeSequenceToken('#/checkout')).toBe('checkout');
  });
});

describe('eventSequenceToken', () => {
  it('prefixes page and activity tokens', () => {
    expect(eventSequenceToken('page', 'catalog')).toBe('p:catalog');
    expect(eventSequenceToken('activity', 'Add to cart')).toBe('a:add_to_cart');
  });
});

describe('shouldQuerySessionIndex', () => {
  it('uses the session index only when installed and not forced raw', () => {
    expect(
      shouldQuerySessionIndex({
        installed: true,
        analyticsMode: undefined,
        watermark: '2026-08-15T00:00:00.000Z',
      })
    ).toBe(true);
    expect(
      shouldQuerySessionIndex({
        installed: true,
        analyticsMode: 'raw',
        watermark: '2026-08-15T00:00:00.000Z',
      })
    ).toBe(false);
    expect(shouldQuerySessionIndex({ installed: true, watermark: null })).toBe(false);
    expect(shouldQuerySessionIndex({ installed: false })).toBe(false);
  });
});

describe('parseIncludeRaw', () => {
  it('reads the UI opt-in flag', () => {
    expect(parseIncludeRaw('true')).toBe(true);
    expect(parseIncludeRaw(true)).toBe(true);
    expect(parseIncludeRaw('false')).toBe(false);
  });
});

describe('rumAnalyticsHealth', () => {
  it('is missing until the transform is installed', () => {
    expect(rumAnalyticsHealth(emptyRumAnalyticsStatus())).toBe('missing');
  });

  it('is healthy when started and within the lag budget', () => {
    expect(
      rumAnalyticsHealth({
        ...emptyRumAnalyticsStatus(),
        installed: true,
        state: 'started',
        watermark: '2026-08-15T00:00:00.000Z',
        lagSeconds: 10 * 60,
      })
    ).toBe('healthy');
  });

  it('is recovering before the first checkpoint', () => {
    expect(
      rumAnalyticsHealth({
        ...emptyRumAnalyticsStatus(),
        installed: true,
        state: 'started',
        watermark: null,
      })
    ).toBe('recovering');
  });

  it('is recovering when the transform failed or lagged', () => {
    expect(
      rumAnalyticsHealth({
        ...emptyRumAnalyticsStatus(),
        installed: true,
        state: 'failed',
        lagSeconds: 0,
      })
    ).toBe('recovering');
    expect(
      rumAnalyticsHealth({
        ...emptyRumAnalyticsStatus(),
        installed: true,
        state: 'started',
        lagSeconds: 2 * 60 * 60,
      })
    ).toBe('recovering');
  });
});

describe('isValidEsTimeValue', () => {
  it('accepts Elasticsearch time values', () => {
    expect(isValidEsTimeValue('5m')).toBe(true);
    expect(isValidEsTimeValue('30s')).toBe(true);
    expect(isValidEsTimeValue('1h')).toBe(true);
    expect(isValidEsTimeValue('')).toBe(false);
    expect(isValidEsTimeValue('5')).toBe(false);
    expect(isValidEsTimeValue('nope')).toBe(false);
  });
});

describe('parseEsTimeValueSeconds', () => {
  it('parses Elasticsearch time values', () => {
    expect(parseEsTimeValueSeconds('5m')).toBe(5 * 60);
    expect(parseEsTimeValueSeconds('30s')).toBe(30);
    expect(parseEsTimeValueSeconds('1h')).toBe(3600);
    expect(parseEsTimeValueSeconds('nope')).toBe(5 * 60);
  });
});

describe('rumSessionsLagWarnSeconds', () => {
  it('adds slack on top of the configured delay', () => {
    expect(rumSessionsLagWarnSeconds('5m')).toBe(20 * 60);
    expect(rumSessionsLagWarnSeconds('1m')).toBe(16 * 60);
  });
});
