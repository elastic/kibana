/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  durationToMs,
  isBotUserAgent,
  makeErrorGroupKey,
  ranksFromPercentileRanks,
} from './rum_app';

describe('makeErrorGroupKey', () => {
  it('joins type and the first line of the message', () => {
    expect(makeErrorGroupKey('TypeError', 'x is not defined\n    at foo')).toBe(
      'TypeError|x is not defined'
    );
  });

  it('falls back when type or message is missing', () => {
    expect(makeErrorGroupKey(null, null)).toBe('Error|');
    expect(makeErrorGroupKey('RangeError', null)).toBe('RangeError|');
  });
});

describe('durationToMs', () => {
  it('treats nanosecond values as ns', () => {
    expect(durationToMs(2.5e9)).toBe(2500);
  });

  it('treats microsecond values as µs', () => {
    expect(durationToMs(2.5e6)).toBe(2500);
  });

  it('passes through millisecond values', () => {
    expect(durationToMs(2500)).toBe(2500);
  });
});

describe('ranksFromPercentileRanks', () => {
  it('splits good / needs-improvement / poor', () => {
    expect(ranksFromPercentileRanks({ '2500.0': 70, '4000.0': 90 })).toEqual({
      good: 70,
      ni: 20,
      poor: 10,
    });
  });
});

describe('isBotUserAgent', () => {
  it('detects known bot tokens', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBotUserAgent('curl/8.0.1')).toBe(true);
    expect(isBotUserAgent('Chrome-Lighthouse')).toBe(true);
    expect(isBotUserAgent('python-requests/2.31.0')).toBe(true);
  });

  it('does not treat headless Chrome as a bot so local Playwright data stays visible', () => {
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });

  it('returns false for empty or human agents', () => {
    expect(isBotUserAgent(null)).toBe(false);
    expect(isBotUserAgent(undefined)).toBe(false);
    expect(isBotUserAgent('')).toBe(false);
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });
});
