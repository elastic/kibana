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
  it('reads the filters set, leaving out the unset and empty ones', () => {
    mockRoute({ browser: 'Chrome', os: '', pageUrl: 'https://shop.example.com/' });

    const { filters, hasActiveFilters } = renderHook(() => useOverviewFilters()).result.current;

    expect(filters).toEqual({ browser: 'Chrome', pageUrl: 'https://shop.example.com/' });
    expect(hasActiveFilters).toBe(true);
  });

  it('has no active filters without any', () => {
    mockRoute({ environment: 'production' });

    const { filters, hasActiveFilters } = renderHook(() => useOverviewFilters()).result.current;

    expect(filters).toEqual({});
    expect(hasActiveFilters).toBe(false);
  });

  it('sets a filter and keeps the other params', () => {
    mockRoute({}, '?rangeFrom=now-15m&rangeTo=now&os=macOS');
    const { result } = renderHook(() => useOverviewFilters());

    act(() => result.current.setFilter('browser', 'Chrome'));

    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'browser=Chrome&os=macOS&rangeFrom=now-15m&rangeTo=now',
      })
    );
  });

  it('removes a filter for undefined', () => {
    mockRoute({ browser: 'Chrome' }, '?browser=Chrome&rangeFrom=now-15m');
    const { result } = renderHook(() => useOverviewFilters());

    act(() => result.current.setFilter('browser', undefined));

    expect(push).toHaveBeenCalledWith(expect.objectContaining({ search: 'rangeFrom=now-15m' }));
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

describe('useSharedFilters', () => {
  it('returns the filters the Sessions list has too, and only the ones set', () => {
    mockRoute({ browser: 'Chrome', device: 'iPhone', pageUrl: '/' });

    expect(renderHook(() => useSharedFilters()).result.current).toEqual({ browser: 'Chrome' });
  });
});
