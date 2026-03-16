/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useRemoteClusters } from './use_remote_clusters';

const mockHttpGet = jest.fn();
const mockHttp = { get: mockHttpGet };

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { http: mockHttp },
  }),
}));

describe('useRemoteClusters', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockHttpGet.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const flushPromises = async () => {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
  };

  it('returns initial state before fetch completes', () => {
    mockHttpGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRemoteClusters());

    expect(result.current.clusters).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('fetches from /api/remote_clusters', async () => {
    mockHttpGet.mockResolvedValue([]);

    renderHook(() => useRemoteClusters());
    await flushPromises();

    expect(mockHttpGet).toHaveBeenCalledTimes(1);
    expect(mockHttpGet).toHaveBeenCalledWith('/api/remote_clusters');
  });

  it('maps clusters and defaults isConnected to false when undefined', async () => {
    mockHttpGet.mockResolvedValue([
      { name: 'cluster-a', isConnected: true, mode: 'sniff' },
      { name: 'cluster-b' },
      { name: 'cluster-c', isConnected: false },
    ]);

    const { result } = renderHook(() => useRemoteClusters());
    await flushPromises();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.clusters).toEqual([
      { label: 'cluster-a', isConnected: true },
      { label: 'cluster-b', isConnected: false },
      { label: 'cluster-c', isConnected: false },
    ]);
  });

  it('sets error message from Error instance and clears clusters', async () => {
    mockHttpGet.mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useRemoteClusters());
    await flushPromises();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Unauthorized');
    expect(result.current.clusters).toEqual([]);
  });

  it('uses fallback message for non-Error values', async () => {
    mockHttpGet.mockRejectedValue('something went wrong');

    const { result } = renderHook(() => useRemoteClusters());
    await flushPromises();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Failed to fetch remote clusters');
    expect(result.current.clusters).toEqual([]);
  });
});
