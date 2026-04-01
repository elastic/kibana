/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsCountBadgeLabel, getCombinedAlertsCountBadgeLabel } from '.';

describe('getAlertsCountBadgeLabel', () => {
  it('returns "{count} alerts" for a numeric count', () => {
    expect(getAlertsCountBadgeLabel(75)).toBe('75 alerts');
  });

  it('returns "{count} alert" for a count of 1', () => {
    expect(getAlertsCountBadgeLabel(1)).toBe('1 alert');
  });

  it('returns null when count is null', () => {
    expect(getAlertsCountBadgeLabel(null)).toBeNull();
  });

  it('returns "0 alerts" for a count of 0', () => {
    expect(getAlertsCountBadgeLabel(0)).toBe('0 alerts');
  });
});

describe('getCombinedAlertsCountBadgeLabel', () => {
  it('returns the total when all counts are numeric', () => {
    expect(getCombinedAlertsCountBadgeLabel([50, 25])).toBe('75 alerts');
  });

  it('returns "{total}+ alerts" when some counts are null', () => {
    expect(getCombinedAlertsCountBadgeLabel([50, null])).toBe('50+ alerts');
  });

  it('returns null when all counts are null', () => {
    expect(getCombinedAlertsCountBadgeLabel([null, null])).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(getCombinedAlertsCountBadgeLabel([])).toBeNull();
  });

  it('returns the single count when only one entry', () => {
    expect(getCombinedAlertsCountBadgeLabel([42])).toBe('42 alerts');
  });

  it('returns "1 alert" for a single entry with count 1', () => {
    expect(getCombinedAlertsCountBadgeLabel([1])).toBe('1 alert');
  });

  it('returns "{total}+ alerts" when multiple entries and only one is null', () => {
    expect(getCombinedAlertsCountBadgeLabel([30, 20, null])).toBe('50+ alerts');
  });
});
