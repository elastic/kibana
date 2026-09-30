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
import { SCAN_FAILURES_POLL_INTERVAL_MS, useScanFailures } from './use_scan_failures';

jest.mock('@kbn/kibana-react-plugin/public', () => ({ useKibana: jest.fn() }));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useScanFailures', () => {
  const http = { get: jest.fn() };

  beforeEach(() => {
    http.get.mockReset();
    http.get.mockResolvedValue({ workers: [], unknown: false });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);
  });

  it('polls so a failure that finishes while the page is open shows up', async () => {
    jest.useFakeTimers();
    try {
      const { result } = renderHook(() => useScanFailures(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      jest.advanceTimersByTime(SCAN_FAILURES_POLL_INTERVAL_MS);

      await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
    } finally {
      jest.useRealTimers();
    }
  });
});
