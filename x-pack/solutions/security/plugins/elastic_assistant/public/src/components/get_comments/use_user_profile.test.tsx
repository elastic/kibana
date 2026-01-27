/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useUserProfile } from './use_user_profile';

// Mock dependencies
const mockBulkGet = jest.fn();
const mockUserProfileService = { bulkGet: mockBulkGet };
const mockUseKibana = jest
  .fn()
  .mockReturnValue({ services: { userProfile: mockUserProfileService } });

jest.mock('../../context/typed_kibana_context/typed_kibana_context', () => ({
  useKibana: () => mockUseKibana(),
}));

describe('useUserProfile', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Does not fetch if no user id is provided', async () => {
    const { result } = renderHook(() => useUserProfile({}), { wrapper });
    await waitFor(() => {
      // TODO uncomment this assertion after tanstack upgrade (5.85.5)
      expect(result.current).toEqual(
        expect.objectContaining({
          fetchStatus: 'idle',
          isError: false,
          isFetched: false,
          isFetchedAfterMount: false,
        })
      );
    });
  });

  it('fetches and returns user profile with avatar', async () => {
    mockBulkGet.mockResolvedValueOnce([
      {
        data: { avatar: { imageUrl: 'avatar-url' } },
        user: { id: '123' },
      },
    ]);
    const { result } = renderHook(() => useUserProfile({ user: { id: '123' } }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toEqual(true));
    await waitFor(() => {
      // TODO uncomment this assertion after tanstack upgrade (5.85.5)
      // expect(result.current.isEnabled).toEqual(true);
      expect(result.current.isLoading).toEqual(false);
      expect(result.current.data).toEqual({
        data: { avatar: { imageUrl: 'avatar-url' } },
        user: { id: '123' },
        avatar: { imageUrl: 'avatar-url' },
      });
      expect(result.current.isFetched).toEqual(true);
      expect(result.current.fetchStatus).toEqual('idle');
    });
  });

  it('returns null if profile is not found', async () => {
    mockBulkGet.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useUserProfile({ user: { id: 'notfound' } }), {
      wrapper,
    });
    await waitFor(() => result.current.isSuccess);
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});
