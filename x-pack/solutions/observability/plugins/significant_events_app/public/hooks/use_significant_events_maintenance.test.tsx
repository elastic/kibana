/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { useSignificantEventsMaintenanceActions } from './use_significant_events_maintenance';

jest.mock('./use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const fetch = jest.fn();
const addSuccess = jest.fn();
const addWarning = jest.fn();
const addError = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { invalidateQueries, wrapper };
};

const resetSummary = (partialFailures: Array<{ target: string; error: string }> = []) => ({
  state: 'enabled' as const,
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
  partialFailures,
});

describe('useSignificantEventsMaintenanceActions reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      core: { notifications: { toasts: { addSuccess, addWarning, addError } } },
      dependencies: {
        start: { significantEvents: { significantEventsRepositoryClient: { fetch } } },
      },
    } as never);
  });

  it('shows deletion counts and invalidates only active Significant Events queries', async () => {
    fetch.mockResolvedValueOnce(resetSummary());
    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useSignificantEventsMaintenanceActions(), { wrapper });

    act(() => result.current.reset());

    await waitFor(() => expect(addSuccess).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith('POST /internal/significant_events/maintenance/_reset', {
      signal: null,
    });
    expect(addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('2 knowledge indicators'),
      })
    );
    for (const queryKey of [
      ['significantEvents'],
      ['detections'],
      ['features'],
      ['discoveryQueries'],
      ['significantEventLifecycle'],
    ]) {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey, type: 'active' });
    }
    expect(invalidateQueries).not.toHaveBeenCalledWith({ type: 'active' });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['significantEventsMaintenanceStatus'],
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(6);
  });

  it('uses warning feedback for partial reset failures', async () => {
    fetch.mockResolvedValueOnce(resetSummary([{ target: 'rule:1', error: 'failed' }]));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSignificantEventsMaintenanceActions(), { wrapper });

    act(() => result.current.reset());

    await waitFor(() => expect(addWarning).toHaveBeenCalled());
    expect(addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringMatching(/2 knowledge indicators.*1 operation/),
      })
    );
  });

  it('shows an error toast when reset fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    fetch.mockRejectedValueOnce(new Error('reset failed'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSignificantEventsMaintenanceActions(), { wrapper });

    act(() => result.current.reset());

    await waitFor(() => expect(addError).toHaveBeenCalled());
    consoleError.mockRestore();
  });
});
