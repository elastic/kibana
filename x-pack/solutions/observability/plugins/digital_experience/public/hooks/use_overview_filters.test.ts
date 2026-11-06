/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useHistory, useLocation } from 'react-router-dom';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useOverviewFilters } from './use_overview_filters';
import { useOverviewKuery, useOverviewPercentile } from './use_overview_search';
import { useSharedFilters } from './use_shared_filters';

jest.mock('react-router-dom', () => ({ useHistory: jest.fn(), useLocation: jest.fn() }));
jest.mock('./use_digital_experience_params');

const push = jest.fn();

const mockRoute = (query: Record<string, string>, search = '') => {
  jest
    .mocked(useDigitalExperienceParams)
    .mockReturnValue({ path: {}, query } as unknown as ReturnType<
      typeof useDigitalExperienceParams
    >);
  jest.mocked(useHistory).mockReturnValue({ push } as unknown as ReturnType<typeof useHistory>);
  jest
    .mocked(useLocation)
    .mockReturnValue({ pathname: '/', search, hash: '' } as ReturnType<typeof useLocation>);
};

beforeEach(() => jest.clearAllMocks());

describe('useOverviewFilters', () => {
  it('reads the values of the filters set, leaving out the unset and empty ones', () => {
    mockRoute({ browser: 'Chrome,!Safari', os: '', pageUrl: 'https://shop.example.com/' });

    const { filters, params, hasActiveFilters } = renderHook(() => useOverviewFilters()).result
      .current;

    expect(filters).toEqual({
      browser: [
        { value: 'Chrome', exclude: false },
        { value: 'Safari', exclude: true },
      ],
      pageUrl: [{ value: 'https://shop.example.com/', exclude: false }],
    });
    expect(params).toEqual({ browser: 'Chrome,!Safari', pageUrl: 'https://shop.example.com/' });
    expect(hasActiveFilters).toBe(true);
  });

  it('gives the routes the filters a link means, without the repeats and values past the cap', () => {
    const tooMany = Array.from({ length: 12 }, (_, index) => `b${index}`).join(',');
    mockRoute({ browser: 'Chrome,Chrome,,!Chrome', os: tooMany });

    const { filters, params } = renderHook(() => useOverviewFilters()).result.current;

    expect(params).toEqual({
      browser: 'Chrome',
      os: 'b0,b1,b2,b3,b4,b5,b6,b7,b8,b9',
    });
    expect(filters.browser).toEqual([{ value: 'Chrome', exclude: false }]);
    expect(filters.os).toHaveLength(10);
  });

  it('has no active filters without any', () => {
    mockRoute({ environment: 'production' });

    const { filters, params, hasActiveFilters } = renderHook(() => useOverviewFilters()).result
      .current;

    expect(filters).toEqual({});
    expect(params).toEqual({});
    expect(hasActiveFilters).toBe(false);
  });

  it('sets the values of a filter, escaped, and keeps the other params', () => {
    mockRoute({}, '?rangeFrom=now-15m&rangeTo=now&os=macOS');
    const { result } = renderHook(() => useOverviewFilters());

    act(() =>
      result.current.setFilter('pageUrl', [
        { value: 'https://shop.example.com/a,b', exclude: false },
        { value: 'https://shop.example.com/c', exclude: true },
      ])
    );

    const { search } = push.mock.calls[0][0];
    const params = new URLSearchParams(search);
    expect(params.get('pageUrl')).toBe(
      'https://shop.example.com/a\\,b,!https://shop.example.com/c'
    );
    expect(params.get('os')).toBe('macOS');
    expect(params.get('rangeFrom')).toBe('now-15m');
  });

  it('removes a filter set to no values', () => {
    mockRoute({ browser: 'Chrome' }, '?browser=Chrome&rangeFrom=now-15m');
    const { result } = renderHook(() => useOverviewFilters());

    act(() => result.current.setFilter('browser', []));

    expect(push).toHaveBeenCalledWith(expect.objectContaining({ search: 'rangeFrom=now-15m' }));
  });

  it('sets several filters in one URL update', () => {
    mockRoute({ browser: 'Chrome' }, '?browser=Chrome&rangeFrom=now-15m');
    const { result } = renderHook(() => useOverviewFilters());

    act(() =>
      result.current.setFilters({
        browser: [],
        os: [{ value: 'macOS', exclude: false }],
        device: [{ value: 'iPhone', exclude: true }],
      })
    );

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'device=%21iPhone&os=macOS&rangeFrom=now-15m' })
    );
  });

  it('clears every filter and keeps the time range and environment', () => {
    mockRoute(
      { browser: 'Chrome', country: 'DE' },
      '?browser=Chrome&country=DE&device=iPhone&environment=production&os=macOS&pageUrl=%2F&rangeFrom=now-15m'
    );
    const { result } = renderHook(() => useOverviewFilters());

    act(() => result.current.clearFilters());

    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'environment=production&rangeFrom=now-15m' })
    );
  });
});

