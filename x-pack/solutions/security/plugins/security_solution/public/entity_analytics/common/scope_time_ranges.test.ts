/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_RANGE_OPTIONS } from '../components/home/entities_grid/common';
import { ENTITY_ANALYTICS_TABLE_ID } from '../components/home/constants';
import {
  getEntityAnalyticsNewHomeScopeId,
  getScopeFlyoutLookback,
  getScopeFlyoutTimeRange,
  getScopeFlyoutTimeRangeMs,
} from './scope_time_ranges';

describe('getEntityAnalyticsNewHomeScopeId', () => {
  it('gives each time range its own scope', () => {
    const scopeIds = TIME_RANGE_OPTIONS.map(getEntityAnalyticsNewHomeScopeId);

    expect(new Set(scopeIds).size).toBe(TIME_RANGE_OPTIONS.length);
  });
});

describe('getScopeFlyoutTimeRange', () => {
  it.each(TIME_RANGE_OPTIONS)('pins the whole flyout to the last %s for its scope', (timeRange) => {
    expect(getScopeFlyoutTimeRange(getEntityAnalyticsNewHomeScopeId(timeRange))).toEqual({
      from: `now-${timeRange}`,
      to: 'now',
    });
  });

  it('is undefined for scopes that only pin alerts, unknown scopes and no scope', () => {
    expect(getScopeFlyoutTimeRange(ENTITY_ANALYTICS_TABLE_ID)).toBeUndefined();
    expect(getScopeFlyoutTimeRange('alerts-page')).toBeUndefined();
    expect(getScopeFlyoutTimeRange(undefined)).toBeUndefined();
  });
});

describe('getScopeFlyoutTimeRangeMs', () => {
  const now = new Date('2024-06-15T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves the pinned range to epoch milliseconds ending now', () => {
    expect(getScopeFlyoutTimeRangeMs(getEntityAnalyticsNewHomeScopeId('7d'))).toEqual({
      from: new Date('2024-06-08T12:00:00.000Z').valueOf(),
      to: now.valueOf(),
    });
  });

  it('is undefined when the scope does not pin the flyout', () => {
    expect(getScopeFlyoutTimeRangeMs(ENTITY_ANALYTICS_TABLE_ID)).toBeUndefined();
    expect(getScopeFlyoutTimeRangeMs(undefined)).toBeUndefined();
  });
});

describe('getScopeFlyoutLookback', () => {
  it.each([
    ['24h', { amount: 24, unit: 'hours' }],
    ['7d', { amount: 7, unit: 'days' }],
    ['30d', { amount: 30, unit: 'days' }],
  ] as const)('parses the %s scope', (timeRange, lookback) => {
    expect(getScopeFlyoutLookback(getEntityAnalyticsNewHomeScopeId(timeRange))).toEqual(lookback);
  });

  it('is undefined for scopes that pin no range', () => {
    expect(getScopeFlyoutLookback(ENTITY_ANALYTICS_TABLE_ID)).toBeUndefined();
    expect(getScopeFlyoutLookback(undefined)).toBeUndefined();
  });
});
