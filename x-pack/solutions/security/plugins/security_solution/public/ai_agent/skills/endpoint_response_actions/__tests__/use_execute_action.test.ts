/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useExecuteAction } from '../use_execute_action';

describe('useExecuteAction', () => {
  const mockExecuteAction = jest.fn();
  const mockPollActionStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('executes action and sets isExecuting', async () => {
    mockExecuteAction.mockResolvedValue({ actionId: 'action-1' });
    mockPollActionStatus.mockResolvedValue({
      actionId: 'action-1',
      status: 'completed',
      timestamp: new Date().toISOString(),
    });

    const { result } = renderHook(() => useExecuteAction(mockExecuteAction, mockPollActionStatus));

    expect(result.current.isExecuting).toBe(false);

    act(() => {
      result.current.execute('isolate', 'agent-1');
    });

    expect(result.current.isExecuting).toBe(true);

    await waitFor(() => expect(result.current.isExecuting).toBe(false));
    expect(result.current.result?.actionId).toBe('action-1');
    expect(result.current.result?.status).toBe('completed');
    expect(result.current.error).toBeNull();
  });

  it('handles execution errors', async () => {
    mockExecuteAction.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useExecuteAction(mockExecuteAction, mockPollActionStatus));

    act(() => {
      result.current.execute('isolate', 'agent-1');
    });

    await waitFor(() => expect(result.current.isExecuting).toBe(false));
    expect(result.current.error).toBe('Network error');
    expect(result.current.result?.status).toBe('failed');
  });

  it('polls until action completes', async () => {
    mockExecuteAction.mockResolvedValue({ actionId: 'action-2' });
    mockPollActionStatus
      .mockResolvedValueOnce({
        actionId: 'action-2',
        status: 'pending',
        timestamp: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        actionId: 'action-2',
        status: 'completed',
        timestamp: new Date().toISOString(),
      });

    const { result } = renderHook(() => useExecuteAction(mockExecuteAction, mockPollActionStatus));

    // Start execute without awaiting so we can advance timers in parallel
    act(() => {
      result.current.execute('isolate', 'agent-2');
    });

    // Wait for first pollActionStatus call (pending), then advance poll interval timer
    await waitFor(() => expect(mockPollActionStatus).toHaveBeenCalledTimes(1));

    // Advance the POLL_INTERVAL_MS timer to trigger the second poll
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000);
    });

    await waitFor(() => expect(result.current.isExecuting).toBe(false));

    expect(mockPollActionStatus).toHaveBeenCalledTimes(2);
    expect(result.current.result?.status).toBe('completed');
  });

  it('times out after max poll duration', async () => {
    mockExecuteAction.mockResolvedValue({ actionId: 'action-3' });
    mockPollActionStatus.mockResolvedValue({
      actionId: 'action-3',
      status: 'pending',
      timestamp: new Date().toISOString(),
    });

    const { result } = renderHook(() => useExecuteAction(mockExecuteAction, mockPollActionStatus));

    // Start execute without blocking
    act(() => {
      result.current.execute('isolate', 'agent-3');
    });

    // Wait for the first poll to fire, then fast-forward past the 30s timeout
    await waitFor(() => expect(mockPollActionStatus).toHaveBeenCalledTimes(1));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(35000);
    });

    await waitFor(() => expect(result.current.isExecuting).toBe(false));

    expect(result.current.result?.status).toBe('failed');
    expect(result.current.result?.errorMessage).toContain('timed out');
  });
});
