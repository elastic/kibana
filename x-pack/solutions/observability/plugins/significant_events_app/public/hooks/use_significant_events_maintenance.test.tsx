/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
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
  return { ...hook, queryClient, invalidateQueries };
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

  it('reports deletion counts and invalidates only active Significant Events query families', async () => {
    fetch.mockResolvedValueOnce(summary);
    const { result, invalidateQueries, queryClient } = setup();
    queryClient.setQueryData(['investigations'], ['unrelated']);
    queryClient.setQueryData(['connectors'], ['unrelated']);

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
    const dataKeys = [
      'significantEvents',
      'significantEventLifecycle',
      'detections',
      'detectionHistory',
      'features',
      'discoveryQueries',
      'discoveryQueriesOccurrences',
      'queryOccurrenceStats',
      'streamOnboardingStatus',
      'significant_events_discovery_status',
    ];
    for (const key of dataKeys) {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [key], type: 'active' });
    }
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['significantEventsMaintenanceStatus'],
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(dataKeys.length + 1);
    expect(queryClient.getQueryState(['investigations'])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(['connectors'])?.isInvalidated).toBe(false);
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
});
