/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useCurrentUser } from './use_current_user';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

describe('useCurrentUser', () => {
  const mockGetCurrentUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it('returns undefined initially while loading', () => {
    mockGetCurrentUser.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ username: 'test' }), 100))
    );

    mockUseKibana.mockReturnValue({
      services: {
        security: {
          authc: {
            getCurrentUser: mockGetCurrentUser,
          },
        },
      },
    });

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    expect(result.current).toBeUndefined();
  });

  it('returns user data after successful fetch', async () => {
    const mockUser = {
      username: 'test_user',
      full_name: 'Test User',
      email: 'test@example.com',
      roles: ['admin'],
    };

    mockGetCurrentUser.mockResolvedValue(mockUser);

    mockUseKibana.mockReturnValue({
      services: {
        security: {
          authc: {
            getCurrentUser: mockGetCurrentUser,
          },
        },
      },
    });

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => {
      expect(result.current).toEqual(mockUser);
    });

    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('handles null user response', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    mockUseKibana.mockReturnValue({
      services: {
        security: {
          authc: {
            getCurrentUser: mockGetCurrentUser,
          },
        },
      },
    });

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    // Wait for the query to complete
    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalled();
    });

    // React Query returns undefined when data is null/undefined
    expect(result.current).toBeUndefined();
  });
});
