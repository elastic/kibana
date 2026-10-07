/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@kbn/react-query';
import type { SignificantEventsMaintenanceSummary } from '@kbn/significant-events-plugin/common';
import { useKibana } from './use_kibana';
import { useSignificantEventsMaintenanceActions } from './use_significant_events_maintenance';

jest.mock('./use_kibana');

const fetch = jest.fn();
const addSuccess = jest.fn();
const addWarning = jest.fn();
const addError = jest.fn();

const summary: SignificantEventsMaintenanceSummary = {
  state: 'enabled',
  executionsCancelled: 0,
  workflowsDisabled: 0,
  rulesDisabled: 0,
  deleted: {
    knowledgeIndicators: 2,
    storedQueries: 3,
    rules: 4,
    investigations: 5,
    dataStreams: 3,
  },
  partialFailures: [],
};

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () => ({
      activity: useSignificantEventsMaintenanceActions(),
      reset: useSignificantEventsMaintenanceActions(),
    }),
    { wrapper }
  );
  return { ...hook, wrapper, queryClient, invalidateQueries };
};

describe('Significant Events maintenance actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useKibana).mockReturnValue({
      core: { notifications: { toasts: { addSuccess, addWarning, addError } } },
      dependencies: {
        start: { significantEvents: { significantEventsRepositoryClient: { fetch } } },
      },
    } as never);
  });

  it('reports deletion counts and refreshes active queries without a query-key allowlist', async () => {
    fetch.mockResolvedValueOnce(summary);
    const { result, invalidateQueries, queryClient, wrapper } = setup();
    queryClient.setQueryData(['features'], ['inactive']);
    const queryFn = jest.fn().mockResolvedValue([]);
    const activeQuery = renderHook(
      () => useQuery({ queryKey: ['newResetDataFamily'], queryFn, staleTime: Infinity }),
      { wrapper }
    );
    await waitFor(() => expect(activeQuery.result.current.isSuccess).toBe(true));

    act(() => result.current.reset.reset());

    await waitFor(() => expect(addSuccess).toHaveBeenCalled());
    await waitFor(() => expect(result.current.reset.isMutating).toBe(false));
    expect(fetch).toHaveBeenCalledWith('POST /internal/significant_events/maintenance/_reset', {
      signal: null,
    });
    expect(addSuccess).toHaveBeenCalledWith({
      title: 'Reset Significant Events data',
      text: 'Deleted 2 knowledge indicators, 3 stored queries, 4 rules, and 5 investigations; wiped 3 data streams.',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ type: 'active' });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
    expect(queryClient.getQueryState(['features'])?.isInvalidated).toBe(false);
  });

  it('reports counts and partial failures as a warning', async () => {
    fetch.mockResolvedValueOnce({
      ...summary,
      partialFailures: [{ target: 'rule:1', error: 'failed' }],
    });
    const { result } = setup();

    act(() => result.current.reset.reset());

    await waitFor(() => expect(addWarning).toHaveBeenCalled());
    expect(addWarning).toHaveBeenCalledWith({
      title: 'Reset Significant Events data with warnings',
      text: expect.stringMatching(/2 knowledge indicators.*1 operation/),
    });
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('reports request errors and still refreshes maintenance status', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      fetch.mockRejectedValueOnce(new Error('reset failed'));
      const { result, invalidateQueries } = setup();

      act(() => result.current.reset.reset());

      await waitFor(() => expect(addError).toHaveBeenCalled());
      expect(addError).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Failed to reset Significant Events data',
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['significantEventsMaintenanceStatus'],
      });
      expect(addSuccess).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it.each(['pause', 'resume', 'reset'] as const)(
    'shares mutation locking between panels during %s',
    async (action) => {
      let resolveRequest: (value: SignificantEventsMaintenanceSummary) => void = () => {};
      fetch.mockReturnValueOnce(
        new Promise<SignificantEventsMaintenanceSummary>((resolve) => {
          resolveRequest = resolve;
        })
      );
      const { result } = setup();

      act(() => result.current.activity[action]());

      await waitFor(() => expect(result.current.activity.isMutating).toBe(true));
      expect(result.current.reset.isMutating).toBe(true);
      await act(async () => resolveRequest(summary));
      await waitFor(() => expect(result.current.activity.isMutating).toBe(false));
      expect(result.current.reset.isMutating).toBe(false);
    }
  );

  it.each(['pause', 'resume', 'reset'] as const)(
    'unlocks both panels after %s finishes even while active refetches are pending',
    async (action) => {
      let resolveRefetch: (data: string[]) => void = () => {};
      const pendingRefetch = new Promise<string[]>((resolve) => {
        resolveRefetch = resolve;
      });
      const statusQueryFn = jest
        .fn()
        .mockResolvedValueOnce(['before'])
        .mockReturnValue(pendingRefetch);
      const dataQueryFn = jest
        .fn()
        .mockResolvedValueOnce(['before'])
        .mockReturnValue(pendingRefetch);
      const { result, wrapper, queryClient } = setup();
      const queries = renderHook(
        () => ({
          status: useQuery({
            queryKey: ['significantEventsMaintenanceStatus'],
            queryFn: statusQueryFn,
            staleTime: Infinity,
          }),
          data: useQuery({
            queryKey: ['newResetDataFamily'],
            queryFn: dataQueryFn,
            staleTime: Infinity,
          }),
        }),
        { wrapper }
      );

      try {
        await waitFor(() => expect(queries.result.current.status.isSuccess).toBe(true));
        await waitFor(() => expect(queries.result.current.data.isSuccess).toBe(true));
        fetch.mockResolvedValueOnce(summary);

        act(() => result.current.activity[action]());

        await waitFor(() => expect(statusQueryFn).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(result.current.activity.isMutating).toBe(false));
        expect(result.current.reset.isMutating).toBe(false);
        expect(result.current.reset.isResetting).toBe(false);
        expect(queryClient.getQueryState(['significantEventsMaintenanceStatus'])?.fetchStatus).toBe(
          'fetching'
        );
        if (action === 'reset') {
          expect(dataQueryFn).toHaveBeenCalledTimes(2);
          expect(queryClient.getQueryState(['newResetDataFamily'])?.fetchStatus).toBe('fetching');
        }
      } finally {
        await act(async () => resolveRefetch(['after']));
        queries.unmount();
      }
    }
  );
});
