/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { focusManager, QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useInfiniteQuery, useQuery } from '@kbn/react-query';
import { QUEUE_POLL_INTERVAL_MS, useQueuePolling } from './use_queue_polling';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => null, warn: () => null, error: () => null },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
};

const POLLED = [['queue', 'polled']] as const;

const tick = async () => {
  await act(async () => {
    jest.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS);
  });
};

beforeEach(() => jest.useFakeTimers());

afterEach(() => {
  focusManager.setFocused(undefined);
  jest.useRealTimers();
});

describe('useQueuePolling', () => {
  it('refetches the active queries under its keys once per interval', async () => {
    const queryFn = jest.fn().mockResolvedValue('ok');
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => {
        useQueuePolling(POLLED);
        return useQuery({ queryKey: ['queue', 'polled', 'a'], queryFn });
      },
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(1);

    await tick();
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
  });

  it('refreshes several queries in the same tick', async () => {
    const first = jest.fn().mockResolvedValue('ok');
    const second = jest.fn().mockResolvedValue('ok');
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => {
        useQueuePolling([
          ['queue', 'one'],
          ['queue', 'two'],
        ]);
        return [
          useQuery({ queryKey: ['queue', 'one'], queryFn: first }),
          useQuery({ queryKey: ['queue', 'two'], queryFn: second }),
        ];
      },
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.every(({ isSuccess }) => isSuccess)).toBe(true));

    await tick();

    await waitFor(() => {
      expect(first).toHaveBeenCalledTimes(2);
      expect(second).toHaveBeenCalledTimes(2);
    });
  });

  it('leaves queries outside its keys alone', async () => {
    const queryFn = jest.fn().mockResolvedValue('ok');
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => {
        useQueuePolling(POLLED);
        return useQuery({ queryKey: ['other', 'a'], queryFn });
      },
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await tick();

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('skips disabled queries, so a collapsed section never fetches its rows', async () => {
    const queryFn = jest.fn().mockResolvedValue('ok');
    const { Wrapper } = createWrapper();

    renderHook(
      () => {
        useQueuePolling(POLLED);
        return useQuery({ queryKey: ['queue', 'polled', 'a'], queryFn, enabled: false });
      },
      { wrapper: Wrapper }
    );

    await tick();

    expect(queryFn).not.toHaveBeenCalled();
  });

  it('refetches only the leading page, however many have been opened', async () => {
    const queryFn = jest.fn(async ({ pageParam = 0 }: { pageParam?: number }) => ({
      from: pageParam,
    }));
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(
      () => {
        useQueuePolling(POLLED);
        return useInfiniteQuery({
          queryKey: ['queue', 'polled', 'pages'],
          queryFn,
          getNextPageParam: (_last, pages) => pages.length * 10,
        });
      },
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(queryFn).toHaveBeenCalledTimes(2);

    await tick();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    expect(queryFn.mock.calls.map(([{ pageParam }]) => pageParam ?? 0)).toEqual([0, 10, 0]);
  });

  it('refetches every loaded page of the queries under its all-pages keys', async () => {
    const queryFn = jest.fn(async ({ pageParam = 0 }: { pageParam?: number }) => ({
      from: pageParam,
    }));
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(
      () => {
        useQueuePolling([], POLLED);
        return useInfiniteQuery({
          queryKey: ['queue', 'polled', 'pages'],
          queryFn,
          getNextPageParam: (_last, pages) => pages.length * 10,
        });
      },
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(queryFn).toHaveBeenCalledTimes(2);

    await tick();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    expect(queryFn.mock.calls.map(([{ pageParam }]) => pageParam ?? 0)).toEqual([0, 10, 0, 10]);
  });

  it('does nothing while the tab is hidden', async () => {
    const queryFn = jest.fn().mockResolvedValue('ok');
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => {
        useQueuePolling(POLLED);
        return useQuery({ queryKey: ['queue', 'polled', 'a'], queryFn });
      },
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    focusManager.setFocused(false);
    await tick();

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('stops polling once the page unmounts', async () => {
    const queryFn = jest.fn().mockResolvedValue('ok');
    const { Wrapper } = createWrapper();

    const { result, unmount } = renderHook(
      () => {
        useQueuePolling(POLLED);
        return useQuery({ queryKey: ['queue', 'polled', 'a'], queryFn });
      },
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    unmount();
    await tick();

    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
