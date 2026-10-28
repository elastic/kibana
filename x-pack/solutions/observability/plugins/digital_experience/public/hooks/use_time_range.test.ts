/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useHistory, useLocation } from 'react-router-dom';
import { isValidTimeRange, useSyncTimeRange, useTimeRange } from './use_time_range';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useKibanaServices } from './use_kibana_services';

jest.mock('react-router-dom', () => ({ useHistory: jest.fn(), useLocation: jest.fn() }));
jest.mock('./use_digital_experience_params');
jest.mock('./use_kibana_services');

const setTime = jest.fn();
let timefilterRange = { from: 'now-15m', to: 'now' };
const push = jest.fn();
const replace = jest.fn();

const mockRoute = (query: Record<string, string>, search = '') => {
  jest.mocked(useKibanaServices).mockReturnValue({
    data: {
      query: {
        timefilter: {
          timefilter: {
            getTime: () => timefilterRange,
            getTimeDefaults: () => ({ from: 'now-15m', to: 'now' }),
            setTime,
          },
        },
      },
    },
  } as unknown as ReturnType<typeof useKibanaServices>);
  jest
    .mocked(useDigitalExperienceParams)
    .mockReturnValue({ path: {}, query } as unknown as ReturnType<
      typeof useDigitalExperienceParams
    >);
  jest
    .mocked(useHistory)
    .mockReturnValue({ push, replace } as unknown as ReturnType<typeof useHistory>);
  jest
    .mocked(useLocation)
    .mockReturnValue({ pathname: '/my-app', search, hash: '#panel' } as ReturnType<
      typeof useLocation
    >);
};

beforeEach(() => {
  jest.clearAllMocks();
  timefilterRange = { from: 'now-15m', to: 'now' };
});

describe('useTimeRange', () => {
  it('reads the time range from the route query params', () => {
    mockRoute({ rangeFrom: 'now-7d', rangeTo: 'now' });

    const { result } = renderHook(() => useTimeRange());

    expect(result.current.timeRange).toEqual({ rangeFrom: 'now-7d', rangeTo: 'now' });
    expect(result.current.isTimeRangeInUrl).toBe(true);
  });

  it('falls back to the timefilter when the URL has no time range', () => {
    mockRoute({});

    const { result } = renderHook(() => useTimeRange());

    expect(result.current.timeRange).toEqual({ rangeFrom: 'now-15m', rangeTo: 'now' });
    expect(result.current.isTimeRangeInUrl).toBe(false);
  });

  it('sets the time range in the URL, keeping the other params and the hash', () => {
    mockRoute(
      { rangeFrom: 'now-15m', rangeTo: 'now' },
      '?percentile=75&rangeFrom=now-15m&rangeTo=now'
    );
    const { result } = renderHook(() => useTimeRange());

    act(() => result.current.setTimeRange({ rangeFrom: 'now-7d', rangeTo: 'now' }));

    expect(push).toHaveBeenCalledWith({
      pathname: '/my-app',
      search: 'percentile=75&rangeFrom=now-7d&rangeTo=now',
      hash: '#panel',
    });
  });
});

describe('useSyncTimeRange', () => {
  it('writes the timefilter range into a URL that has none', () => {
    mockRoute({}, '?percentile=75');

    const { result } = renderHook(() => useSyncTimeRange());

    expect(replace).toHaveBeenCalledWith({
      pathname: '/my-app',
      search: 'percentile=75&rangeFrom=now-15m&rangeTo=now',
      hash: '#panel',
    });
    expect(result.current).toBe(false);
  });

  it('replaces an invalid range with the timefilter range', () => {
    mockRoute({ rangeFrom: 'foo', rangeTo: 'now' }, '?rangeFrom=foo&rangeTo=now');

    const { result } = renderHook(() => useSyncTimeRange());

    expect(replace).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'rangeFrom=now-15m&rangeTo=now' })
    );
    expect(setTime).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it('falls back to the timefilter defaults when the timefilter range is invalid too', () => {
    timefilterRange = { from: 'now', to: 'now-1d' };
    mockRoute({}, '');

    renderHook(() => useSyncTimeRange());

    expect(replace).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'rangeFrom=now-15m&rangeTo=now' })
    );
  });

  it('leaves a URL with a valid range as it is, whatever its form', () => {
    const rangeFrom = '2021-01-18T12:00:00.000Z';
    mockRoute(
      { rangeFrom, rangeTo: 'now', sourceFilter: 'otel' },
      `?sourceFilter=otel&rangeFrom=${rangeFrom}&rangeTo=now`
    );

    const { result } = renderHook(() => useSyncTimeRange());

    expect(replace).not.toHaveBeenCalled();
    expect(result.current).toBe(true);
  });

  it('mirrors the URL range into the timefilter when it differs', () => {
    mockRoute({ rangeFrom: 'now-7d', rangeTo: 'now' }, '?rangeFrom=now-7d&rangeTo=now');

    renderHook(() => useSyncTimeRange());

    expect(setTime).toHaveBeenCalledWith({ from: 'now-7d', to: 'now' });
  });

  it('leaves the timefilter alone when it already has the URL range', () => {
    mockRoute({ rangeFrom: 'now-15m', rangeTo: 'now' }, '?rangeFrom=now-15m&rangeTo=now');

    renderHook(() => useSyncTimeRange());

    expect(setTime).not.toHaveBeenCalled();
  });
});

describe('isValidTimeRange', () => {
  it('accepts relative and absolute dates', () => {
    expect(isValidTimeRange({ rangeFrom: 'now-15m', rangeTo: 'now' })).toBe(true);
    expect(
      isValidTimeRange({
        rangeFrom: '2026-10-01T00:00:00.000Z',
        rangeTo: '2026-10-02T00:00:00.000Z',
      })
    ).toBe(true);
  });

  it('rejects a bound that does not parse', () => {
    expect(isValidTimeRange({ rangeFrom: 'foo', rangeTo: 'now' })).toBe(false);
  });

  it('rejects a range that ends before it starts', () => {
    expect(isValidTimeRange({ rangeFrom: 'now', rangeTo: 'now-15m' })).toBe(false);
  });
});