describe('useOverviewPercentile', () => {
  it('reads the percentile, 75 by default and for anything else', () => {
    mockRoute({ percentile: '95' });
    expect(renderHook(() => useOverviewPercentile()).result.current).toMatchObject({
      percentile: 95,
      percentileParam: '95',
    });

    mockRoute({});
    expect(renderHook(() => useOverviewPercentile()).result.current).toMatchObject({
      percentile: 75,
      percentileParam: undefined,
    });

    mockRoute({ percentile: '42' });
    expect(renderHook(() => useOverviewPercentile()).result.current.percentile).toBe(75);
  });

  it('sets the percentile and keeps the default out of the URL', () => {
    mockRoute({}, '?rangeFrom=now-15m');
    const { result } = renderHook(() => useOverviewPercentile());

    act(() => result.current.setPercentile(99));
    expect(push).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'percentile=99&rangeFrom=now-15m' })
    );

    mockRoute({ percentile: '99' }, '?percentile=99&rangeFrom=now-15m');
    const { result: current } = renderHook(() => useOverviewPercentile());
    act(() => current.current.setPercentile(75));
    expect(push).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'rangeFrom=now-15m' }));
  });
});

describe('useOverviewKuery', () => {
  it('reads the query, undefined when unset or empty', () => {
    mockRoute({ kuery: 'user_agent.name: Chrome' });
    expect(renderHook(() => useOverviewKuery()).result.current.kuery).toBe(
      'user_agent.name: Chrome'
    );

    mockRoute({ kuery: '' });
    expect(renderHook(() => useOverviewKuery()).result.current.kuery).toBeUndefined();
  });

  it('sets the query trimmed, and removes it when empty', () => {
    mockRoute({}, '?rangeFrom=now-15m');
    const { result } = renderHook(() => useOverviewKuery());

    act(() => result.current.setKuery('  os.name: macOS  '));
    expect(push).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: `kuery=${encodeURIComponent('os.name: macOS')}&rangeFrom=now-15m`,
      })
    );

    act(() => result.current.setKuery('   '));
    expect(push).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'rangeFrom=now-15m' }));
  });
});

describe('useSharedFilters', () => {
  it('returns the filters the Sessions list has too, and only the ones set', () => {
    mockRoute({ browser: 'Chrome', device: 'iPhone', pageUrl: '/' });

    expect(renderHook(() => useSharedFilters()).result.current).toEqual({ browser: 'Chrome' });
  });

  it('carries a filter over only when it is exactly one included value', () => {
    mockRoute({ browser: 'Chrome,Firefox', os: '!Linux', country: 'DE' });

    expect(renderHook(() => useSharedFilters()).result.current).toEqual({ country: 'DE' });
  });

  it('carries the value itself, not its escaped form', () => {
    mockRoute({ browser: 'Mobile\\, Safari' });

    expect(renderHook(() => useSharedFilters()).result.current).toEqual({
      browser: 'Mobile, Safari',
    });
  });

  it('leaves out a value the Sessions list would not accept', () => {
    mockRoute({ country: 'x'.repeat(17) });

    expect(renderHook(() => useSharedFilters()).result.current).toEqual({});
  });
});
