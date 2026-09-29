/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import qs from 'query-string';

vi.mock('react-router-dom', () => {
  const mocked = {
    useHistory: vi.fn(),
    useLocation: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../components/contexts/profiling_dependencies/use_profiling_dependencies');

import { useHistory, useLocation } from 'react-router-dom';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useDateRangeRedirect } from './use_default_date_range_redirect';

describe('useDateRangeRedirect', () => {
  const mockReplace = vi.fn();
  const mockTimePickerTimeDefaults = { from: 'now-15m', to: 'now' };
  const mockTimePickerSharedState = { from: null, to: null };

  beforeEach(() => {
    vi.clearAllMocks();

    (useHistory as Mock).mockReturnValue({
      replace: mockReplace,
      location: { pathname: '/flamegraphs/flamegraph' },
    });

    (useLocation as Mock).mockReturnValue({
      search: '',
      pathname: '/flamegraphs/flamegraph',
    });

    (useProfilingDependencies as Mock).mockReturnValue({
      start: {
        core: {
          uiSettings: {
            get: vi.fn(() => mockTimePickerTimeDefaults),
          },
        },
        data: {
          query: {
            timefilter: {
              timefilter: {
                getTime: vi.fn(() => mockTimePickerSharedState),
              },
            },
          },
        },
      },
    });
  });

  it('should return isDateRangeSet=true when date range is valid', () => {
    (useLocation as Mock).mockReturnValue({
      search: qs.stringify({
        rangeFrom: '2023-04-18T00:00:00.000Z',
        rangeTo: '2023-04-18T00:05:00.000Z',
      }),
      pathname: '/flamegraphs/flamegraph',
    });

    const { isDateRangeSet } = useDateRangeRedirect();

    expect(isDateRangeSet).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should return isDateRangeSet=false when from date is greater than to date', () => {
    (useLocation as Mock).mockReturnValue({
      search: qs.stringify({
        rangeFrom: '2023-04-18T00:05:00.000Z',
        rangeTo: '2023-04-18T00:00:00.000Z',
      }),
      pathname: '/flamegraphs/flamegraph',
    });

    const { isDateRangeSet, redirect } = useDateRangeRedirect();

    expect(isDateRangeSet).toBe(false);
    redirect();
    expect(mockReplace).toHaveBeenCalled();

    const callArgs = mockReplace.mock.calls[0][0];
    const parsedSearch = qs.parse(callArgs.search);
    expect(parsedSearch.rangeFrom).toBe('now-15m');
    expect(parsedSearch.rangeTo).toBe('now');
  });

  it('should return isDateRangeSet as falsy when date range is not set', () => {
    (useLocation as Mock).mockReturnValue({
      search: qs.stringify({}),
      pathname: '/flamegraphs/flamegraph',
    });

    const { isDateRangeSet } = useDateRangeRedirect();

    expect(!isDateRangeSet).toBe(true);
  });

  it('should return skipDataRangeSet=true when pathname is add-data-instructions', () => {
    (useLocation as Mock).mockReturnValue({
      search: '',
      pathname: '/add-data-instructions',
    });

    (useHistory as Mock).mockReturnValue({
      replace: mockReplace,
      location: { pathname: '/add-data-instructions' },
    });

    const { skipDataRangeSet } = useDateRangeRedirect();

    expect(skipDataRangeSet).toBe(true);
  });

  it('should preserve other query parameters when redirecting', () => {
    (useLocation as Mock).mockReturnValue({
      search: qs.stringify({
        rangeFrom: '2023-04-18T00:05:00.000Z',
        rangeTo: '2023-04-18T00:00:00.000Z',
        kuery: 'host.id: "123"',
        searchText: 'test',
      }),
      pathname: '/flamegraphs/flamegraph',
    });

    const { redirect } = useDateRangeRedirect();

    redirect();
    expect(mockReplace).toHaveBeenCalled();

    const callArgs = mockReplace.mock.calls[0][0];
    const parsedSearch = qs.parse(callArgs.search);
    expect(parsedSearch.rangeFrom).toBe('now-15m');
    expect(parsedSearch.rangeTo).toBe('now');
    expect(parsedSearch.kuery).toBe('host.id: "123"');
    expect(parsedSearch.searchText).toBe('test');
  });

  it('should use timePickerSharedState when available', () => {
    const mockSharedState = { from: 'now-30m', to: 'now-10m' };
    (useProfilingDependencies as Mock).mockReturnValue({
      start: {
        core: {
          uiSettings: {
            get: vi.fn(() => mockTimePickerTimeDefaults),
          },
        },
        data: {
          query: {
            timefilter: {
              timefilter: {
                getTime: vi.fn(() => mockSharedState),
              },
            },
          },
        },
      },
    });

    (useLocation as Mock).mockReturnValue({
      search: qs.stringify({
        rangeFrom: '2023-04-18T00:05:00.000Z',
        rangeTo: '2023-04-18T00:00:00.000Z',
      }),
      pathname: '/flamegraphs/flamegraph',
    });

    const { redirect } = useDateRangeRedirect();

    redirect();

    const callArgs = mockReplace.mock.calls[0][0];
    const parsedSearch = qs.parse(callArgs.search);
    expect(parsedSearch.rangeFrom).toBe('now-30m');
    expect(parsedSearch.rangeTo).toBe('now-10m');
  });
});
