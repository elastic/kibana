/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useResolutionGroup, RESOLUTION_GROUP_ROUTE } from './use_resolution_group';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));

const mockFetch = jest.fn();
(useKibana as jest.Mock).mockReturnValue({ services: { http: { fetch: mockFetch } } });

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
};

describe('useResolutionGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { http: { fetch: mockFetch } } });
  });

  it('fetches resolution group with correct params', async () => {
    const mockGroup = {
      target: { 'entity.id': 'target-1' },
      aliases: [{ 'entity.id': 'alias-1' }],
      group_size: 2,
    };
    mockFetch.mockResolvedValueOnce(mockGroup);

    const { result } = renderHook(() => useResolutionGroup('target-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(RESOLUTION_GROUP_ROUTE, {
        version: '2023-10-31',
        method: 'GET',
        query: { entity_id: 'target-1' },
      });
      expect(result.current.data).toEqual(mockGroup);
    });
  });

  it('does not fetch when entityId is empty', () => {
    renderHook(() => useResolutionGroup(''), {
      wrapper: createWrapper(),
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not fetch when enabled is false', () => {
    renderHook(() => useResolutionGroup('target-1', { enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns error on failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useResolutionGroup('target-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
