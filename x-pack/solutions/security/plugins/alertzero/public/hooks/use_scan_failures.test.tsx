/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SCAN_FAILURES_POLL_INTERVAL_MS, useScanFailures } from './use_scan_failures';

vi.mock('@kbn/kibana-react-plugin/public', () => {
  const mocked = { useKibana: vi.fn() };
  return { ...mocked, default: mocked };
});

const useKibanaMock = useKibana as MockedFunction<typeof useKibana>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useScanFailures', () => {
  const http = { get: vi.fn() };

  beforeEach(() => {
    http.get.mockReset();
    http.get.mockResolvedValue({ workers: [], unknown: false });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);
  });

  it('polls so a failure that finishes while the page is open shows up', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useScanFailures(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      vi.advanceTimersByTime(SCAN_FAILURES_POLL_INTERVAL_MS);

      await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
    } finally {
      vi.useRealTimers();
    }
  });
});
