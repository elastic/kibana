/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';
import { MAX_QUEUE_REACH } from '../../common/proposals/list';
import {
  PROPOSALS_POLL_INTERVAL_MS,
  useClosedProposals,
  useClosedProposalsCount,
  useProposalsByCategory,
} from './use_proposals_api';

jest.mock('@kbn/kibana-react-plugin/public', () => ({ useKibana: jest.fn() }));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => null, warn: () => null, error: () => null },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const page = (rows: number, total: number) => ({
  proposals: Array.from({ length: rows }, (_, i) => ({ id: `prop-${i}` })),
  total,
});

let http: { get: jest.Mock };

beforeEach(() => {
  http = { get: jest.fn() };
  useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<typeof useKibana>);
});

const queryOf = (call: number) => http.get.mock.calls[call][1].query;

describe('useProposalsByCategory', () => {
  it('asks for the first page at the size the caller opened with', async () => {
    http.get.mockResolvedValue(page(10, 30));

    const { result } = renderHook(
      () => useProposalsByCategory('respond', { firstPageSize: 10, step: 10, enabled: true }),
      { wrapper: createWrapper().Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryOf(0)).toEqual({ from: 0, size: 10 });
  });

  it('steps later pages by the step size, from the rows already loaded', async () => {
    http.get.mockResolvedValue(page(10, 30));

    const { result } = renderHook(
      () => useProposalsByCategory('respond', { firstPageSize: 10, step: 10, enabled: true }),
      { wrapper: createWrapper().Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    void result.current.fetchNextPage();

    // Offset is the accumulated row count, which is what lets the first page be a
    // different size from the rest.
    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
    expect(queryOf(1)).toEqual({ from: 10, size: 10 });
  });

  it('stops offering pages once the bucket is exhausted', async () => {
    http.get.mockResolvedValue(page(10, 10));

    const { result } = renderHook(
      () => useProposalsByCategory('respond', { firstPageSize: 10, step: 10, enabled: true }),
      { wrapper: createWrapper().Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('shrinks the last page to land on the reach, rather than stopping short of it', async () => {
    const firstPageSize = MAX_QUEUE_REACH - 5;
    http.get
      .mockResolvedValueOnce(page(firstPageSize, 50_000))
      .mockResolvedValueOnce(page(5, 50_000));

    const { result } = renderHook(
      () => useProposalsByCategory('respond', { firstPageSize, step: 10, enabled: true }),
      { wrapper: createWrapper().Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Read off the resolved fetch rather than `result.current`: this harness renders
    // the hook alone, so the observer's update can land after the assertion does.
    const next = await result.current.fetchNextPage();

    // A full step would put `from + size` past the reach, which the route refuses.
    expect(queryOf(1)).toEqual({ from: firstPageSize, size: 5 });

    // The bucket holds 50k rows, so it is the reach that ends the paging.
    expect(next.hasNextPage).toBe(false);
  });

  it('issues no request while the section is collapsed', () => {
    renderHook(
      () => useProposalsByCategory('respond', { firstPageSize: 10, step: 10, enabled: false }),
      { wrapper: createWrapper().Wrapper }
    );

    expect(http.get).not.toHaveBeenCalled();
  });

  it('polls only the leading page, however many the analyst has opened', async () => {
    // Before the render, or the poll's interval is scheduled on the real clock.
    jest.useFakeTimers();
    http.get.mockResolvedValue(page(10, 30));
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(
      () => useProposalsByCategory('respond', { firstPageSize: 10, step: 10, enabled: true }),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await result.current.fetchNextPage();
    expect(http.get).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(PROPOSALS_POLL_INTERVAL_MS);

    // Settled, not merely started: a replay of the second page trails the first and
    // would slip past a check that stops at the request it expected.
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    // One request, not two: replaying every opened page would make each Show more
    // cost another request a minute, for as long as the page stays open.
    expect(http.get.mock.calls.map(([, options]) => options.query.from)).toEqual([0, 10, 0]);
    jest.useRealTimers();
  });

  it('polls, so a worker adding a proposal shows up without a reload', async () => {
    jest.useFakeTimers();
    http.get.mockResolvedValue(page(10, 30));

    const { result } = renderHook(
      () => useProposalsByCategory('respond', { firstPageSize: 10, step: 10, enabled: true }),
      { wrapper: createWrapper().Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    jest.advanceTimersByTime(PROPOSALS_POLL_INTERVAL_MS);

    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
    jest.useRealTimers();
  });
});

describe('useClosedProposals', () => {
  it('opens at its own larger first page', async () => {
    http.get.mockResolvedValue(page(25, 60));

    const { result } = renderHook(
      () => useClosedProposals({ firstPageSize: 25, step: 10, enabled: true }),
      { wrapper: createWrapper().Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryOf(0)).toEqual({ from: 0, size: 25 });
  });
});

describe('refreshing after a decision', () => {
  // Approving or dismissing invalidates the platform's proposals root. Every key
  // here hangs off that root, which is the only reason a decision refreshes the
  // queue at all — these pin that, and the open/collapsed asymmetry it buys.
  const decide = (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });

  it('refetches the queue the proposal was popped from', async () => {
    http.get.mockResolvedValue(page(10, 30));
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(
      () => useProposalsByCategory('respond', { firstPageSize: 10, step: 10, enabled: true }),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    void decide(queryClient);

    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
  });

  it('refetches the closed rows while that section is open', async () => {
    http.get.mockResolvedValue(page(25, 60));
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(
      () => useClosedProposals({ firstPageSize: 25, step: 10, enabled: true }),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    void decide(queryClient);

    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
  });

  it('leaves a collapsed closed section alone, and refreshes only its count', async () => {
    http.get.mockResolvedValue(page(0, 42));
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(
      () => ({
        count: useClosedProposalsCount(true),
        // Collapsed, so its rows query is disabled and therefore inactive.
        rows: useClosedProposals({ firstPageSize: 25, step: 10, enabled: false }),
      }),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.count.isSuccess).toBe(true));
    expect(http.get).toHaveBeenCalledTimes(1);

    void decide(queryClient);

    // Exactly one more request: the count. Invalidation refetches active queries
    // only, so the collapsed rows are marked stale and fetched when it opens.
    await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
    expect(queryOf(1)).toEqual({ from: 0, size: 0 });
    // Asserted over every call rather than the count, which a late rows request
    // would satisfy before arriving.
    expect(http.get.mock.calls.map(([, options]) => options.query.size)).toEqual([0, 0]);
  });
});

describe('useClosedProposalsCount', () => {
  it('reads the total without any rows', async () => {
    http.get.mockResolvedValue(page(0, 42));

    const { result } = renderHook(() => useClosedProposalsCount(true), {
      wrapper: createWrapper().Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryOf(0)).toEqual({ from: 0, size: 0 });
    expect(result.current.data?.total).toBe(42);
  });
});
