/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { useTimeRangeParam } from './use_time_range_param';

const makeWrapper = (initialSearch = '') => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, { initialEntries: [`/${initialSearch}`] }, children);
  return { wrapper };
};

describe('useTimeRangeParam', () => {
  it('returns the default when the URL has no eaTimeRange param', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useTimeRangeParam(), { wrapper });
    expect(result.current[0]).toBe('30d');
  });

  it('reads a valid time range from the URL', () => {
    const { wrapper } = makeWrapper('?eaTimeRange=7d');
    const { result } = renderHook(() => useTimeRangeParam(), { wrapper });
    expect(result.current[0]).toBe('7d');
  });

  it('falls back to the default for an invalid value', () => {
    const { wrapper } = makeWrapper('?eaTimeRange=bogus');
    const { result } = renderHook(() => useTimeRangeParam(), { wrapper });
    expect(result.current[0]).toBe('30d');
  });

  it('rewrites the URL to the default on mount when the param is missing', () => {
    const { wrapper } = makeWrapper('?other=keep');
    const { result } = renderHook(() => useTimeRangeParam(), { wrapper });
    expect(result.current[0]).toBe('30d');
  });

  it('rewrites the URL to the default on mount when the param has an invalid value', () => {
    const { wrapper } = makeWrapper('?eaTimeRange=bogus&other=keep');
    const { result } = renderHook(() => useTimeRangeParam(), { wrapper });
    expect(result.current[0]).toBe('30d');
  });

  it('preserves unrelated URL params when setting a new time range', () => {
    const { wrapper } = makeWrapper('?eaTimeRange=24h&other=keep');
    const { result } = renderHook(() => useTimeRangeParam(), { wrapper });

    act(() => {
      result.current[1]('7d');
    });

    expect(result.current[0]).toBe('7d');
  });

  it('setter updates the returned time range', () => {
    const { wrapper } = makeWrapper('?eaTimeRange=24h');
    const { result } = renderHook(() => useTimeRangeParam(), { wrapper });

    act(() => {
      result.current[1]('7d');
    });

    expect(result.current[0]).toBe('7d');
  });

  it('rewrites the URL when the param becomes invalid after a same-route navigation', () => {
    const history = createMemoryHistory({ initialEntries: ['/?eaTimeRange=7d'] });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Router, { history }, children);

    const { result } = renderHook(() => useTimeRangeParam(), { wrapper });
    expect(result.current[0]).toBe('7d');

    act(() => {
      history.replace('/?other=keep');
    });

    expect(result.current[0]).toBe('30d');
    expect(history.location.search).toContain('eaTimeRange=30d');
  });
});
