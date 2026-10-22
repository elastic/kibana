/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { ClassicRumTimeRange } from './types';
import { useEmbeddedHistory } from './use_embedded_history';

const getParams = (search: string) => Object.fromEntries(new URLSearchParams(search));

interface Props {
  serviceName: string;
  timeRange?: ClassicRumTimeRange;
  onTimeRangeChange?: (timeRange: ClassicRumTimeRange) => void;
}

const renderUseEmbeddedHistory = (initialProps: Props) =>
  renderHook((props: Props) => useEmbeddedHistory(props), { initialProps });

describe('useEmbeddedHistory', () => {
  const timeRange = { rangeFrom: '2020-05-18', rangeTo: '2021-10-30' };

  it('pins the service name and seeds the host time range', () => {
    const { result } = renderUseEmbeddedHistory({ serviceName: 'my-app', timeRange });

    expect(getParams(result.current.location.search)).toEqual({
      serviceName: 'my-app',
      ...timeRange,
    });
  });

  it('applies a new host time range in place, keeping the same history', () => {
    const { result, rerender } = renderUseEmbeddedHistory({ serviceName: 'my-app', timeRange });
    const history = result.current;

    rerender({ serviceName: 'my-app', timeRange: { rangeFrom: 'now-7d', rangeTo: 'now' } });

    expect(result.current).toBe(history);
    expect(getParams(history.location.search)).toEqual({
      serviceName: 'my-app',
      rangeFrom: 'now-7d',
      rangeTo: 'now',
    });
  });

  it('reports time range changes made inside the dashboard to the host', () => {
    const onTimeRangeChange = jest.fn();
    const { result } = renderUseEmbeddedHistory({
      serviceName: 'my-app',
      timeRange,
      onTimeRangeChange,
    });

    act(() => result.current.push('/?serviceName=my-app&rangeFrom=now-1h&rangeTo=now'));

    expect(onTimeRangeChange).toHaveBeenCalledWith({ rangeFrom: 'now-1h', rangeTo: 'now' });
  });

  it('does not report changes that only echo the host time range', () => {
    const onTimeRangeChange = jest.fn();
    const { result } = renderUseEmbeddedHistory({
      serviceName: 'my-app',
      timeRange,
      onTimeRangeChange,
    });

    act(() =>
      result.current.push(
        `/?serviceName=my-app&rangeFrom=${timeRange.rangeFrom}&rangeTo=${timeRange.rangeTo}&percentile=75`
      )
    );

    expect(onTimeRangeChange).not.toHaveBeenCalled();
  });

  it('recreates the history when the service name changes', () => {
    const { result, rerender } = renderUseEmbeddedHistory({ serviceName: 'my-app', timeRange });
    const history = result.current;

    rerender({ serviceName: 'other-app', timeRange });

    expect(result.current).not.toBe(history);
    expect(getParams(result.current.location.search).serviceName).toBe('other-app');
  });
});
