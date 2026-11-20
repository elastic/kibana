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
import { useKibana } from '../../hooks/use_kibana';
import type { AnalyticsClusterState } from '../types';
import {
  NO_DATA_POLL_INTERVAL_MS,
  REFRESH_INTERVAL_MS,
  useAnalyticsClusterState,
} from './use_analytics_cluster_state';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const NO_DATA: AnalyticsClusterState = {
  stage: 'noData',
  journey: null,
  sources: [],
  totalSources: 0,
  documentsCount: 0,
  dashboardsCount: 0,
  recentDashboards: [],
};

const HAS_DATA: AnalyticsClusterState = {
  ...NO_DATA,
  stage: 'hasData',
  journey: 'analytics',
  totalSources: 1,
  documentsCount: 12,
  sources: [
    {
      name: 'app-events',
      kind: 'dataStream',
      dataKind: 'events',
      documentsCount: 12,
      timeField: '@timestamp',
      isSampleData: false,
    },
  ],
};

describe('useAnalyticsClusterState', () => {
  const setup = (options?: { poll?: boolean }) => {
    const { http } = coreMock.createStart();
    mockUseKibana.mockReturnValue({ services: { http } });
    const queryClient = new QueryClient({
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    return { http, render: () => renderHook(() => useAnalyticsClusterState(options), { wrapper }) };
  };

  const advancePollInterval = async (): Promise<void> => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(NO_DATA_POLL_INTERVAL_MS);
    });
  };

  const setVisibility = (state: 'visible' | 'hidden'): void => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('visibilitychange'));
    });
  };

  afterEach(() => {
    jest.useRealTimers();
    setVisibility('visible');
  });

  it('loads the cluster state from the internal route', async () => {
    const { http, render } = setup();
    http.get.mockResolvedValue(HAS_DATA);

    const { result } = render();

    expect(result.current).toMatchObject({ state: undefined, isLoading: true, isError: false });
    await waitFor(() => expect(result.current.state).toEqual(HAS_DATA));
    expect(result.current).toMatchObject({ isLoading: false, isError: false });
    expect(http.get).toHaveBeenCalledWith(
      '/internal/search_homepage/analytics/cluster_state',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('reports a failed request as an error without a state, and does not retry', async () => {
    const { http, render } = setup();
    http.get.mockRejectedValue(new Error('Forbidden'));

    const { result } = render();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current).toMatchObject({ state: undefined, isLoading: false, isFetching: false });
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('keeps the previous state when a later request fails', async () => {
    const { http, render } = setup();
    http.get.mockResolvedValueOnce(HAS_DATA).mockRejectedValueOnce(new Error('unavailable'));

    const { result } = render();
    await waitFor(() => expect(result.current.state).toEqual(HAS_DATA));
    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current).toMatchObject({ state: HAS_DATA, isLoading: false, isFetching: false });
  });

  it('stays in the error state, fetching, while a failed first request is retried', async () => {
    const { http, render } = setup();
    let resolveRetry: (state: AnalyticsClusterState) => void = () => {};
    http.get.mockRejectedValueOnce(new Error('unavailable')).mockReturnValueOnce(
      new Promise<AnalyticsClusterState>((resolve) => {
        resolveRetry = resolve;
      })
    );

    const { result } = render();
    await waitFor(() => expect(result.current.isError).toBe(true));
    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current).toMatchObject({ state: undefined, isLoading: false, isError: true });

    await act(async () => resolveRetry(HAS_DATA));
    await waitFor(() => expect(result.current.state).toEqual(HAS_DATA));
    expect(result.current).toMatchObject({ isError: false, isFetching: false });
  });

  it('keeps polling after a failed poll, still showing the last state', async () => {
    jest.useFakeTimers();
    const { http, render } = setup({ poll: true });
    http.get
      .mockResolvedValueOnce(NO_DATA)
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValue(HAS_DATA);

    const { result } = render();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    await advancePollInterval();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(result.current).toMatchObject({ state: NO_DATA, isError: true });
    expect(http.get).toHaveBeenCalledTimes(2);

    await advancePollInterval();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(result.current).toMatchObject({ state: HAS_DATA, isError: false });
  });

  it('refetches on demand', async () => {
    const { http, render } = setup();
    http.get.mockResolvedValueOnce(NO_DATA).mockResolvedValueOnce(HAS_DATA);

    const { result } = render();
    await waitFor(() => expect(result.current.state).toEqual(NO_DATA));
    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.state).toEqual(HAS_DATA));
  });

  it('refetches when the window regains focus', async () => {
    const { http, render } = setup();
    http.get.mockResolvedValue(HAS_DATA);

    const { result } = render();
    await waitFor(() => expect(result.current.state).toEqual(HAS_DATA));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
  });

  it('polls every ten seconds while there is no data, and every minute once data arrives', async () => {
    jest.useFakeTimers();
    const { http, render } = setup({ poll: true });
    http.get
      .mockResolvedValueOnce(NO_DATA)
      .mockResolvedValueOnce(NO_DATA)
      .mockResolvedValue(HAS_DATA);

    const { result } = render();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(result.current.state).toEqual(NO_DATA);
    expect(http.get).toHaveBeenCalledTimes(1);

    await advancePollInterval();
    expect(http.get).toHaveBeenCalledTimes(2);

    await advancePollInterval();
    expect(http.get).toHaveBeenCalledTimes(3);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(result.current.state).toEqual(HAS_DATA);

    await advancePollInterval();
    await advancePollInterval();
    expect(http.get).toHaveBeenCalledTimes(3);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
    });
    expect(http.get).toHaveBeenCalledTimes(4);
  });

  it('does not poll unless asked to', async () => {
    jest.useFakeTimers();
    const { http, render } = setup();
    http.get.mockResolvedValue(NO_DATA);

    render();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    await advancePollInterval();
    await advancePollInterval();

    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('pauses polling while the tab is hidden', async () => {
    jest.useFakeTimers();
    const { http, render } = setup({ poll: true });
    http.get.mockResolvedValue(NO_DATA);

    render();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(http.get).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    await advancePollInterval();
    await advancePollInterval();

    expect(http.get).toHaveBeenCalledTimes(1);
  });
});
