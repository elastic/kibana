/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canUseDailyRollup, rangeSpanMs, shouldQueryDailyIndex } from './rum_daily';

describe('rangeSpanMs', () => {
  it('reads datemath windows', () => {
    const week = rangeSpanMs('now-7d', 'now');
    const year = rangeSpanMs('now-1y', 'now');
    expect(week).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    expect(year).toBeGreaterThan(300 * 24 * 60 * 60 * 1000);
  });
});

describe('shouldQueryDailyIndex', () => {
  const watermark = '2026-08-15T00:00:00.000Z';

  it('stays on raw/session paths for short ranges', () => {
    expect(
      shouldQueryDailyIndex({
        installed: true,
        watermark,
        rangeFrom: 'now-24h',
        rangeTo: 'now',
      })
    ).toBe(false);
    expect(
      shouldQueryDailyIndex({
        installed: true,
        watermark,
        rangeFrom: 'now-7d',
        rangeTo: 'now',
      })
    ).toBe(false);
  });

  it('uses daily rollups for 90d and 1y', () => {
    expect(
      shouldQueryDailyIndex({
        installed: true,
        watermark,
        rangeFrom: 'now-90d',
        rangeTo: 'now',
      })
    ).toBe(true);
    expect(
      shouldQueryDailyIndex({
        installed: true,
        watermark,
        rangeFrom: 'now-1y',
        rangeTo: 'now',
      })
    ).toBe(true);
  });

  it('does not use daily when missing, warming, or forced raw', () => {
    expect(
      shouldQueryDailyIndex({
        installed: false,
        watermark,
        rangeFrom: 'now-90d',
        rangeTo: 'now',
      })
    ).toBe(false);
    expect(
      shouldQueryDailyIndex({
        installed: true,
        watermark: null,
        rangeFrom: 'now-90d',
        rangeTo: 'now',
      })
    ).toBe(false);
    expect(
      shouldQueryDailyIndex({
        installed: true,
        watermark,
        analyticsMode: 'raw',
        rangeFrom: 'now-90d',
        rangeTo: 'now',
      })
    ).toBe(false);
  });
});

describe('canUseDailyRollup', () => {
  it('allows service, date, and page filters', () => {
    expect(canUseDailyRollup({})).toBe(true);
    expect(canUseDailyRollup({ errorGroup: undefined })).toBe(true);
  });

  it('allows browser-only (browser-daily) but not browser+page', () => {
    expect(canUseDailyRollup({ browser: 'Chrome' })).toBe(true);
    expect(canUseDailyRollup({ browser: 'Chrome', pageUrl: '/app' })).toBe(false);
  });

  it('rejects facets that are not in the rollup', () => {
    expect(canUseDailyRollup({ os: 'Mac' })).toBe(false);
    expect(canUseDailyRollup({ location: 'US' })).toBe(false);
    expect(canUseDailyRollup({ user: 'ada' })).toBe(false);
    expect(canUseDailyRollup({ kuery: 'foo:bar' })).toBe(false);
    expect(canUseDailyRollup({ frustration: 'rage' })).toBe(false);
    expect(canUseDailyRollup({ breakpoint: 'desktop' })).toBe(false);
    expect(canUseDailyRollup({ connection: '4g' })).toBe(false);
    expect(canUseDailyRollup({ device: '8' })).toBe(false);
    expect(canUseDailyRollup({ errorGroup: 'TypeError|x' })).toBe(false);
  });
});
