/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
  DEFAULT_INVESTIGATIONS_TIME_RANGE,
  getInvestigationsTimeRange,
  toUpdatedWindow,
  useInvestigationsTimeRange,
} from './use_investigations_time_range';

const NOW = new Date('2026-11-09T12:00:30.000Z');

describe('getInvestigationsTimeRange', () => {
  it('defaults to the last 3 days', () => {
    expect(getInvestigationsTimeRange('')).toEqual({ from: 'now-3d', to: 'now' });
    expect(DEFAULT_INVESTIGATIONS_TIME_RANGE).toEqual({ from: 'now-3d', to: 'now' });
  });

  it('reads the range from the URL', () => {
    expect(getInvestigationsTimeRange('?rangeFrom=now-7d&rangeTo=now-1d')).toEqual({
      from: 'now-7d',
      to: 'now-1d',
    });
  });

  it('falls back to the default for an invalid range', () => {
    expect(getInvestigationsTimeRange('?rangeFrom=nonsense&rangeTo=now')).toEqual(
      DEFAULT_INVESTIGATIONS_TIME_RANGE
    );
  });
});

describe('toUpdatedWindow', () => {
  it('sends only a lower bound, to the minute, when the range ends at now', () => {
    expect(toUpdatedWindow({ from: 'now-3d', to: 'now' }, NOW)).toEqual({
      updatedAfter: '2026-11-06T12:00:00.000Z',
      updatedBefore: undefined,
    });
  });

  it('sends both bounds for a range that ended in the past', () => {
    expect(toUpdatedWindow({ from: 'now-7d', to: 'now-1d' }, NOW)).toEqual({
      updatedAfter: '2026-11-02T12:00:00.000Z',
      updatedBefore: '2026-11-08T12:00:00.000Z',
    });
  });
});

describe('useInvestigationsTimeRange', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );

  it('writes a chosen range to the URL', () => {
    const { result } = renderHook(
      () => ({ range: useInvestigationsTimeRange(), location: useLocation() }),
      { wrapper }
    );
    expect(result.current.range.timeRange).toEqual({ from: 'now-3d', to: 'now' });

    act(() => result.current.range.setTimeRange({ from: 'now-7d', to: 'now' }));

    expect(result.current.location.search).toBe('?rangeFrom=now-7d&rangeTo=now');
    expect(result.current.range.timeRange).toEqual({ from: 'now-7d', to: 'now' });
  });

  it('re-resolves a relative range to the current time on refresh', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-09T12:00:30.000Z'));
    try {
      const { result } = renderHook(() => useInvestigationsTimeRange(), { wrapper });
      expect(result.current.updatedWindow.updatedAfter).toBe('2026-11-06T12:00:00.000Z');

      jest.setSystemTime(new Date('2026-11-09T12:05:30.000Z'));
      act(() => result.current.refreshWindow());

      expect(result.current.updatedWindow.updatedAfter).toBe('2026-11-06T12:05:00.000Z');
    } finally {
      jest.useRealTimers();
    }
  });
});
