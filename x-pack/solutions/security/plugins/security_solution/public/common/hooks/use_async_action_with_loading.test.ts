/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useAsyncActionWithLoading } from './use_async_action_with_loading';

describe('useAsyncActionWithLoading', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets loading state before running the action', () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAsyncActionWithLoading(action));

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);
    expect(action).not.toHaveBeenCalled();
  });

  it('runs the action after the next paint and resets loading state', async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAsyncActionWithLoading(action));

    await act(async () => {
      const runPromise = result.current[1]();
      await jest.runAllTimersAsync();
      await runPromise;
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current[0]).toBe(false);
  });

  it('resets loading state when the action fails', async () => {
    const action = jest.fn().mockRejectedValue(new Error('failed'));
    const { result } = renderHook(() => useAsyncActionWithLoading(action));

    await act(async () => {
      const assertion = expect(result.current[1]()).rejects.toThrow('failed');
      await jest.runAllTimersAsync();
      await assertion;
    });

    expect(result.current[0]).toBe(false);
  });
});
