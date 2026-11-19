/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import type {
  AnalyticsEventsOverTime,
  AnalyticsEventsOverTimeSource,
} from '../../../common/analytics';
import { useKibana } from '../../hooks/use_kibana';
import { REFRESH_INTERVAL_MS } from './use_analytics_cluster_state';
import { useEventsOverTime } from './use_events_over_time';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const CLICKS: AnalyticsEventsOverTimeSource[] = [{ name: 'clicks', timeField: '@timestamp' }];
const ORDERS: AnalyticsEventsOverTimeSource[] = [{ name: 'orders', timeField: 'order_date' }];

const createEvents = (total: number): AnalyticsEventsOverTime => ({
  from: 0,
  to: 60_000,
  intervalMs: 60_000,
  total,
  buckets: [{ timestamp: 0, count: total }],
});

describe('useEventsOverTime', () => {
  const setup = (initialSources: AnalyticsEventsOverTimeSource[]) => {
    const { http } = coreMock.createStart();
    const reportUiCounter = jest.fn();
    mockUseKibana.mockReturnValue({ services: { http, usageCollection: { reportUiCounter } } });
    const queryClient = new QueryClient({
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return {
      http,
      reportUiCounter,
      render: () =>
        renderHook(({ sources }) => useEventsOverTime(sources), {
          wrapper,
          initialProps: { sources: initialSources },
        }),
    };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('posts the sources and returns the counts', async () => {
    const { http, render } = setup(CLICKS);
    http.post.mockResolvedValue(createEvents(3));

    const { result } = render();
    expect(result.current).toMatchObject({ data: undefined, isLoading: true, hasFailed: false });

    await waitFor(() => expect(result.current.data).toEqual(createEvents(3)));
    expect(result.current).toMatchObject({ isLoading: false, hasFailed: false });
    expect(http.post).toHaveBeenCalledWith(
      '/internal/search_homepage/analytics/events_over_time',
      expect.objectContaining({ body: JSON.stringify({ sources: CLICKS }) })
    );
  });

  it('requests nothing without sources', () => {
    const { http, render } = setup([]);

    const { result } = render();

    expect(http.post).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ data: undefined, isLoading: false, hasFailed: false });
  });

  it('keeps the earlier counts while other sources load', async () => {
    const { http, render } = setup(CLICKS);
    http.post.mockResolvedValueOnce(createEvents(3));
    const { result, rerender } = render();
    await waitFor(() => expect(result.current.data?.total).toBe(3));

    http.post.mockResolvedValueOnce(createEvents(8));
    rerender({ sources: ORDERS });

    expect(result.current).toMatchObject({ data: createEvents(3), isLoading: false });
    await waitFor(() => expect(result.current.data?.total).toBe(8));
  });

  it('refreshes on the same interval as the cluster state', async () => {
    const { http, render } = setup(CLICKS);
    http.post.mockResolvedValue(createEvents(3));
    const { result } = render();
    await waitFor(() => expect(result.current.data?.total).toBe(3));

    http.post.mockResolvedValue(createEvents(5));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
    });

    await waitFor(() => expect(result.current.data?.total).toBe(5));
  });

  it('reports a failed load to usage telemetry and says there is nothing to show', async () => {
    const { http, reportUiCounter, render } = setup(CLICKS);
    http.post.mockRejectedValue(new Error('boom'));

    const { result } = render();

    await waitFor(() => expect(result.current.hasFailed).toBe(true));
    expect(result.current).toMatchObject({ data: undefined, isLoading: false });
    expect(reportUiCounter).toHaveBeenCalledWith(
      'searchHomepage',
      'count',
      'searchHomepageAnalytics_events_over_time_load_failed'
    );
  });

  it('keeps the counts when a refresh fails', async () => {
    const { http, reportUiCounter, render } = setup(CLICKS);
    http.post.mockResolvedValueOnce(createEvents(3));
    const { result } = render();
    await waitFor(() => expect(result.current.data?.total).toBe(3));

    http.post.mockRejectedValue(new Error('boom'));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
    });

    await waitFor(() => expect(reportUiCounter).toHaveBeenCalledTimes(1));
    expect(result.current).toMatchObject({ data: createEvents(3), hasFailed: false });
  });

  it('reports a render failure on request', () => {
    const { reportUiCounter, render } = setup([]);

    const { result } = render();
    result.current.reportFailure('render');

    expect(reportUiCounter).toHaveBeenCalledWith(
      'searchHomepage',
      'count',
      'searchHomepageAnalytics_events_over_time_render_failed'
    );
  });
});
