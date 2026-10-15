/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import type { MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';
import { act, renderHook } from '@testing-library/react';
import { toTimeRangeSearch, useTimeRange } from './use_time_range';
import { useKibanaServices } from './use_kibana_services';

jest.mock('./use_kibana_services');

const setTime = jest.fn();

const renderUseTimeRange = (history: MemoryHistory) =>
  renderHook(() => useTimeRange(), {
    wrapper: ({ children }) => <Router history={history}>{children}</Router>,
  });

describe('useTimeRange', () => {
  beforeEach(() => {
    setTime.mockClear();
    jest.mocked(useKibanaServices).mockReturnValue({
      data: {
        query: {
          timefilter: { timefilter: { getTime: () => ({ from: 'now-15m', to: 'now' }), setTime } },
        },
      },
    } as unknown as ReturnType<typeof useKibanaServices>);
  });

  it('reads the time range from the URL and mirrors it into the timefilter', () => {
    const history = createMemoryHistory({
      initialEntries: ['/my-app?rangeFrom=2020-05-18&rangeTo=2021-10-30'],
    });

    const { result } = renderUseTimeRange(history);

    expect(result.current.timeRange).toEqual({ rangeFrom: '2020-05-18', rangeTo: '2021-10-30' });
    expect(setTime).toHaveBeenCalledWith({ from: '2020-05-18', to: '2021-10-30' });
  });

  it('falls back to the timefilter and writes it to the URL when the URL has no range', () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    const { result } = renderUseTimeRange(history);

    expect(result.current.timeRange).toEqual({ rangeFrom: 'now-15m', rangeTo: 'now' });
    expect(history.location.search).toBe('?rangeFrom=now-15m&rangeTo=now');
  });

  it('pushes a new time range to the URL, keeping other params', () => {
    const history = createMemoryHistory({
      initialEntries: ['/my-app?foo=bar&rangeFrom=now-15m&rangeTo=now'],
    });
    const { result } = renderUseTimeRange(history);

    act(() => result.current.setTimeRange({ rangeFrom: 'now-7d', rangeTo: 'now' }));

    expect(history.location.pathname).toBe('/my-app');
    expect(history.location.search).toBe('?foo=bar&rangeFrom=now-7d&rangeTo=now');
    expect(result.current.timeRange).toEqual({ rangeFrom: 'now-7d', rangeTo: 'now' });
  });
});

describe('toTimeRangeSearch', () => {
  it('builds a search string with the time range', () => {
    expect(toTimeRangeSearch({ rangeFrom: 'now-7d', rangeTo: 'now' })).toBe(
      '?rangeFrom=now-7d&rangeTo=now'
    );
  });
});
