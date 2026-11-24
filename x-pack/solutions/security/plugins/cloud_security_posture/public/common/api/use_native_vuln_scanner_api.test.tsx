/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useNativeVulnScannerAvailability } from './use_native_vuln_scanner_api';

const mockGet = jest.fn();

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { http: { get: mockGet } } }),
}));

const renderAvailability = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useNativeVulnScannerAvailability(), { wrapper });
};

describe('useNativeVulnScannerAvailability', () => {
  beforeEach(() => mockGet.mockReset());

  it('is available when the status route answers', async () => {
    mockGet.mockResolvedValue({});
    const { result } = renderAvailability();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it('is unavailable when the routes are absent (404)', async () => {
    mockGet.mockRejectedValue({ response: { status: 404 } });
    const { result } = renderAvailability();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it.each([500, 401, undefined])(
    'does not cache a transient failure (%s) as "not available"',
    async (status) => {
      mockGet.mockRejectedValue(status ? { response: { status } } : new Error('network'));
      const { result } = renderAvailability();

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.data).toBeUndefined();
    }
  );
});
