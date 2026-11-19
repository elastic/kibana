/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useHistory, useLocation } from 'react-router-dom';
import type { OverviewFilters } from '../../common/overview_filters';
import { encodeOverviewFilters, readOverviewFilters } from '../../common/overview_filters_param';
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

const include = (...values: string[]) => values.map((value) => ({ value, exclude: false }));
const exclude = (...values: string[]) => values.map((value) => ({ value, exclude: true }));

/** The route's query for these filters, as the router decodes it. */
const mockFilters = (filters: OverviewFilters, search = '') => {
  const param = encodeOverviewFilters(filters) ?? '';
  mockRoute({ filters: param }, search || `?filters=${encodeURIComponent(param)}`);
};

/** The filters a pushed URL's `filters` param selects. */
const pushedFilters = (search: string) =>
  readOverviewFilters(new URLSearchParams(search).get('filters') ?? undefined);

beforeEach(() => jest.clearAllMocks());

describe('useOverviewFilters', () => {
  it('reads the values of the filters set, leaving out the unset ones', () => {
    const filters = {
      browser: [...include('Chrome'), ...exclude('Safari')],
      pageUrl: include('/'),
    };
    mockFilters(filters);

    const result = renderHook(() => useOverviewFilters()).result.current;

    expect(result.filters).toEqual(filters);
    expect(readOverviewFilters(result.params.filters)).toEqual(filters);
    expect(result.hasActiveFilters).toBe(true);
  });

  it('has no active filters without any', () => {
    mockRoute({ environment: 'production' });

    const { filters, params, hasActiveFilters } = renderHook(() => useOverviewFilters()).result
      .current;

    expect(filters).toEqual({});
    expect(params).toEqual({});
    expect(hasActiveFilters).toBe(false);
  });

  it('sets the values of a filter, whatever characters they hold, and keeps the other params', () => {
    mockRoute({}, '?rangeFrom=now-15m&rangeTo=now&kuery=a');
    const { result } = renderHook(() => useOverviewFilters());
    const values = [
      ...include('https://shop.example.com/a,b?x=!y'),
      ...exclude('https://shop.example.com/c'),
    ];

    act(() => result.current.setFilter('pageUrl', values));

    const { search } = push.mock.calls[0][0];
    expect(pushedFilters(search)).toEqual({ pageUrl: values });
    const params = new URLSearchParams(search);
    expect(params.get('kuery')).toBe('a');
    expect(params.get('rangeFrom')).toBe('now-15m');
  });

  it('keeps the other filters when it sets one', () => {
    const filters = { os: include('macOS'), country: exclude('DE') };
    mockFilters(filters);
    const { result } = renderHook(() => useOverviewFilters());

    act(() => result.current.setFilter('browser', include('Chrome')));

    expect(pushedFilters(push.mock.calls[0][0].search)).toEqual({
      ...filters,
      browser: include('Chrome'),
    });
  });

  it('leaves the URL as it is for a selection the param cannot hold, so no other filter is lost', () => {
    mockFilters({ browser: include('Chrome') });
    const { result } = renderHook(() => useOverviewFilters());

    // A value past the length its filter takes.
    act(() =>
      result.current.setFilter('pageUrl', include(`https://shop.example.com/${'a'.repeat(1100)}`))
    );
    expect(push).not.toHaveBeenCalled();

    // Values that are each fine, and together more than the param holds.
    const many = Array.from(
      { length: 10 },
      (_, index) => `https://shop.example.com/${index}${'b'.repeat(900)}`
    );
    act(() => result.current.setFilter('pageUrl', include(...many)));
    expect(push).not.toHaveBeenCalled();

    // A selection that fits still goes through.
    act(() => result.current.setFilter('pageUrl', include('https://shop.example.com/')));
    expect(pushedFilters(push.mock.calls[0][0].search)).toEqual({
      browser: include('Chrome'),
      pageUrl: include('https://shop.example.com/'),
    });
  });

  it('removes a filter set to no values, and the param when no filter is left', () => {
    mockFilters(
      { browser: include('Chrome') },
      `?filters=${encodeURIComponent(
        encodeOverviewFilters({ browser: include('Chrome') }) ?? ''
      )}&rangeFrom=now-15m`
    );
    const { result } = renderHook(() => useOverviewFilters());

    act(() => result.current.setFilter('browser', []));

    expect(push).toHaveBeenCalledWith(expect.objectContaining({ search: 'rangeFrom=now-15m' }));
  });

  it('sets several filters in one URL update', () => {
    mockFilters({ browser: include('Chrome') });
    const { result } = renderHook(() => useOverviewFilters());

    act(() =>
      result.current.setFilters({
        browser: [],
        os: include('macOS'),
        device: exclude('iPhone'),
      })
    );

    expect(push).toHaveBeenCalledTimes(1);
    expect(pushedFilters(push.mock.calls[0][0].search)).toEqual({
      os: include('macOS'),
      device: exclude('iPhone'),
    });
  });

  it('clears every filter and keeps the time range and environment', () => {
    const param =
      encodeOverviewFilters({ browser: include('Chrome'), country: include('DE') }) ?? '';
    mockRoute(
      { filters: param },
      `?filters=${encodeURIComponent(param)}&environment=production&rangeFrom=now-15m`
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
    mockFilters({ browser: include('Chrome'), device: include('iPhone'), pageUrl: include('/') });

    expect(renderHook(() => useSharedFilters()).result.current).toEqual({ browser: 'Chrome' });
  });

  it('carries a filter over only when it is exactly one included value', () => {
    mockFilters({
      browser: include('Chrome', 'Firefox'),
      os: exclude('Linux'),
      country: include('DE'),
    });

    expect(renderHook(() => useSharedFilters()).result.current).toEqual({ country: 'DE' });
  });

  it('carries the value itself', () => {
    mockFilters({ browser: include('Mobile, Safari') });

    expect(renderHook(() => useSharedFilters()).result.current).toEqual({
      browser: 'Mobile, Safari',
    });
  });
});
