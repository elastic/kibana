/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatSparklineHour } from '.';

/** 2026-08-07T00:00:00.000Z */
const MIDNIGHT_UTC = 1_754_524_800_000;

describe('formatSparklineHour', () => {
  it('formats the hour a bucket starts at', () => {
    expect(formatSparklineHour({ time: MIDNIGHT_UTC + 3_600_000 * 14, timeZone: 'UTC' })).toBe(
      '14:00'
    );
  });

  /** A 24-hour clock, so the tooltip header never reads `2:00` for both 02:00 and 14:00. */
  it('pads a single-digit hour rather than reading as an afternoon hour', () => {
    expect(formatSparklineHour({ time: MIDNIGHT_UTC + 3_600_000 * 2, timeZone: 'UTC' })).toBe(
      '02:00'
    );
  });

  it('reads midnight as 00:00 rather than 24:00', () => {
    expect(formatSparklineHour({ time: MIDNIGHT_UTC, timeZone: 'UTC' })).toBe('00:00');
  });

  /** The buckets are UTC epochs; an analyst reads them on their own clock. */
  it('renders the bucket in the caller timezone', () => {
    expect(formatSparklineHour({ time: MIDNIGHT_UTC, timeZone: 'America/New_York' })).toBe('20:00');
  });
});
