/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidWatchlistRiskModifier } from './use_watchlist_form_state_shared';

describe('isValidWatchlistRiskModifier', () => {
  it.each([0, 0.5, 1, 1.5, 2])('accepts in-range on-step (0.5) value %s', (value) => {
    expect(isValidWatchlistRiskModifier(value)).toBe(true);
  });

  it.each([0.25, 1.55, 1.65])('rejects in-range but off-step value %s', (value) => {
    expect(isValidWatchlistRiskModifier(value)).toBe(false);
  });

  it.each([-0.01, 2.01])('rejects out-of-range value %s', (value) => {
    expect(isValidWatchlistRiskModifier(value)).toBe(false);
  });

  it('rejects non-finite numbers', () => {
    expect(isValidWatchlistRiskModifier(Number.NaN)).toBe(false);
    expect(isValidWatchlistRiskModifier(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('rejects non-numbers', () => {
    expect(isValidWatchlistRiskModifier(undefined)).toBe(false);
    expect(isValidWatchlistRiskModifier('1.5')).toBe(false);
  });
});
