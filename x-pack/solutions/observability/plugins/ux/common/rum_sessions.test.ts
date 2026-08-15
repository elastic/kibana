/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  emptyRumAnalyticsStatus,
  canUseSessionIndex,
  eventSequenceToken,
  normalizeSequenceToken,
  isValidEsTimeValue,
  newSessionIds,
  parseEsTimeValueSeconds,
  parseIncludeRaw,
  rangeIncludesOpenTail,
  rumAnalyticsHealth,
  rumSessionsLagWarnSeconds,
  shouldMergeRawTail,
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

describe('canUseSessionIndex', () => {
  const day = 24 * 60 * 60 * 1000;

  it('covers 30d session-shaped reads when the index is installed', () => {
    expect(
      canUseSessionIndex({
        installed: true,
        rangeMs: 30 * day,
      })
    ).toBe(true);
  });

  it('stays off raw, year-long, and unsupported facets', () => {
    expect(canUseSessionIndex({ installed: true, rangeMs: 30 * day, analyticsMode: 'raw' })).toBe(
      false
    );
    expect(canUseSessionIndex({ installed: true, rangeMs: 400 * day })).toBe(false);
    expect(canUseSessionIndex({ installed: true, rangeMs: 30 * day, kuery: 'foo:bar' })).toBe(
      false
    );
    expect(canUseSessionIndex({ installed: false, rangeMs: 30 * day })).toBe(false);
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

describe('newSessionIds', () => {
  it('keeps only tail ids the index has never seen', () => {
    expect(newSessionIds(['a', 'b', 'c', ''], new Set(['b']))).toEqual(['a', 'c']);
  });
});

describe('rangeIncludesOpenTail', () => {
  const watermark = '2026-08-15T12:00:00.000Z';

  it('treats now and empty as open-ended', () => {
    expect(rangeIncludesOpenTail('now', watermark)).toBe(true);
    expect(rangeIncludesOpenTail(undefined, watermark)).toBe(true);
    expect(rangeIncludesOpenTail('now/d', watermark)).toBe(true);
  });

  it('rejects ranges that ended before now', () => {
    expect(rangeIncludesOpenTail('now-1h', watermark)).toBe(false);
    expect(rangeIncludesOpenTail('2026-08-15T11:00:00.000Z', watermark)).toBe(false);
  });

  it('keeps an absolute end after the watermark', () => {
    expect(rangeIncludesOpenTail('2026-08-15T12:05:00.000Z', watermark)).toBe(true);
  });
});

describe('shouldMergeRawTail', () => {
  const healthy = {
    ...emptyRumAnalyticsStatus(),
    installed: true,
    state: 'started' as const,
    watermark: '2026-08-15T12:00:00.000Z',
    lagSeconds: 8 * 60,
  };

  it('merges when the transform is healthy and the range includes now', () => {
    expect(shouldMergeRawTail({ status: healthy, rangeTo: 'now' })).toBe(true);
  });

  it('does not merge a lagged or failed transform', () => {
    expect(
      shouldMergeRawTail({
        status: { ...healthy, lagSeconds: 2 * 60 * 60 },
        rangeTo: 'now',
      })
    ).toBe(false);
    expect(
      shouldMergeRawTail({
        status: { ...healthy, state: 'failed' },
        rangeTo: 'now',
      })
    ).toBe(false);
  });

  it('does not merge forced raw or historical ranges', () => {
    expect(shouldMergeRawTail({ status: healthy, analyticsMode: 'raw', rangeTo: 'now' })).toBe(
      false
    );
    expect(shouldMergeRawTail({ status: healthy, rangeTo: 'now-7d' })).toBe(false);
  });
});
