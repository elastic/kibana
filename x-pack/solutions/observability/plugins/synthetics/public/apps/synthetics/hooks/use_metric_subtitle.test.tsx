/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { useMetricSubtitle } from './use_metric_subtitle';
import { WrappedHelper } from '../utils/testing';
import type { OverviewStatusMetaData } from '../../../../common/runtime_types';

const makeMeta = (overrides: Partial<OverviewStatusMetaData> = {}): OverviewStatusMetaData =>
  ({
    monitorQueryId: 'cfg1',
    configId: 'cfg1',
    name: 'Test Monitor',
    schedule: '3',
    tags: [],
    isEnabled: true,
    type: 'http',
    isStatusAlertEnabled: false,
    overallStatus: 'up',
    locations: [{ id: 'us_east', label: 'US East', status: 'up' }],
    ...overrides,
  } as OverviewStatusMetaData);

describe('useMetricSubtitle', () => {
  const Wrapper = ({ children }: React.PropsWithChildren) => (
    <WrappedHelper
      state={{
        serviceLocations: {
          locationsLoaded: true,
          loading: false,
          locations: [
            { id: 'us_east', label: 'US East', url: '', isServiceManaged: true },
            { id: 'us_west', label: 'US West', url: '', isServiceManaged: true },
          ],
        },
      }}
    >
      {children}
    </WrappedHelper>
  );

  it('returns "Down in {location}" for a single down location', () => {
    const monitor = makeMeta({
      overallStatus: 'down',
      locations: [{ id: 'us_east', label: 'US East', status: 'down' }],
    });
    const { result } = renderHook(() => useMetricSubtitle(monitor), { wrapper: Wrapper });
    expect(result.current).toBe('Down in US East');
  });

  it('returns "Down in {number} locations" for multiple down locations', () => {
    const monitor = makeMeta({
      overallStatus: 'down',
      locations: [
        { id: 'us_east', label: 'US East', status: 'down' },
        { id: 'us_west', label: 'US West', status: 'down' },
      ],
    });
    const { result } = renderHook(() => useMetricSubtitle(monitor), { wrapper: Wrapper });
    expect(result.current).toBe('Down in 2 locations');
  });

  it('returns "Up in {location}" for a single up location', () => {
    const monitor = makeMeta({
      locations: [{ id: 'us_east', label: 'US East', status: 'up' }],
    });
    const { result } = renderHook(() => useMetricSubtitle(monitor), { wrapper: Wrapper });
    expect(result.current).toBe('Up in US East');
  });

  it('returns "Up in {number} locations" for multiple up locations', () => {
    const monitor = makeMeta({
      locations: [
        { id: 'us_east', label: 'US East', status: 'up' },
        { id: 'us_west', label: 'US West', status: 'up' },
      ],
    });
    const { result } = renderHook(() => useMetricSubtitle(monitor), { wrapper: Wrapper });
    expect(result.current).toBe('Up in 2 locations');
  });

  it('returns "Pending in {location}" for a single pending location', () => {
    const monitor = makeMeta({
      overallStatus: 'pending',
      locations: [{ id: 'us_east', label: 'US East', status: 'pending' }],
    });
    const { result } = renderHook(() => useMetricSubtitle(monitor), { wrapper: Wrapper });
    expect(result.current).toBe('Pending in US East');
  });

  it('returns "Pending in {number} locations" for multiple pending locations', () => {
    const monitor = makeMeta({
      overallStatus: 'pending',
      locations: [
        { id: 'us_east', label: 'US East', status: 'pending' },
        { id: 'us_west', label: 'US West', status: 'pending' },
      ],
    });
    const { result } = renderHook(() => useMetricSubtitle(monitor), { wrapper: Wrapper });
    expect(result.current).toBe('Pending in 2 locations');
  });

  it('prioritizes down over up status in mixed location states', () => {
    const monitor = makeMeta({
      overallStatus: 'down',
      locations: [
        { id: 'us_east', label: 'US East', status: 'down' },
        { id: 'us_west', label: 'US West', status: 'up' },
      ],
    });
    const { result } = renderHook(() => useMetricSubtitle(monitor), { wrapper: Wrapper });
    expect(result.current).toBe('Down in US East');
  });

  it('falls back to location label when no status matches', () => {
    const monitor = makeMeta({
      overallStatus: 'unknown',
      locations: [{ id: 'us_east', label: 'US East', status: 'unknown' }],
    });
    const { result } = renderHook(() => useMetricSubtitle(monitor), { wrapper: Wrapper });
    expect(result.current).toBe('US East');
  });

  it('uses location id as fallback when label is undefined and locations are not loaded', () => {
    const monitor = makeMeta({
      overallStatus: 'unknown',
      locations: [{ id: 'custom_loc', label: undefined as unknown as string, status: 'unknown' }],
    });
    const NotLoadedWrapper = ({ children }: React.PropsWithChildren) => (
      <WrappedHelper
        state={{
          serviceLocations: {
            locationsLoaded: false,
            loading: false,
            locations: [],
          },
        }}
      >
        {children}
      </WrappedHelper>
    );
    const { result } = renderHook(() => useMetricSubtitle(monitor), {
      wrapper: NotLoadedWrapper,
    });
    expect(result.current).toBe('custom_loc');
  });

  it('handles empty locations array gracefully', () => {
    const monitor = makeMeta({
      locations: [],
    });
    const { result } = renderHook(() => useMetricSubtitle(monitor), { wrapper: Wrapper });
    expect(result.current).toBe('');
  });
});
