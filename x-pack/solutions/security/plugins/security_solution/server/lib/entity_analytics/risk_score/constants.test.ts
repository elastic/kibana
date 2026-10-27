/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ALERT_SAMPLE_SIZE, RIEMANN_ZETA_S_VALUE, getRiemannZetaValue } from './constants';

describe('getRiemannZetaValue', () => {
  it('uses a default alert sample size of 500', () => {
    expect(DEFAULT_ALERT_SAMPLE_SIZE).toBe(500);
  });

  it.each([
    [1, 1],
    [10, 1.9953364933456017],
    [100, 2.412874098703719],
    [500, 2.522977328584379],
    [1_000, 2.5491456029175756],
    [10_000, 2.5923758486729866],
  ])('is the zeta partial sum over %d inputs', (sampleSize, expected) => {
    expect(getRiemannZetaValue(sampleSize)).toBeCloseTo(expected, 12);
  });

  it('maps a sample of alerts that all score 100 to a normalized score of 100', () => {
    [1, 7, 100, 500, 1_000, 5_000].forEach((sampleSize) => {
      let raw = 0;
      for (let rank = 1; rank <= sampleSize; rank++) {
        raw += 100 / rank ** RIEMANN_ZETA_S_VALUE;
      }
      expect(raw / getRiemannZetaValue(sampleSize)).toBeCloseTo(100, 8);
    });
  });

  it('returns the same value for repeated calls', () => {
    expect(getRiemannZetaValue(250)).toBe(getRiemannZetaValue(250));
  });

  it('treats a sample size below one as one', () => {
    expect(getRiemannZetaValue(0)).toBe(1);
    expect(getRiemannZetaValue(0.4)).toBe(1);
  });
});
