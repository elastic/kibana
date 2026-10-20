/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { getEntityAnalyticsNewHomeScopeId } from '../common/alert_time_range_overrides';
import {
  EntityFlyoutTimeRangeProvider,
  entityFlyoutTimeRangeToMs,
  useEntityFlyoutTimeRange,
  useEntityFlyoutTimeRangeMs,
} from './use_entity_flyout_time_range';

const withProvider = (props: {
  scopeId?: string;
  timeRange?: { from: string; to: string };
}): FC<PropsWithChildren> => {
  const Wrapper: FC<PropsWithChildren> = ({ children }) => (
    <EntityFlyoutTimeRangeProvider {...props}>{children}</EntityFlyoutTimeRangeProvider>
  );
  return Wrapper;
};

describe('useEntityFlyoutTimeRange', () => {
  it('is undefined outside a provider', () => {
    const { result } = renderHook(() => useEntityFlyoutTimeRange());

    expect(result.current).toBeUndefined();
  });

  it('derives the window from a new home page scope', () => {
    const { result } = renderHook(() => useEntityFlyoutTimeRange(), {
      wrapper: withProvider({ scopeId: getEntityAnalyticsNewHomeScopeId('7d') }),
    });

    expect(result.current).toEqual({ from: 'now-7d', to: 'now' });
  });

  it('is undefined for scopes that do not pin the flyout', () => {
    const { result } = renderHook(() => useEntityFlyoutTimeRange(), {
      wrapper: withProvider({ scopeId: 'alerts-page' }),
    });

    expect(result.current).toBeUndefined();
  });

  it('prefers an explicit time range over the scope', () => {
    const { result } = renderHook(() => useEntityFlyoutTimeRange(), {
      wrapper: withProvider({
        scopeId: getEntityAnalyticsNewHomeScopeId('7d'),
        timeRange: { from: 'now-1h', to: 'now' },
      }),
    });

    expect(result.current).toEqual({ from: 'now-1h', to: 'now' });
  });
});

describe('entityFlyoutTimeRangeToMs', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves relative datemath to epoch milliseconds, rounding `to` up', () => {
    expect(entityFlyoutTimeRangeToMs({ from: 'now-24h', to: 'now' })).toEqual({
      from: new Date('2024-06-14T12:00:00.000Z').valueOf(),
      to: new Date('2024-06-15T12:00:00.000Z').valueOf(),
    });
    // `now/d`..`now/d` must span the whole (local) day: `to` is rounded up to the end of the day.
    const day = entityFlyoutTimeRangeToMs({ from: 'now/d', to: 'now/d' });
    expect((day?.to ?? 0) - (day?.from ?? 0)).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it('is undefined without a range or with an invalid bound', () => {
    expect(entityFlyoutTimeRangeToMs(undefined)).toBeUndefined();
    expect(entityFlyoutTimeRangeToMs({ from: 'not-a-date', to: 'now' })).toBeUndefined();
  });
});

describe('useEntityFlyoutTimeRangeMs', () => {
  it('is undefined outside a provider', () => {
    const { result } = renderHook(() => useEntityFlyoutTimeRangeMs());

    expect(result.current).toBeUndefined();
  });

  it('keeps the same object across re-renders for the same window', () => {
    const { result, rerender } = renderHook(() => useEntityFlyoutTimeRangeMs(), {
      wrapper: withProvider({ scopeId: getEntityAnalyticsNewHomeScopeId('24h') }),
    });
    const first = result.current;
    rerender();

    expect(first).toBeDefined();
    expect(result.current).toBe(first);
    expect((first?.to ?? 0) - (first?.from ?? 0)).toBe(24 * 60 * 60 * 1000);
  });
});
