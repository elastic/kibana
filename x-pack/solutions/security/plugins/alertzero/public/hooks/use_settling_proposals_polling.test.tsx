/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { focusManager, QueryClient, QueryClientProvider, useQuery } from '@kbn/react-query';
import { PROPOSAL_SETTLING_POLL_INTERVAL_MS } from '@kbn/proposals-common';
import type { Proposal } from '@kbn/proposals-common';
import { RETRY_WAIT_MS, queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';
import { useSettlingProposalsPolling } from './use_settling_proposals_polling';

const createWrapper = () => {
  const queryClient = new QueryClient({
    logger: { log: () => null, warn: () => null, error: () => null },
  });
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, invalidate };
};

const proposal = (overrides: Partial<Proposal>) => overrides as Proposal;
const executing = proposal({ id: 'p-run', decision: 'approved', status: 'executing' });
const settled = proposal({
  id: 'p-done',
  decision: 'approved',
  status: 'failed',
  supersededBy: 'retry-1',
});
const awaitingRetry = proposal({ id: 'p-wait', decision: 'approved', status: 'failed' });
const pending = proposal({ id: 'p-pend', status: 'pending' });

const tick = async () => {
  await act(async () => {
    jest.advanceTimersByTime(PROPOSAL_SETTLING_POLL_INTERVAL_MS);
  });
};

beforeEach(() => jest.useFakeTimers());

afterEach(() => {
  focusManager.setFocused(undefined);
  jest.useRealTimers();
});

describe('useSettlingProposalsPolling', () => {
  it('refreshes the proposal queries every interval while one proposal is executing', async () => {
    const { Wrapper, invalidate } = createWrapper();
    renderHook(() => useSettlingProposalsPolling([pending, executing]), { wrapper: Wrapper });

    await tick();
    await tick();

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith(
      { queryKey: platformQueryKeys.proposals.all },
      { cancelRefetch: false }
    );
  });

  it('polls while a failed proposal has no new action (retry) yet, and stops once it has one', async () => {
    const { Wrapper, invalidate } = createWrapper();
    const { rerender } = renderHook(({ list }) => useSettlingProposalsPolling(list), {
      wrapper: Wrapper,
      initialProps: { list: [awaitingRetry] },
    });
    await tick();
    expect(invalidate).toHaveBeenCalledTimes(1);

    rerender({ list: [settled] });
    await tick();
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('stops waiting for a new action (retry) that never arrives', async () => {
    const { Wrapper, invalidate } = createWrapper();
    renderHook(() => useSettlingProposalsPolling([awaitingRetry]), { wrapper: Wrapper });

    await act(async () => {
      jest.advanceTimersByTime(RETRY_WAIT_MS + PROPOSAL_SETTLING_POLL_INTERVAL_MS);
    });
    const callsAtTheEnd = invalidate.mock.calls.length;
    expect(callsAtTheEnd).toBeGreaterThan(0);

    await act(async () => {
      jest.advanceTimersByTime(RETRY_WAIT_MS);
    });

    expect(invalidate).toHaveBeenCalledTimes(callsAtTheEnd);
  });

  it('does not poll when every proposal is pending or settled', async () => {
    const { Wrapper, invalidate } = createWrapper();
    renderHook(() => useSettlingProposalsPolling([pending, settled]), { wrapper: Wrapper });

    await tick();

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('stops when the last executing proposal settles', async () => {
    const { Wrapper, invalidate } = createWrapper();
    const { rerender } = renderHook(({ list }) => useSettlingProposalsPolling(list), {
      wrapper: Wrapper,
      initialProps: { list: [executing] },
    });
    await tick();
    expect(invalidate).toHaveBeenCalledTimes(1);

    rerender({ list: [settled] });
    await tick();

    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('does not restart a refetch that is still running', async () => {
    const queryClient = new QueryClient({
      logger: { log: () => null, warn: () => null, error: () => null },
    });
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    // The first fetch ends at once. Every later fetch stays open, like a slow refetch of many pages.
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce('ok')
      .mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(
      () => {
        useSettlingProposalsPolling([executing]);
        return useQuery({ queryKey: [...platformQueryKeys.proposals.all, 'slow'], queryFn });
      },
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await tick();
    await tick();
    await tick();

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('skips a refresh while the window has no focus', async () => {
    focusManager.setFocused(false);
    const { Wrapper, invalidate } = createWrapper();
    renderHook(() => useSettlingProposalsPolling([executing]), { wrapper: Wrapper });

    await tick();

    expect(invalidate).not.toHaveBeenCalled();
  });
});
