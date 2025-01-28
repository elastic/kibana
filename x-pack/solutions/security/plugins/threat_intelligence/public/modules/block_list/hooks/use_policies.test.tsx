/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: any }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const renderUseQuery = (result: { items: any[] }) =>
  renderHook(() => useQuery(['policies'], () => result), {
    wrapper: createWrapper(),
  });

describe('usePolicies', () => {
  it('should have undefined data during loading state', async () => {
    const mockPolicies = { items: [] };
    const { result } = renderUseQuery(mockPolicies);

    expect(result.current.isLoading).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });

  it('should return policies on success', async () => {
    const mockPolicies = {
      items: [
        {
          id: '123',
          name: 'MyPolicy',
        },
      ],
    };
    const { result } = renderUseQuery(mockPolicies);

    await waitFor(() => expect(result.current.isSuccess).toBeTruthy());

    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.data).toEqual(mockPolicies);
  });
});
